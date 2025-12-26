"""
missing_pets/utils.py - QR코드 및 포스터 생성 유틸리티 (한글 완전 지원)
app/missing_pets/ 폴더에 이 파일을 전체 교체하세요!
"""

import qrcode
from io import BytesIO
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings
import os
import requests


# 🔥 한글 폰트 등록 (여러 경로 시도)
FONT_REGISTERED = False
FONT_NORMAL = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'

def register_korean_fonts():
    """프로젝트 내부 폰트를 우선적으로 등록"""
    global FONT_REGISTERED, FONT_NORMAL, FONT_BOLD
    
    if FONT_REGISTERED:
        return
    
    # 현재 파일(utils.py) 위치 기준으로 fonts 폴더 경로 설정
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_font_path = os.path.join(current_dir, 'fonts', 'NanumGothicBold.ttf')

    # 시도할 폰트 경로 목록 (프로젝트 내부 경로를 0순위로 배치)
    font_paths = [
        project_font_path, # 👈 여기에 파일이 있으면 무조건 성공합니다.
        '/usr/share/fonts/truetype/nanum/NanumGothic.ttf', # 리눅스
        'C:/Windows/Fonts/malgun.ttf', # 윈도우
    ]
    
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                # 폰트 등록 이름을 'KoreanFont'로 통일
                pdfmetrics.registerFont(TTFont('KoreanFont', font_path))
                FONT_NORMAL = 'KoreanFont'
                FONT_BOLD = 'KoreanFont'
                FONT_REGISTERED = True
                print(f"✅ 한글 폰트 등록 성공: {font_path}")
                return
            except Exception as e:
                print(f"❌ 폰트 등록 실패 ({font_path}): {e}")
                continue
    
    print("⚠️ 경고: 한글 폰트를 찾지 못해 네모로 표시될 수 있습니다.")


def generate_qr_code(missing_pet):
    """
    QR코드 생성 및 저장
    
    Args:
        missing_pet: MissingPet 인스턴스
    
    Returns:
        str: QR코드 이미지 URL
    """
    base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    url = f"{base_url}/missing-pets/{missing_pet.id}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    filename = f'qr_codes/missing_pet_{missing_pet.id}.png'
    path = default_storage.save(filename, ContentFile(buffer.read()))
    
    qr_url = f'/media/{path}'
    
    return qr_url


def download_image(image_url):
    """URL에서 이미지 다운로드"""
    try:
        if image_url.startswith('/media/'):
            file_path = os.path.join(settings.MEDIA_ROOT, image_url.replace('/media/', ''))
            if os.path.exists(file_path):
                return Image.open(file_path)
        else:
            response = requests.get(image_url, timeout=5)
            response.raise_for_status()
            return Image.open(BytesIO(response.content))
    except Exception as e:
        print(f"이미지 다운로드 실패: {e}")
        return None


def draw_text_centered(c, text, y, font_name, font_size, color=(0, 0, 0)):
    """텍스트를 중앙 정렬로 그리기"""
    c.setFont(font_name, font_size)
    c.setFillColorRGB(*color)
    width, height = A4
    try:
        text_width = c.stringWidth(text, font_name, font_size)
        x = (width - text_width) / 2
        c.drawString(x, y, text)
    except:
        # 폰트 문제 시 좌측 정렬
        c.drawString(50, y, text)


def draw_text_left(c, text, x, y, font_name, font_size, color=(0, 0, 0)):
    """텍스트를 왼쪽 정렬로 그리기"""
    c.setFont(font_name, font_size)
    c.setFillColorRGB(*color)
    try:
        c.drawString(x, y, text)
    except:
        pass  # 폰트 문제 시 건너뛰기


def generate_poster_pdf(missing_pet):
    """
    정보 박스 위치 하향 조정 및 절취선 포함 완성본
    """
    register_korean_fonts()
    buffer = BytesIO()
    width, height = A4
    c = canvas.Canvas(buffer, pagesize=A4)
    
    # --- 1. 전체 배경 및 테두리 ---
    c.setStrokeColorRGB(0.9, 0.8, 0.7)
    c.setLineWidth(2)
    # 절취선 위까지만 테두리 (10mm ~ 55mm 영역)
    c.rect(10*mm, 55*mm, width-20*mm, height-65*mm) 

    # --- 2. 상단 타이틀 영역 (위치 고정) ---
    category_map = {'missing': '실종 신고', 'found': '발견 제보', 'rescue': '구조 제보'}
    title = category_map.get(missing_pet.category, '제보')
    
    draw_text_centered(c, title, height - 35*mm, FONT_BOLD, 48, (0.85, 0.3, 0.2))
    
    species_text = f"{missing_pet.get_species_display()} / {missing_pet.breed or '품종 모름'}"
    draw_text_centered(c, species_text, height - 52*mm, FONT_BOLD, 32, (0.2, 0.2, 0.2))
    
    if missing_pet.name:
        draw_text_centered(c, f"Name: {missing_pet.name}", height - 64*mm, FONT_NORMAL, 24, (0.3, 0.3, 0.3))

    # --- 3. 중앙 원형 이미지 영역 ---
    side = 95*mm
    img_center_y = height / 2 + 15*mm # 이미지 위치 살짝 위로 유지
    if missing_pet.images and len(missing_pet.images) > 0:
        img = download_image(missing_pet.images[0])
        if img:
            c.setFillColorRGB(0.8, 0.9, 0.88)
            c.circle(width/2, img_center_y, (side/2) + 5*mm, fill=1, stroke=0)
            
            c.saveState()
            path = c.beginPath()
            path.circle(width/2, img_center_y, side/2)
            c.clipPath(path, stroke=0)
            c.drawImage(ImageReader(img), (width-side)/2, img_center_y - side/2, width=side, height=side, preserveAspectRatio=True)
            c.restoreState()

    # --- 4. 하단 주황색 정보 박스 (★요청대로 아래로 내림) ---
    box_w, box_h = width - 30*mm, 48*mm
    box_x = 15*mm
    # box_y를 60 -> 58로 살짝 내리고 텍스트 밀도를 조정하여 절취선과 여백 확보
    box_y = 58*mm 
    
    c.setFillColorRGB(1.0, 0.9, 0.75) # 연한 주황/노랑 배경
    c.roundRect(box_x, box_y, box_w, box_h, 5*mm, fill=1, stroke=0)
    
    # 박스 내 텍스트 정렬
    tx = box_x + 8*mm
    ty = box_y + box_h - 14*mm
    
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.setFont(FONT_NORMAL, 15)
    c.drawString(tx, ty, f"발생일: {missing_pet.occurred_at.strftime('%Y-%m-%d')}")
    c.drawString(tx, ty - 9*mm, f"장소: {missing_pet.address or '정보 없음'}")
    
    c.setFillColorRGB(0.8, 0.3, 0.1)
    c.setFont(FONT_BOLD, 21)
    c.drawString(tx, ty - 22*mm, f"연락처: {missing_pet.contact}")
    
    # QR 코드 (박스 내부 우측 하단 배치)
    qr_url = generate_qr_code(missing_pet)
    qr_path = os.path.join(settings.MEDIA_ROOT, qr_url.replace('/media/', ''))
    if os.path.exists(qr_path):
        qr_s = 38*mm
        # QR 위치를 박스 우측에 맞춤
        c.drawImage(qr_path, width - 20*mm - qr_s, box_y + 5*mm, width=qr_s, height=qr_s)

    # --- 5. 하단 절취선 영역 (연락처 낱장) ---
    line_y = 48*mm # 절취선 시작 높이 (박스 바로 아래)
    c.setDash(3, 3) 
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    c.line(10*mm, line_y, width-10*mm, line_y) # 가로 절취선
    
    num_strips = 8
    strip_width = (width - 20*mm) / num_strips
    
    for i in range(1, num_strips):
        lx = 10*mm + (i * strip_width)
        c.line(lx, 5*mm, lx, line_y) # 세로 절취선
        
    c.setDash(1, 0)
    c.setFillColorRGB(0.3, 0.3, 0.3)
    for i in range(num_strips):
        sx = 10*mm + (i * strip_width) + (strip_width / 2)
        contact_text = f"{missing_pet.name or '제보'} {missing_pet.contact}"
        
        c.saveState()
        c.translate(sx + 2*mm, 25*mm) # 절취선 내부 텍스트 위치
        c.rotate(90)
        c.setFont(FONT_NORMAL, 9)
        c.drawCentredString(0, 0, contact_text)
        c.restoreState()

    # --- PDF 저장 ---
    c.showPage()
    c.save()
    buffer.seek(0)
    
    filename = f'posters/missing_pet_{missing_pet.id}.pdf'
    path = default_storage.save(filename, ContentFile(buffer.read()))
    return f'/media/{path}'