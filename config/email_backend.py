"""SendGrid HTTPS API를 통한 이메일 발송 백엔드.

VPS 아웃바운드 SMTP(587) 포트가 막혀있어 smtplib 기반 백엔드를 쓸 수 없어서,
443 포트로 통신하는 SendGrid REST API를 직접 호출한다.
"""
import re
import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend


def _parse_from_email(raw):
    """'Pet Daylight <noreply@x.com>' 형식에서 (이름, 이메일)을 분리"""
    match = re.match(r'^\s*(.*?)\s*<(.+?)>\s*$', raw)
    if match:
        name, email = match.groups()
        return name or None, email
    return None, raw


class SendGridAPIBackend(BaseEmailBackend):
    API_URL = 'https://api.sendgrid.com/v3/mail/send'

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        api_key = getattr(settings, 'SENDGRID_API_KEY', '')
        if not api_key:
            if not self.fail_silently:
                raise ValueError('SENDGRID_API_KEY가 설정되지 않았습니다.')
            return 0

        sent_count = 0
        for message in email_messages:
            from_name, from_email = _parse_from_email(message.from_email)
            from_field = {'email': from_email}
            if from_name:
                from_field['name'] = from_name

            payload = {
                'personalizations': [{
                    'to': [{'email': addr} for addr in message.to],
                }],
                'from': from_field,
                'subject': message.subject,
                'content': [{'type': 'text/plain', 'value': message.body}],
            }

            try:
                response = requests.post(
                    self.API_URL,
                    headers={
                        'Authorization': f'Bearer {api_key}',
                        'Content-Type': 'application/json',
                    },
                    json=payload,
                    timeout=10,
                )
                if 200 <= response.status_code < 300:
                    sent_count += 1
                elif not self.fail_silently:
                    raise RuntimeError(f'SendGrid 발송 실패 ({response.status_code}): {response.text}')
            except requests.RequestException:
                if not self.fail_silently:
                    raise

        return sent_count
