FROM python:3.11-slim

WORKDIR /app

# 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 복사
COPY relay.py .

# 포트 노출
EXPOSE 8800

# 실행
CMD ["uvicorn", "relay:app", "--host", "0.0.0.0", "--port", "8800"]
