# 🎨 Pet Daylight - Frontend

React 기반 Pet Daylight 프론트엔드 웹 애플리케이션입니다.

## 📋 목차

- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [주요 기능](#주요-기능)
- [페이지 구성](#페이지-구성)
- [컴포넌트](#컴포넌트)
- [유틸리티](#유틸리티)
- [상태 관리](#상태-관리)
- [API 통신](#api-통신)
- [스타일링](#스타일링)
- [환경 변수](#환경-변수)
- [빌드 및 배포](#빌드-및-배포)

## 🛠 기술 스택

### Core
- **React**: 19.2.3
- **React Router**: 6.30.2
- **React Scripts**: 5.0.1

### HTTP Client
- **Axios**: 1.13.2

### Styling
- **Tailwind CSS**: 3.4.19
- **PostCSS**: 8.5.6
- **Autoprefixer**: 10.4.23

### Testing
- **Jest**: React Scripts 내장
- **React Testing Library**: 16.3.1
- **Testing Library User Event**: 13.5.0

### Map Integration
- **Kakao Maps API**: JavaScript SDK

### 기타
- **Web Vitals**: 2.1.4 - 성능 측정

## 📁 프로젝트 구조

```
frontend/
├── public/                    # 정적 파일
│   ├── index.html            # HTML 템플릿
│   ├── favicon.ico           # 파비콘
│   ├── logo.png              # 로고 이미지
│   └── manifest.json         # PWA 매니페스트
│
├── src/
│   ├── components/           # 재사용 가능한 컴포넌트
│   │   ├── ImageGallery.js          # 이미지 갤러리
│   │   ├── KakaoChannelButton.js    # 카카오톡 채널 버튼
│   │   ├── KakaoMap.js              # 카카오 지도
│   │   ├── NotificationDropdown.js  # 알림 드롭다운
│   │   └── ShareButtons.js          # 공유 버튼
│   │
│   ├── pages/                # 페이지 컴포넌트
│   │   ├── HomePage.js                      # 홈
│   │   ├── LoginPage.js                     # 로그인
│   │   ├── RegisterPage.js                  # 회원가입
│   │   ├── ProfilePage.js                   # 프로필
│   │   ├── PasswordResetRequestPage.js      # 비밀번호 재설정 요청
│   │   ├── PasswordResetConfirmPage.js      # 비밀번호 재설정 확인
│   │   │
│   │   ├── PetListPage.js                   # 반려동물 목록
│   │   ├── PetFormPage.js                   # 반려동물 등록/수정
│   │   ├── PetDashboard.js                  # 반려동물 대시보드
│   │   ├── PetHealthPage.js                 # 건강 관리
│   │   ├── PetVaccinationPage.js            # 예방접종 기록
│   │   ├── PetAlbumPage.js                  # 앨범
│   │   ├── PetVisitListPage.js              # 진료 기록 목록
│   │   ├── PetVisitFormPage.js              # 진료 기록 등록
│   │   ├── PetVisitCreatePage.js            # 진료 예약
│   │   │
│   │   ├── LifecyclePage.js                 # 생애주기 가이드
│   │   ├── LifecycleDetailPage.js           # 생애주기 상세
│   │   │
│   │   ├── HospitalListPage.js              # 병원 목록
│   │   ├── HospitalDetailPage.js            # 병원 상세
│   │   ├── HospitalReviewCreatePage.js      # 병원 리뷰 작성
│   │   ├── Hospitalmappage.js               # 병원 지도
│   │   │
│   │   ├── MissingPetListPage.js            # 실종 신고 목록
│   │   ├── MissingPetDetailPage.js          # 실종 신고 상세
│   │   ├── MissingPetCreatePage.js          # 실종 신고 등록
│   │   ├── MissingPetEditPage.js            # 실종 신고 수정
│   │   ├── MissingPetMapPage.js             # 실종 지도
│   │   │
│   │   ├── CommunityListPage.js             # 커뮤니티 목록
│   │   ├── CommunityDetailPage.js           # 게시글 상세
│   │   ├── CommunityCreatePage.js           # 게시글 작성
│   │   ├── CommunityEditPage.js             # 게시글 수정
│   │   │
│   │   ├── NotificationPage.js              # 알림
│   │   │
│   │   └── AdminPage.js                     # 관리자 페이지
│   │
│   ├── services/             # API 서비스
│   │   └── api.js           # Axios 인스턴스 및 API 함수
│   │
│   ├── utils/                # 유틸리티 함수
│   │   └── phone.js         # 전화번호 포맷/유효성 검사
│   │
│   ├── App.js               # 메인 앱 컴포넌트
│   ├── App.css              # 앱 스타일
│   ├── index.js             # 진입점
│   ├── index.css            # 글로벌 스타일 (Tailwind)
│   └── reportWebVitals.js   # 성능 측정
│
├── .env.example             # 환경 변수 예시
├── package.json             # 의존성 관리
├── tailwind.config.js       # Tailwind 설정
├── postcss.config.js        # PostCSS 설정
├── Dockerfile              # Docker 이미지
└── nginx.conf              # Nginx 설정
```

## 🚀 설치 및 실행

### 개발 환경 설정

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 REACT_APP_API_URL 등을 설정

# 3. 개발 서버 실행
npm start
```

개발 서버가 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

### 프로덕션 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과물은 build/ 폴더에 생성됩니다
```

### Docker로 실행

```bash
# 개발 환경
docker-compose up -d frontend

# 프로덕션 환경
docker-compose -f docker-compose.prod.yml up -d frontend
```

## ✨ 주요 기능

### 1. 사용자 인증
- 이메일 기반 회원가입 및 로그인
- 소셜 로그인 (Google, Kakao, Naver)
- JWT 토큰 기반 인증
- 비밀번호 재설정
- 프로필 관리

### 2. 반려동물 관리
- 반려동물 등록 및 프로필 관리
- 대시보드에서 한눈에 정보 확인
- 사진 앨범 관리
- 진료 이력 기록
- 예방접종 스케줄 관리

### 3. 생애주기 가이드
- 나이별 맞춤 건강 정보
- 체크리스트 제공
- 단계별 케어 가이드
- 진행률 추적

### 4. 동물병원 찾기
- 위치 기반 병원 검색
- 카카오 지도로 위치 확인
- 병원 상세 정보 및 리뷰
- 즐겨찾기 기능
- 진료 시간 확인

### 5. 실종 반려동물
- 실종 신고 등록
- 지도에서 실종 위치 확인
- 실종 포스터 자동 생성
- 제보 시스템
- SNS 공유 기능

### 6. 커뮤니티
- 게시글 작성 및 조회
- 댓글 및 답글
- 좋아요 기능
- 이미지 업로드
- 검색 및 필터링

### 7. 알림
- 실시간 알림 확인
- 알림 드롭다운 UI
- 읽음/안읽음 상태 관리
- 알림 타입별 구분

## 📄 페이지 구성

### 인증 페이지

**LoginPage**
- 이메일/비밀번호 로그인
- 소셜 로그인 버튼
- 회원가입 링크
- 비밀번호 찾기 링크

**RegisterPage**
- 회원가입 폼
- 유효성 검사
- 이메일 중복 확인

**ProfilePage**
- 사용자 정보 조회 및 수정
- 프로필 이미지 업로드
- 닉네임, 전화번호 등 수정

### 반려동물 페이지

**PetListPage**
- 등록된 반려동물 카드 목록
- 새 반려동물 등록 버튼
- 각 반려동물별 대시보드 링크

**PetDashboard**
- 반려동물 기본 정보
- 빠른 접근 메뉴
  - 건강 관리
  - 예방접종
  - 진료 기록
  - 앨범
  - 생애주기 가이드

**PetHealthPage**
- 건강 기록 타임라인
- 체중 변화 그래프
- 증상 및 치료 내역

**PetVaccinationPage**
- 예방접종 이력
- 다음 접종 일정
- 접종 알림 설정

### 병원 페이지

**HospitalListPage**
- 검색 필터
  - 위치 기반 검색
  - 24시간 운영
  - 야간 진료
  - 공휴일 진료
- 병원 카드 목록
- 즐겨찾기 필터

**HospitalDetailPage**
- 병원 상세 정보
- 카카오 맵으로 위치 표시
- 리뷰 목록 및 평점
- 진료 시간 정보
- 연락처 및 예약 버튼

**Hospitalmappage**
- 지도 기반 병원 찾기
- 마커 클릭으로 병원 정보 확인
- 현재 위치 중심 검색

### 실종 페이지

**MissingPetListPage**
- 실종 신고 목록
- 상태별 필터 (실종중/발견)
- 위치별 검색
- 날짜별 정렬

**MissingPetDetailPage**
- 실종 반려동물 상세 정보
- 실종 위치 지도 표시
- 포스터 다운로드
- SNS 공유 버튼
- 제보하기 버튼

**MissingPetMapPage**
- 지도에 실종 위치 마커 표시
- 마커 클릭으로 상세 정보
- 내 위치 기준 검색

### 커뮤니티 페이지

**CommunityListPage**
- 게시글 목록 (무한 스크롤)
- 검색 기능
- 인기순/최신순 정렬
- 글쓰기 버튼

**CommunityDetailPage**
- 게시글 내용
- 이미지 갤러리
- 좋아요 버튼
- 댓글 목록
- 댓글 작성

### 관리자 페이지

**AdminPage**
- 탭 기반 관리 화면: 회원, 실종/발견/구조 제보, 제보 댓글, 커뮤니티 게시글/댓글, 병원·미용실, 병원 리뷰, 생애주기 가이드
- 각 항목 조회/수정/삭제
- 병원·미용실 등록 시 카카오 지도로 위치 지정
- 생애주기 가이드 등록/수정 (종류, 단계, 체크리스트 등)

## 🧩 컴포넌트

### ImageGallery
이미지 갤러리 컴포넌트로, 여러 이미지를 표시하고 확대/축소 기능을 제공합니다.

```jsx
import ImageGallery from '../components/ImageGallery';

<ImageGallery images={imageUrls} />
```

### KakaoMap
카카오 지도 API를 사용한 지도 컴포넌트입니다.

```jsx
import KakaoMap from '../components/KakaoMap';

<KakaoMap
  latitude={37.5665}
  longitude={126.9780}
  markers={markers}
  onMarkerClick={handleMarkerClick}
/>
```

**Props:**
- `latitude`: 중심 위도
- `longitude`: 중심 경도
- `markers`: 마커 배열
- `onMarkerClick`: 마커 클릭 핸들러

### NotificationDropdown
헤더의 알림 드롭다운 컴포넌트입니다.

```jsx
import NotificationDropdown from '../components/NotificationDropdown';

<NotificationDropdown />
```

**기능:**
- 읽지 않은 알림 개수 표시
- 최근 알림 목록
- 알림 클릭으로 관련 페이지 이동
- 모두 읽음 처리

### ShareButtons
SNS 공유 버튼 컴포넌트입니다.

```jsx
import ShareButtons from '../components/ShareButtons';

<ShareButtons
  url={shareUrl}
  title={title}
  description={description}
/>
```

**지원 플랫폼:**
- 카카오톡
- 페이스북
- 트위터
- 링크 복사

### KakaoChannelButton
카카오톡 채널 상담 버튼입니다.

```jsx
import KakaoChannelButton from '../components/KakaoChannelButton';

<KakaoChannelButton />
```

## 🧰 유틸리티

### phone.js
전화번호 입력 포맷팅 및 유효성 검사 함수 모음입니다 (`src/utils/phone.js`).

```jsx
import { formatPhoneInput, isValidPhone, formatBusinessPhone } from '../utils/phone';

formatPhoneInput('01012345678');     // '010-1234-5678'
isValidPhone('010-1234-5678');       // true
formatBusinessPhone('0212345678');   // '02-1234-5678' (지역번호), 대표번호(1588-XXXX)도 지원
```

- `formatPhoneInput`: 휴대폰 번호(010/011/016/017/018/019) 입력 중 자동 하이픈
- `isValidPhone`: 휴대폰 번호 형식 검사
- `formatBusinessPhone`: 병원 등 사업자 전화번호(지역번호·대표번호 포함) 자동 하이픈

## 🔄 상태 관리

### Local State (useState)
컴포넌트 내부 상태 관리에 사용합니다.

```jsx
const [pets, setPets] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
```

### Context API (향후 적용 예정)
전역 상태 관리를 위해 Context API 사용을 고려 중입니다.

```jsx
// AuthContext 예시
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## 🌐 API 통신

### Axios 인스턴스

`services/api.js`에서 Axios 인스턴스를 설정합니다.

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - JWT 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터 - 토큰 갱신
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/accounts/token/refresh/`,
          { refresh: refreshToken }
        );
        
        const { access } = response.data;
        localStorage.setItem('access_token', access);
        
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

### API 함수 예시

```javascript
// 반려동물 목록 조회
export const getPets = () => api.get('/lifecycles/pets/');

// 반려동물 등록
export const createPet = (data) => api.post('/lifecycles/pets/', data);

// 반려동물 수정
export const updatePet = (id, data) => api.patch(`/lifecycles/pets/${id}/`, data);

// 병원 검색
export const searchHospitals = (params) => 
  api.get('/hospitals/', { params });

// 게시글 작성
export const createCommunity = (data) => 
  api.post('/communities/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
```

### 사용 예시

```jsx
import { getPets, createPet } from '../services/api';

const PetListPage = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const response = await getPets();
        setPets(response.data);
      } catch (error) {
        console.error('펫 목록 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  const handleCreatePet = async (petData) => {
    try {
      const response = await createPet(petData);
      setPets([...pets, response.data]);
    } catch (error) {
      console.error('펫 등록 실패:', error);
    }
  };

  // ...
};
```

## 🎨 스타일링

### Tailwind CSS

Tailwind CSS를 사용하여 유틸리티 퍼스트 방식으로 스타일링합니다.

**tailwind.config.js:**
```javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        accent: '#FFE66D',
      },
    },
  },
  plugins: [],
}
```

### 사용 예시

```jsx
<div className="container mx-auto px-4 py-8">
  <h1 className="text-3xl font-bold text-gray-800 mb-6">
    반려동물 목록
  </h1>
  
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {pets.map(pet => (
      <div key={pet.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <img
          src={pet.image}
          alt={pet.name}
          className="w-full h-48 object-cover rounded-md mb-4"
        />
        <h2 className="text-xl font-semibold text-gray-800">{pet.name}</h2>
        <p className="text-gray-600">{pet.species}</p>
      </div>
    ))}
  </div>
</div>
```

### 커스텀 CSS

특별한 스타일링이 필요한 경우 `App.css`나 모듈 CSS를 사용합니다.

```css
/* App.css */
.custom-button {
  @apply bg-primary text-white px-4 py-2 rounded-lg;
  @apply hover:bg-primary-dark transition-colors;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}
```

## ⚙️ 환경 변수

`.env` 파일에 다음 환경 변수를 설정하세요:

```bash
# API 서버 URL
REACT_APP_API_URL=http://localhost:8000/api

# 카카오 맵 API 키
REACT_APP_KAKAO_MAP_API_KEY=your-kakao-map-api-key

# 카카오 JavaScript 키
REACT_APP_KAKAO_JS_KEY=your-kakao-js-key

# 구글 OAuth 클라이언트 ID
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id

# 네이버 OAuth 클라이언트 ID
REACT_APP_NAVER_CLIENT_ID=your-naver-client-id

# 프로덕션 모드
REACT_APP_PRODUCTION=false
```

## 🏗 빌드 및 배포

### 프로덕션 빌드

```bash
# 빌드
npm run build

# 빌드 결과물 확인
ls -la build/

# 빌드 크기 분석
npm run build -- --stats
npx webpack-bundle-analyzer build/bundle-stats.json
```

### Docker 배포

**Dockerfile:**
```dockerfile
# 빌드 스테이지
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# 실행 스테이지
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

### CI/CD (예정)

GitHub Actions를 사용한 자동 배포를 준비 중입니다.

```yaml
# .github/workflows/deploy.yml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
```

## 🧪 테스트

### 단위 테스트

```bash
# 모든 테스트 실행
npm test

# 커버리지와 함께 실행
npm test -- --coverage

# 특정 파일만 테스트
npm test -- PetListPage
```

### 테스트 작성 예시

```jsx
// PetListPage.test.js
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PetListPage from './PetListPage';
import * as api from '../services/api';

jest.mock('../services/api');

test('renders pet list', async () => {
  const mockPets = [
    { id: 1, name: 'Max', species: 'Dog' },
    { id: 2, name: 'Luna', species: 'Cat' },
  ];
  
  api.getPets.mockResolvedValue({ data: mockPets });
  
  render(
    <BrowserRouter>
      <PetListPage />
    </BrowserRouter>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByText('Luna')).toBeInTheDocument();
  });
});
```

## 🔍 디버깅

### React DevTools

Chrome Extension 설치 후 컴포넌트 상태 및 props를 확인할 수 있습니다.

### Console 로깅

개발 모드에서만 로그 출력:

```javascript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug:', data);
}
```

### Error Boundary

에러 발생 시 사용자 친화적인 화면을 표시합니다.

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>문제가 발생했습니다. 페이지를 새로고침해주세요.</h1>;
    }

    return this.props.children;
  }
}
```

## 📊 성능 최적화

### Code Splitting

React.lazy와 Suspense를 사용한 코드 분할:

```jsx
import { lazy, Suspense } from 'react';

const PetListPage = lazy(() => import('./pages/PetListPage'));

function App() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <PetListPage />
    </Suspense>
  );
}
```

### Image Optimization

- WebP 포맷 사용
- Lazy Loading 적용
- Responsive Images

```jsx
<img
  src={image}
  alt={alt}
  loading="lazy"
  srcSet={`${image} 1x, ${image2x} 2x`}
/>
```

### Memoization

```jsx
import { useMemo, useCallback } from 'react';

const PetList = ({ pets, onPetClick }) => {
  const sortedPets = useMemo(() => {
    return pets.sort((a, b) => a.name.localeCompare(b.name));
  }, [pets]);
  
  const handleClick = useCallback((petId) => {
    onPetClick(petId);
  }, [onPetClick]);
  
  return (
    // ...
  );
};
```

## 📱 반응형 디자인

Tailwind CSS의 반응형 유틸리티를 사용합니다:

```jsx
<div className="
  grid 
  grid-cols-1    /* 모바일: 1열 */
  sm:grid-cols-2 /* 태블릿: 2열 */
  lg:grid-cols-3 /* 데스크탑: 3열 */
  gap-4
">
  {/* 콘텐츠 */}
</div>
```

**브레이크포인트:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## 🌍 국제화 (향후 추가 예정)

react-i18next를 사용한 다국어 지원을 계획 중입니다.

```jsx
import { useTranslation } from 'react-i18next';

const Component = () => {
  const { t } = useTranslation();
  
  return <h1>{t('welcome.title')}</h1>;
};
```

## 📚 추가 자료

- [React 공식 문서](https://react.dev/)
- [React Router 문서](https://reactrouter.com/)
- [Tailwind CSS 문서](https://tailwindcss.com/)
- [Axios 문서](https://axios-http.com/)
- [Kakao Maps API](https://apis.map.kakao.com/)

## 🤝 기여 가이드

1. ESLint 규칙을 준수해주세요
2. 컴포넌트는 함수형으로 작성해주세요
3. PropTypes 또는 TypeScript를 사용해주세요
4. 재사용 가능한 컴포넌트는 `components/` 폴더에 작성해주세요
5. 페이지 컴포넌트는 `pages/` 폴더에 작성해주세요

---

문의사항이 있으시면 이슈를 등록해주세요.
