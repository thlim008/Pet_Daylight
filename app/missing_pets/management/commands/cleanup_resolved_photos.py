from datetime import timedelta

from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from django.utils import timezone

from app.missing_pets.models import MissingPet


class Command(BaseCommand):
    help = '해결된 지 오래된 실종 제보의 사진(및 생성된 QR코드/포스터)을 삭제해 저장 공간을 정리합니다.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=30, help='해결 후 며칠 지난 것부터 정리할지 (기본 30일)')
        parser.add_argument('--dry-run', action='store_true', help='실제로 지우지 않고 대상만 확인')

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(days=days)

        targets = MissingPet.objects.filter(status='resolved', updated_at__lt=cutoff).exclude(images=[])

        deleted_files = 0
        for mp in targets:
            for url in (mp.images or []):
                if url.startswith('/media/'):
                    file_path = url[len('/media/'):]
                    if default_storage.exists(file_path):
                        deleted_files += 1
                        if not dry_run:
                            default_storage.delete(file_path)

            # QR코드/포스터는 missing_pet.id로 정해지는 경로라 DB 추적 없이도 정리 가능
            for path in (f'qr_codes/missing_pet_{mp.id}.png', f'posters/missing_pet_{mp.id}.pdf'):
                if default_storage.exists(path):
                    deleted_files += 1
                    if not dry_run:
                        default_storage.delete(path)

            if not dry_run:
                mp.images = []
                mp.save(update_fields=['images'])

        action = '삭제 예정' if dry_run else '삭제 완료'
        self.stdout.write(self.style.SUCCESS(
            f'{action}: 제보 {targets.count()}건, 파일 {deleted_files}개 ({days}일 이상 지난 해결 제보 기준)'
        ))
