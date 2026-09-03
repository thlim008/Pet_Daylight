import re

from django.core.exceptions import ValidationError

MAX_IMAGE_SIZE_MB = 10
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

SPECIAL_CHAR_PATTERN = re.compile(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/~`;\']')


def validate_image_size(file):
    """업로드 이미지 용량 제한 (기본 10MB)"""
    if file.size > MAX_IMAGE_SIZE_BYTES:
        raise ValidationError(f'이미지 파일은 {MAX_IMAGE_SIZE_MB}MB를 초과할 수 없습니다.')


def validate_password_strength(value):
    """비밀번호는 8자 이상 + 영문자 + 특수문자 조합 필수"""
    if len(value) < 8:
        raise ValidationError('비밀번호는 8자 이상이어야 합니다.')
    if not re.search(r'[A-Za-z]', value):
        raise ValidationError('비밀번호에 영문자를 포함해주세요.')
    if not SPECIAL_CHAR_PATTERN.search(value):
        raise ValidationError('비밀번호에 특수문자를 포함해주세요.')
