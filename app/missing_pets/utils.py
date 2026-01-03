"""
missing_pets/utils.py - QR코드 및 포스터 생성 유틸리티 (한글 완전 지원)
✨ 개선된 버전: 상세설명 포함 + 더 예쁜 디자인
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
    project_font_path_regular = os.path.join(current_dir, 'fonts', 'NanumGothic.ttf')

    # 시도할 폰트 경로 목록 (프로젝트 내부 경로를 0순위로 배치)
    font_paths_bold = [
        project_font_path,
        '/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf',
        '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
        'C:/Windows/Fonts/malgunbd.ttf',
        'C:/Windows/Fonts/malgun.ttf',
    ]
    
    font_paths_regular = [
        project_font_path_regular,
        project_font_path,
        '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
        'C:/Windows/Fonts/malgun.ttf',
    ]
    
    # Bold 폰트 등록
    for font_path in font_paths_bold:
        if os.path.exists(font_path):
            try:
                pdfmetrics.registerFont(TTFont('KoreanBold', font_path))
                FONT_BOLD = 'KoreanBold'
                print(f"✅ Bold 폰트 등록 성공: {font_path}")
                break
            except Exception as e:
                print(f"❌ Bold 폰트 등록 실패 ({font_path}): {e}")
                continue
    
    # Regular 폰트 등록
    for font_path in font_paths_regular:
        if os.path.exists(font_path):
            try:
                pdfmetrics.registerFont(TTFont('KoreanFont', font_path))
                FONT_NORMAL = 'KoreanFont'
                FONT_REGISTERED = True
                print(f"✅ Regular 폰트 등록 성공: {font_path}")
                return
            except Exception as e:
                print(f"❌ Regular 폰트 등록 실패 ({font_path}): {e}")
                continue
    
    # Bold만 성공한 경우 Normal도 Bold로 설정
    if FONT_BOLD == 'KoreanBold':
        FONT_NORMAL = 'KoreanBold'
        FONT_REGISTERED = True
        return
    
    print("⚠️ 경고: 한글 폰트를 찾지 못해 네모로 표시될 수 있습니다.")


def generate_qr_code(missing_pet):
    """
    QR코드 생성 및 저장
    
    Args:
        missing_pet: MissingPet 인스턴스
    
    Returns:
        str: QR코드 이미지 URL
    """
    base_url = getattr(settings, 'FRONTEND_URL', 'https://petdaylight.mooo.com')
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
    
    qr_url = default_storage.url(path)
    
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
        c.drawString(50, y, text)


def draw_wrapped_text(c, text, x, y, max_width, font_name, font_size, line_height, color=(0, 0, 0), max_lines=5):
    """
    긴 텍스트를 여러 줄로 나눠서 그리기
    """
    c.setFont(font_name, font_size)
    c.setFillColorRGB(*color)
    
    if not text:
        return y
    
    words = list(text)  # 한글은 글자 단위로 분리
    lines = []
    current_line = ""
    
    for char in text:
        test_line = current_line + char
        try:
            if c.stringWidth(test_line, font_name, font_size) <= max_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = char
        except:
            current_line = test_line
    
    if current_line:
        lines.append(current_line)
    
    # 최대 줄 수 제한
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1][:-3] + "..."
    
    for line in lines:
        try:
            c.drawString(x, y, line)
        except:
            pass
        y -= line_height
    
    return y


def generate_poster_pdf(missing_pet):
    """
    ✨ 개선된 포스터 PDF 생성
    - 상세설명(description) 포함
    - 더 예쁜 디자인
    - 절취선 연락처 낱장 포함
    
    A4 = 210mm x 297mm
    레이아웃:
    - 상단 배너: 297 ~ 252mm (45mm)
    - 동물 정보: 252 ~ 225mm (27mm) 
    - 이미지: 225 ~ 135mm (90mm)
    - 정보 박스: 135 ~ 70mm (65mm)
    - 절취선 영역: 70 ~ 0mm (70mm)
    """
    register_korean_fonts()
    buffer = BytesIO()
    width, height = A4  # 595pt x 842pt (210mm x 297mm)
    c = canvas.Canvas(buffer, pagesize=A4)
    
    # === 색상 정의 ===
    COLOR_RED = (0.9, 0.2, 0.2)
    COLOR_BLUE = (0.2, 0.4, 0.8)
    COLOR_ORANGE = (0.95, 0.6, 0.1)
    COLOR_DARK = (0.15, 0.15, 0.15)
    COLOR_GRAY = (0.4, 0.4, 0.4)
    COLOR_LIGHT_GRAY = (0.95, 0.95, 0.95)
    
    # 카테고리별 색상
    category_colors = {
        'missing': COLOR_RED,
        'found': COLOR_BLUE,
        'rescue': COLOR_ORANGE
    }
    main_color = category_colors.get(missing_pet.category, COLOR_RED)
    
    # ======================================================
    # 1. 상단 컬러 배너 (297mm ~ 252mm)
    # ======================================================
    banner_top = height
    banner_height = 40*mm
    banner_bottom = banner_top - banner_height
    
    c.setFillColorRGB(*main_color)
    c.rect(0, banner_bottom, width, banner_height, fill=1, stroke=0)
    
    # 타이틀
    category_map = {
        'missing': '실종 신고',
        'found': '발견 신고', 
        'rescue': '구조 요청'
    }
    title = category_map.get(missing_pet.category, '제보')
    
    c.setFillColorRGB(1, 1, 1)
    c.setFont(FONT_BOLD, 38)
    title_width = c.stringWidth(title, FONT_BOLD, 38)
    c.drawString((width - title_width) / 2, banner_bottom + 12*mm, title)
    
    # ======================================================
    # 2. 동물 정보 영역 (252mm ~ 230mm)
    # ======================================================
    # 종류 / 품종
    species_text = f"{missing_pet.get_species_display()}"
    if missing_pet.breed:
        species_text += f" · {missing_pet.breed}"
    
    c.setFillColorRGB(*COLOR_DARK)
    c.setFont(FONT_BOLD, 22)
    species_width = c.stringWidth(species_text, FONT_BOLD, 22)
    c.drawString((width - species_width) / 2, banner_bottom - 12*mm, species_text)
    
    # 이름
    if missing_pet.name:
        name_text = f'"{missing_pet.name}"'
        c.setFont(FONT_BOLD, 26)
        c.setFillColorRGB(*main_color)
        name_width = c.stringWidth(name_text, FONT_BOLD, 26)
        c.drawString((width - name_width) / 2, banner_bottom - 26*mm, name_text)
    
    # ======================================================
    # 3. 메인 이미지 (225mm ~ 140mm) = 85mm 영역
    # ======================================================
    img_size = 80*mm
    img_x = (width - img_size) / 2
    img_y = 145*mm  # 이미지 하단 위치
    
    if missing_pet.images and len(missing_pet.images) > 0:
        img = download_image(missing_pet.images[0])
        if img:
            # 이미지 배경 (그림자 효과)
            c.setFillColorRGB(0.85, 0.85, 0.85)
            c.roundRect(img_x + 2*mm, img_y - 2*mm, img_size, img_size, 5*mm, fill=1, stroke=0)
            
            # 이미지 테두리
            c.setStrokeColorRGB(*main_color)
            c.setLineWidth(3)
            c.roundRect(img_x, img_y, img_size, img_size, 5*mm, fill=0, stroke=1)
            
            # 흰색 배경
            c.setFillColorRGB(1, 1, 1)
            c.roundRect(img_x + 1, img_y + 1, img_size - 2, img_size - 2, 4*mm, fill=1, stroke=0)
            
            # 이미지 그리기
            c.saveState()
            path = c.beginPath()
            path.roundRect(img_x + 2, img_y + 2, img_size - 4, img_size - 4, 4*mm)
            c.clipPath(path, stroke=0)
            c.drawImage(ImageReader(img), img_x, img_y, width=img_size, height=img_size, preserveAspectRatio=True, anchor='c')
            c.restoreState()
    else:
        # 이미지 없을 때 플레이스홀더
        c.setFillColorRGB(*COLOR_LIGHT_GRAY)
        c.roundRect(img_x, img_y, img_size, img_size, 5*mm, fill=1, stroke=0)
        c.setFillColorRGB(*COLOR_GRAY)
        c.setFont(FONT_NORMAL, 14)
        c.drawCentredString(width/2, img_y + img_size/2, "사진 없음")
    
    # ======================================================
    # 4. 상세 정보 박스 (140mm ~ 75mm) = 65mm 영역
    # ======================================================
    box_margin = 12*mm
    box_top = 140*mm
    box_bottom = 75*mm
    box_height = box_top - box_bottom
    
    # 정보 박스 배경
    c.setFillColorRGB(0.98, 0.96, 0.94)
    c.roundRect(box_margin, box_bottom, width - box_margin*2, box_height, 4*mm, fill=1, stroke=0)
    
    # 박스 테두리
    c.setStrokeColorRGB(0.9, 0.85, 0.8)
    c.setLineWidth(1)
    c.roundRect(box_margin, box_bottom, width - box_margin*2, box_height, 4*mm, fill=0, stroke=1)
    
    # 정보 텍스트 시작 위치
    text_x = box_margin + 8*mm
    text_y = box_top - 10*mm
    line_spacing = 9*mm
    
    # 📅 발생일
    c.setFillColorRGB(*COLOR_GRAY)
    c.setFont(FONT_NORMAL, 10)
    c.drawString(text_x, text_y, "발생일")
    c.setFillColorRGB(*COLOR_DARK)
    c.setFont(FONT_BOLD, 12)
    c.drawString(text_x + 35*mm, text_y, missing_pet.occurred_at.strftime('%Y년 %m월 %d일'))
    
    text_y -= line_spacing
    
    # 📍 장소
    c.setFillColorRGB(*COLOR_GRAY)
    c.setFont(FONT_NORMAL, 10)
    c.drawString(text_x, text_y, "장소")
    c.setFillColorRGB(*COLOR_DARK)
    c.setFont(FONT_NORMAL, 11)
    address = missing_pet.address or '정보 없음'
    # 주소 길이 제한
    if len(address) > 25:
        address = address[:25] + "..."
    c.drawString(text_x + 35*mm, text_y, address)
    
    text_y -= line_spacing
    
    # 📞 연락처 (강조)
    c.setFillColorRGB(*COLOR_GRAY)
    c.setFont(FONT_NORMAL, 10)
    c.drawString(text_x, text_y, "연락처")
    c.setFillColorRGB(*main_color)
    c.setFont(FONT_BOLD, 15)
    c.drawString(text_x + 35*mm, text_y, missing_pet.contact)
    
    text_y -= line_spacing
    
    # 📝 특징/상세설명
    if missing_pet.description:
        c.setFillColorRGB(*COLOR_GRAY)
        c.setFont(FONT_NORMAL, 10)
        c.drawString(text_x, text_y, "특징")
        
        c.setFillColorRGB(*COLOR_DARK)
        c.setFont(FONT_NORMAL, 10)
        desc = missing_pet.description
        # 특징 길이 제한 (2줄까지)
        if len(desc) > 50:
            desc = desc[:50] + "..."
        
        # 첫 줄
        first_line = desc[:28] if len(desc) > 28 else desc
        c.drawString(text_x + 35*mm, text_y, first_line)
        
        # 두 번째 줄 (필요시)
        if len(desc) > 28:
            text_y -= 5*mm
            second_line = desc[28:50] + ("..." if len(desc) > 50 else "")
            c.drawString(text_x + 35*mm, text_y, second_line)
    
    # QR코드 (박스 우측)
    qr_url = generate_qr_code(missing_pet)
    qr_path = os.path.join(settings.MEDIA_ROOT, qr_url.replace('/media/', ''))
    if os.path.exists(qr_path):
        qr_size = 30*mm
        qr_x = width - box_margin - qr_size - 5*mm
        qr_y = box_bottom + 8*mm
        
        # QR 배경
        c.setFillColorRGB(1, 1, 1)
        c.rect(qr_x - 2*mm, qr_y - 2*mm, qr_size + 4*mm, qr_size + 4*mm, fill=1, stroke=0)
        
        c.drawImage(qr_path, qr_x, qr_y, width=qr_size, height=qr_size)
        
        # QR 라벨
        c.setFillColorRGB(*COLOR_GRAY)
        c.setFont(FONT_NORMAL, 7)
        c.drawCentredString(qr_x + qr_size/2, qr_y - 4*mm, "상세정보 보기")
    
    # ======================================================
    # 5. 절취선 영역 (75mm ~ 0mm)
    # ======================================================
    cut_line_y = 70*mm
    
    # 절취선 안내 텍스트
    c.setFillColorRGB(*COLOR_GRAY)
    c.setFont(FONT_NORMAL, 8)
    c.drawCentredString(width/2, cut_line_y + 2*mm, "✂ 절취선 - 연락처를 떼어가세요")
    
    # 가로 절취선
    c.setDash(4, 3)
    c.setStrokeColorRGB(0.6, 0.6, 0.6)
    c.setLineWidth(1)
    c.line(8*mm, cut_line_y, width - 8*mm, cut_line_y)
    
    # 연락처 낱장 영역
    num_strips = 8
    strip_width = (width - 16*mm) / num_strips
    strip_bottom = 8*mm
    
    # 세로 절취선
    for i in range(1, num_strips):
        lx = 8*mm + (i * strip_width)
        c.line(lx, strip_bottom, lx, cut_line_y)
    
    c.setDash(1, 0)  # 절취선 스타일 해제
    
    # 각 낱장에 세로 텍스트
    for i in range(num_strips):
        strip_center_x = 8*mm + (i * strip_width) + (strip_width / 2)
        
        # 이름/종류
        label = missing_pet.name if missing_pet.name else missing_pet.get_species_display()
        
        c.saveState()
        c.translate(strip_center_x - 4*mm, 38*mm)
        c.rotate(90)
        c.setFillColorRGB(*COLOR_DARK)
        c.setFont(FONT_BOLD, 9)
        c.drawCentredString(0, 0, label)
        c.restoreState()
        
        # 연락처
        c.saveState()
        c.translate(strip_center_x + 4*mm, 38*mm)
        c.rotate(90)
        c.setFillColorRGB(*main_color)
        c.setFont(FONT_BOLD, 10)
        c.drawCentredString(0, 0, missing_pet.contact)
        c.restoreState()
    
    # ======================================================
    # 6. 푸터
    # ======================================================
    c.setFillColorRGB(0.6, 0.6, 0.6)
    c.setFont(FONT_NORMAL, 7)
    c.drawCentredString(width/2, 3*mm, "Pet Daylight - 반려동물을 함께 지켜요")
    
    # === PDF 저장 ===
    c.showPage()
    c.save()
    buffer.seek(0)
    
    filename = f'posters/missing_pet_{missing_pet.id}.pdf'
    path = default_storage.save(filename, ContentFile(buffer.read()))
    return default_storage.url(path)