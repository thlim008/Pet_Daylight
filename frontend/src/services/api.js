import axios from 'axios';

// 백엔드 API URL
const API_BASE_URL = 'http://localhost:8000/api';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그아웃
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API 함수들
export const authAPI = {
  // 회원가입
  register: (data) => api.post('/accounts/', data),
  
  // 로그인
  login: (data) => api.post('/accounts/login/', data),
  
  // 내 정보 조회
  getMe: () => api.get('/accounts/me/'),
  
  // 위치 업데이트
  updateLocation: (data) => api.patch('/accounts/update_location/', data),
};

export const missingPetAPI = {
  // 목록 조회
  getList: (params) => api.get('/missing-pets/', { params }),
  
  // 상세 조회
  getDetail: (id) => api.get(`/missing-pets/${id}/`),
  
  // 제보 등록
  create: (data) => api.post('/missing-pets/', data),
  
  // 내 제보 목록
  getMyReports: () => api.get('/missing-pets/my_reports/'),
  
  // 내 주변 제보
  getNearby: (distance) => api.get('/missing-pets/nearby/', { params: { distance } }),
};

export const communityAPI = {
  // 목록 조회
  getList: (params) => api.get('/communities/', { params }),
  
  // 상세 조회
  getDetail: (id) => api.get(`/communities/${id}/`),
  
  // 게시글 작성
  create: (data) => api.post('/communities/', data),
  
  // 좋아요
  like: (id) => api.post(`/communities/${id}/like/`),
};

export default api;