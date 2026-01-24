"""
Custom S3 Storage Backends
"""

from storages.backends.s3boto3 import S3Boto3Storage


class StaticStorage(S3Boto3Storage):
    """정적 파일용 S3 스토리지"""
    location = 'static'
    default_acl = None


class MediaStorage(S3Boto3Storage):
    """미디어 파일용 S3 스토리지"""
    location = 'media'
    default_acl = None
    file_overwrite = False
