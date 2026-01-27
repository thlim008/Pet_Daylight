# 🐾 Pet Daylight

반려동물의 건강한 일상을 위한 통합 관리 플랫폼입니다.

## 📋 프로젝트 소개

Pet Daylight는 반려동물 보호자들을 위한 올인원 플랫폼으로, 반려동물의 생애주기별 관리, 동물병원 정보 조회, 실종 반려동물 찾기, 커뮤니티 등 다양한 기능을 제공합니다.

**🔗 Links**
- **사이트**: [petdaylight.mooo.com](https://petdaylight.mooo.com/)
- **문서**: [Notion 프로젝트 문서](https://giant-nebula-31e.notion.site/Pet-Daylight-2e12e20d0ef481a4b0a5f3d9e08d381a?pvs=74)
- **동영상** : [Petdaylight 기능 소개](https://youtu.be/DF3j2geMv1k)
- **발표 자료** :[Petdaylight 발표 자료](https://www.miricanvas.com/v/15comfo)
### 주요 기능

- 🏥 **동물병원 찾기**: 위치 기반 동물병원 검색 및 리뷰
- 🔍 **실종 반려동물**: 실종 신고 및 제보, 지도 기반 검색
- 📅 **생애주기 관리**: 나이별 맞춤 체크리스트 및 건강 가이드
- 💬 **커뮤니티**: 반려동물 보호자들 간의 정보 공유
- 📊 **건강 기록**: 진료 이력, 예방접종 기록 관리
- 🔔 **알림 시스템**: 중요한 일정 및 활동 알림

## 🏗️ 시스템 아키텍처

```
Pet Daylight
├── Backend (Django REST Framework)
│   ├── accounts: 사용자 인증 및 관리
│   ├── lifecycles: 반려동물 생애주기 관리
│   ├── hospitals: 동물병원 정보 및 리뷰
│   ├── missing_pets: 실종 반려동물 관리
│   ├── communities: 커뮤니티 게시판
│   └── notifications: 알림 시스템
│
├── Frontend (React)
│   └── 반응형 웹 애플리케이션
│
└── Monitoring (Prometheus + Grafana)
    └── 실시간 성능 모니터링 및 알림
```

## 🚀 빠른 시작

### 필수 요구사항

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- PostgreSQL 16

### 로컬 개발 환경 설정

1. **저장소 클론**
```bash
git clone https://github.com/yourusername/Pet_Daylight.git
cd Pet_Daylight
```

2. **환경 변수 설정**
```bash
# Backend
cp .env.example .env
# 필요한 환경 변수 설정

# Frontend
cd frontend
cp .env.example .env
# REACT_APP_API_URL 등 설정
```

3. **Docker로 실행**
```bash
# 데이터베이스 실행
docker-compose up -d

# Backend 실행
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend 실행 (새 터미널)
cd frontend
npm install
npm start
```

4. **접속**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Admin: http://localhost:8000/admin

## 📦 프로젝트 구조

```
Pet_Daylight/
├── app/                        # Django 앱들
│   ├── accounts/              # 사용자 관리
│   ├── lifecycles/            # 생애주기 관리
│   ├── hospitals/             # 동물병원
│   ├── missing_pets/          # 실종 반려동물
│   ├── communities/           # 커뮤니티
│   └── notifications/         # 알림
├── config/                     # Django 설정
├── frontend/                   # React 프론트엔드
├── monitoring/                 # 모니터링 설정
├── nginx/                      # Nginx 설정
├── docker-compose.yml          # 개발 환경
├── docker-compose.prod.yml     # 프로덕션 환경
└── docker-compose.monitoring.yml  # 모니터링 스택
```

## 🔧 기술 스택

### Backend
- **Framework**: Django 5.0, Django REST Framework 3.16
- **Database**: PostgreSQL 16
- **Authentication**: JWT (Simple JWT)
- **API Documentation**: drf-spectacular (OpenAPI 3.0)
- **Social Login**: django-allauth (Google, Kakao, Naver)
- **Image Processing**: Pillow

### Frontend
- **Framework**: React 19
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS 3.4
- **Build Tool**: Create React App
- **Map Integration**: Kakao Maps API

### Monitoring
- **Metrics**: Prometheus
- **Visualization**: Grafana
- **Alerting**: Alertmanager
- **Notification**: Discord Webhook

### DevOps
- **Containerization**: Docker, Docker Compose
- **Web Server**: Nginx
- **Process Management**: Gunicorn

## 📚 상세 문서

각 모듈별 상세 문서는 다음 파일을 참조하세요:

- [Backend 개발 가이드](./app/README.md)
- [Frontend 개발 가이드](./frontend/README.md)
- [Monitoring 설정 가이드](./monitoring/README.md)

## 🌐 배포

프로덕션 배포에 대한 상세한 내용은 [AWS 배포 가이드](./AWS_DEPLOYMENT_GUIDE.md)를 참조하세요.

### 프로덕션 실행

```bash
# 프로덕션 환경 실행
docker-compose -f docker-compose.prod.yml up -d

# 모니터링 스택 실행
docker-compose -f docker-compose.monitoring.yml up -d
```

## 🧪 테스트

```bash
# Backend 테스트
python manage.py test

# Frontend 테스트
cd frontend
npm test
```

## 🤝 기여 방법

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 등록해주세요.

## 🙏 감사의 말

- [Django](https://www.djangoproject.com/)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)

---

Made with ❤️ for pet lovers






