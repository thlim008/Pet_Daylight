# 🚀 Pet Daylight - AWS 배포 완전 가이드

이 문서는 Pet Daylight 프로젝트를 AWS에 처음부터 끝까지 배포하는 방법을 설명합니다.

---

## 📋 목차

1. [사전 준비](#1-사전-준비)
2. [AWS 계정 및 IAM 설정](#2-aws-계정-및-iam-설정)
3. [RDS (PostgreSQL) 설정](#3-rds-postgresql-설정)
4. [S3 버킷 설정](#4-s3-버킷-설정)
5. [SES 이메일 설정](#5-ses-이메일-설정)
6. [EC2 인스턴스 생성](#6-ec2-인스턴스-생성)
7. [도메인 및 SSL 설정](#7-도메인-및-ssl-설정)
8. [백엔드 배포](#8-백엔드-배포)
9. [프론트엔드 배포 (S3 + CloudFront)](#9-프론트엔드-배포-s3--cloudfront)
10. [CI/CD 설정 (GitHub Actions)](#10-cicd-설정-github-actions)
11. [모니터링 설정](#11-모니터링-설정)
12. [문제 해결](#12-문제-해결)

---

## 1. 사전 준비

### 필요한 것들
- AWS 계정 (https://aws.amazon.com)
- 도메인 (예: petdaylight.com) - Route 53 또는 외부 도메인
- GitHub 계정 (CI/CD용)
- 로컬에 설치: AWS CLI, Docker, Git

### AWS CLI 설치 및 설정
```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 설정
aws configure
# AWS Access Key ID: [입력]
# AWS Secret Access Key: [입력]
# Default region name: ap-northeast-2
# Default output format: json
```

---

## 2. AWS 계정 및 IAM 설정

### 2.1 IAM 사용자 생성

1. AWS Console → IAM → Users → Add users
2. User name: `petdaylight-deploy`
3. Permissions: 아래 정책 연결
   - AmazonRDSFullAccess
   - AmazonS3FullAccess
   - AmazonSESFullAccess
   - AmazonEC2FullAccess
   - CloudFrontFullAccess

4. Access Key 생성 후 안전하게 저장

### 2.2 배포용 IAM 역할 생성 (EC2용)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::petdaylight-bucket",
        "arn:aws:s3:::petdaylight-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 3. RDS (PostgreSQL) 설정

### 3.1 RDS 인스턴스 생성

1. AWS Console → RDS → Create database

2. **설정값:**
   ```
   Engine: PostgreSQL 16
   Template: Free tier (개발) / Production (운영)
   DB instance identifier: petdaylight-db
   Master username: petdaylight_admin
   Master password: [강력한 비밀번호]
   
   Instance: db.t3.micro (개발) / db.t3.small (운영)
   Storage: 20GB (gp3)
   
   VPC: Default VPC
   Public access: Yes (개발) / No (운영)
   Security group: petdaylight-rds-sg
   
   Database name: petdaylight_db
   Port: 5432
   ```

### 3.2 보안 그룹 설정

```bash
# RDS 보안 그룹 (petdaylight-rds-sg)
Inbound Rules:
- Type: PostgreSQL
- Port: 5432
- Source: EC2 보안 그룹 또는 IP
```

### 3.3 연결 테스트

```bash
# psql로 연결 테스트
psql -h petdaylight-db.xxxx.ap-northeast-2.rds.amazonaws.com \
     -U petdaylight_admin \
     -d petdaylight_db
```

---

## 4. S3 버킷 설정

### 4.1 버킷 생성

1. AWS Console → S3 → Create bucket

2. **설정:**
   ```
   Bucket name: petdaylight-bucket
   Region: ap-northeast-2
   
   Block Public Access: 
   - ✅ Block all public access (미디어는 CloudFront로 제공)
   
   Versioning: Enabled (선택)
   ```

### 4.2 버킷 정책

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontAccess",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::petdaylight-bucket/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
                }
            }
        }
    ]
}
```

### 4.3 CORS 설정

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": [
            "https://petdaylight.com",
            "https://api.petdaylight.com"
        ],
        "ExposeHeaders": ["ETag"]
    }
]
```

---

## 5. SES 이메일 설정

### 5.1 도메인 인증

1. AWS Console → SES → Verified identities
2. Create identity → Domain
3. Domain: petdaylight.com
4. DNS 레코드를 도메인에 추가 (DKIM, SPF)

### 5.2 SMTP 자격증명 생성

1. SES → SMTP settings → Create SMTP credentials
2. IAM user name: ses-smtp-user
3. 생성된 SMTP Username/Password 저장

### 5.3 프로덕션 액세스 요청

1. SES → Account dashboard → Request production access
2. Use case 작성하여 제출 (승인까지 24-48시간)

---

## 6. EC2 인스턴스 생성

### 6.1 인스턴스 생성

1. AWS Console → EC2 → Launch instance

2. **설정:**
   ```
   Name: petdaylight-server
   AMI: Ubuntu Server 24.04 LTS
   Instance type: t3.small (운영) / t3.micro (개발)
   Key pair: petdaylight-key (새로 생성)
   
   Network:
   - VPC: Default
   - Subnet: Public subnet
   - Auto-assign public IP: Enable
   
   Security group: petdaylight-ec2-sg
   Storage: 30GB gp3
   ```

### 6.2 보안 그룹 설정

```bash
# EC2 보안 그룹 (petdaylight-ec2-sg)
Inbound Rules:
- SSH (22): My IP
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- Custom TCP (8000): 0.0.0.0/0 (개발용, 운영에서는 제거)
```

### 6.3 EC2 초기 설정

```bash
# SSH 접속
ssh -i petdaylight-key.pem ubuntu@<EC2-PUBLIC-IP>

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 재접속 (docker 그룹 적용)
exit
ssh -i petdaylight-key.pem ubuntu@<EC2-PUBLIC-IP>

# 확인
docker --version
docker-compose --version
```

### 6.4 Elastic IP 연결

1. EC2 → Elastic IPs → Allocate
2. 생성된 IP를 EC2 인스턴스에 Associate
3. 이 IP를 도메인에 연결

---

## 7. 도메인 및 SSL 설정

### 7.1 Route 53 설정 (또는 외부 DNS)

```bash
# A 레코드 설정
api.petdaylight.com → EC2 Elastic IP
petdaylight.com → CloudFront Distribution (프론트엔드)
```

### 7.2 SSL 인증서 (Let's Encrypt)

```bash
# EC2에서 실행
sudo apt install certbot -y

# 인증서 발급
sudo certbot certonly --standalone -d api.petdaylight.com

# 인증서 위치
# /etc/letsencrypt/live/api.petdaylight.com/fullchain.pem
# /etc/letsencrypt/live/api.petdaylight.com/privkey.pem

# 프로젝트 디렉토리에 복사
sudo mkdir -p /home/ubuntu/petdaylight/nginx/ssl
sudo cp /etc/letsencrypt/live/api.petdaylight.com/fullchain.pem /home/ubuntu/petdaylight/nginx/ssl/
sudo cp /etc/letsencrypt/live/api.petdaylight.com/privkey.pem /home/ubuntu/petdaylight/nginx/ssl/
sudo chown -R ubuntu:ubuntu /home/ubuntu/petdaylight/nginx/ssl

# 자동 갱신 설정
sudo crontab -e
# 추가: 0 0 1 * * certbot renew --quiet
```

---

## 8. 백엔드 배포

### 8.1 프로젝트 업로드

```bash
# EC2에서 실행
cd /home/ubuntu
git clone https://github.com/your-repo/Pet_Daylight.git petdaylight
cd petdaylight
```

### 8.2 환경변수 설정

```bash
# .env 파일 생성
cp .env.example .env
nano .env
```

```env
# .env 내용
DJANGO_SECRET_KEY=your-super-secret-key-generate-new-one
DEBUG=False
ALLOWED_HOSTS=api.petdaylight.com,petdaylight.com

# RDS
RDS_DB_NAME=petdaylight_db
RDS_USERNAME=petdaylight_admin
RDS_PASSWORD=your-rds-password
RDS_HOSTNAME=petdaylight-db.xxxx.ap-northeast-2.rds.amazonaws.com
RDS_PORT=5432

# S3
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=petdaylight-bucket
AWS_S3_REGION_NAME=ap-northeast-2

# SES
EMAIL_HOST=email-smtp.ap-northeast-2.amazonaws.com
EMAIL_PORT=587
EMAIL_HOST_USER=AKIAXXXXXXXXXX
EMAIL_HOST_PASSWORD=your-ses-smtp-password
DEFAULT_FROM_EMAIL=Pet Daylight <noreply@petdaylight.com>

# URLs
FRONTEND_URL=https://petdaylight.com
BACKEND_URL=https://api.petdaylight.com
```

### 8.3 Docker로 배포

```bash
# 빌드 및 실행
docker-compose -f docker-compose.prod.yml up -d --build

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 마이그레이션
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 슈퍼유저 생성
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# 정적 파일 수집 (S3로 업로드)
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### 8.4 확인

```bash
# 헬스체크
curl https://api.petdaylight.com/health

# Admin 접속
# https://api.petdaylight.com/admin
```

---

## 9. 프론트엔드 배포 (S3 + CloudFront)

### 9.1 S3 버킷 생성 (프론트엔드용)

```bash
Bucket name: petdaylight-frontend
Region: ap-northeast-2
Static website hosting: Enable
Index document: index.html
Error document: index.html
```

### 9.2 빌드 및 업로드

```bash
# 로컬에서 실행
cd frontend

# 환경변수 설정
echo "REACT_APP_API_URL=https://api.petdaylight.com/api" > .env.production

# 빌드
npm install
npm run build

# S3 업로드
aws s3 sync build/ s3://petdaylight-frontend --delete
```

### 9.3 CloudFront 설정

1. CloudFront → Create distribution

2. **설정:**
   ```
   Origin domain: petdaylight-frontend.s3.ap-northeast-2.amazonaws.com
   Origin access: Origin access control settings (OAC)
   
   Default cache behavior:
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Allowed HTTP methods: GET, HEAD
   - Cache policy: CachingOptimized
   
   Settings:
   - Alternate domain name: petdaylight.com, www.petdaylight.com
   - Custom SSL certificate: (ACM에서 발급)
   - Default root object: index.html
   
   Error pages:
   - 403 → /index.html (200)
   - 404 → /index.html (200)
   ```

### 9.4 ACM 인증서 발급 (CloudFront용)

1. **⚠️ 중요: us-east-1 리전에서 발급해야 함!**
2. ACM → Request certificate
3. Domain: petdaylight.com, *.petdaylight.com
4. DNS 검증
5. CloudFront에서 이 인증서 선택

### 9.5 Route 53 업데이트

```bash
# CloudFront Distribution을 가리키도록 변경
petdaylight.com → CloudFront Distribution (A record, Alias)
www.petdaylight.com → CloudFront Distribution (A record, Alias)
```

---

## 10. CI/CD 설정 (GitHub Actions)

### 10.1 GitHub Secrets 설정

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
EC2_HOST (Elastic IP)
EC2_USER (ubuntu)
EC2_SSH_KEY (private key 내용)
CLOUDFRONT_DISTRIBUTION_ID
```

### 10.2 백엔드 배포 워크플로우

`.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'app/**'
      - 'config/**'
      - 'requirements*.txt'
      - 'Dockerfile'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ubuntu/petdaylight
            git pull origin main
            docker-compose -f docker-compose.prod.yml up -d --build
            docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate
            docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput
```

### 10.3 프론트엔드 배포 워크플로우

`.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install and Build
        working-directory: frontend
        env:
          REACT_APP_API_URL: https://api.petdaylight.com/api
        run: |
          npm ci
          npm run build
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-2
      
      - name: Deploy to S3
        run: |
          aws s3 sync frontend/build/ s3://petdaylight-frontend --delete
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

---

## 11. 모니터링 설정

### 11.1 CloudWatch 알람

```bash
# RDS CPU 알람
aws cloudwatch put-metric-alarm \
  --alarm-name "RDS-CPU-High" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=petdaylight-db \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:ap-northeast-2:ACCOUNT_ID:alerts
```

### 11.2 EC2 로그

```bash
# Docker 로그 확인
docker-compose -f docker-compose.prod.yml logs -f backend

# 시스템 리소스 확인
htop
df -h
```

---

## 12. 문제 해결

### 일반적인 문제들

**1. 502 Bad Gateway**
```bash
# Nginx와 Django 연결 확인
docker-compose -f docker-compose.prod.yml logs nginx
docker-compose -f docker-compose.prod.yml logs backend
```

**2. 데이터베이스 연결 실패**
```bash
# RDS 보안 그룹 확인
# EC2 IP가 허용되어 있는지 확인
```

**3. S3 업로드 실패**
```bash
# IAM 권한 확인
# 버킷 정책 확인
# CORS 설정 확인
```

**4. 이메일 발송 실패**
```bash
# SES 샌드박스 모드 확인
# 발신자 이메일 인증 확인
```

**5. CORS 에러**
```bash
# Django CORS 설정 확인
# CloudFront 캐시 무효화
```

### 유용한 명령어

```bash
# 컨테이너 재시작
docker-compose -f docker-compose.prod.yml restart

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# 컨테이너 내부 접속
docker-compose -f docker-compose.prod.yml exec backend bash

# Django 쉘
docker-compose -f docker-compose.prod.yml exec backend python manage.py shell

# 데이터베이스 백업
docker-compose -f docker-compose.prod.yml exec backend python manage.py dumpdata > backup.json
```

---

## 📝 체크리스트

배포 전 확인사항:

- [ ] SECRET_KEY 변경됨
- [ ] DEBUG=False 설정됨
- [ ] ALLOWED_HOSTS 설정됨
- [ ] RDS 연결 테스트 완료
- [ ] S3 버킷 생성 및 권한 설정 완료
- [ ] SSL 인증서 설정 완료
- [ ] SES 도메인 인증 완료
- [ ] 소셜 로그인 콜백 URL 업데이트
- [ ] 환경변수 모두 설정됨
- [ ] 마이그레이션 실행됨
- [ ] 정적 파일 수집됨
- [ ] 슈퍼유저 생성됨
- [ ] 헬스체크 통과

---

## 💰 예상 비용 (월간)

| 서비스 | 사양 | 예상 비용 |
|--------|------|----------|
| EC2 | t3.small | ~$15 |
| RDS | db.t3.micro | ~$15 |
| S3 | 10GB | ~$1 |
| CloudFront | 100GB 전송 | ~$10 |
| Route 53 | 1 호스팅 존 | ~$0.5 |
| **합계** | | **~$40/월** |

Free Tier 적용 시 첫 12개월은 더 저렴할 수 있습니다.

---

## 🆘 도움이 필요하면

- AWS 공식 문서: https://docs.aws.amazon.com
- Django 배포 가이드: https://docs.djangoproject.com/en/5.0/howto/deployment/
- Docker 문서: https://docs.docker.com

Happy Deploying! 🎉
