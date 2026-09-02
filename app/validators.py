from django.core.exceptions import ValidationError

MAX_IMAGE_SIZE_MB = 10
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024


def validate_image_size(file):
    """업로드 이미지 용량 제한 (기본 10MB)"""
    if file.size > MAX_IMAGE_SIZE_BYTES:
        raise ValidationError(f'이미지 파일은 {MAX_IMAGE_SIZE_MB}MB를 초과할 수 없습니다.')
