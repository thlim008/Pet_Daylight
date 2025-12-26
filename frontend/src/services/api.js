import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// 요청 인터셉터: 모든 요청에 토큰 추가
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터: 401 에러 시 자동 로그아웃
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==========================================
// 인증 API
// ==========================================
export const authAPI = {
  register: (data) => API.post('/accounts/', data),
  login: (data) => API.post('/accounts/login/', data),
  logout: (data) => API.post('/accounts/logout/', data),
  getMe: () => API.get('/accounts/me/'),
};

// ==========================================
// 실종 제보 API
// ==========================================
export const missingPetAPI = {
  // 목록 조회
  getAll: (params) => API.get('/missing-pets/', { params }),
  
  // 상세 조회
  getOne: (id) => API.get(`/missing-pets/${id}/`),
  
  // 생성
  create: (data) => API.post('/missing-pets/', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  
  // 수정
  update: (id, data) => API.patch(`/missing-pets/${id}/`, data),
  
  // 삭제
  delete: (id) => API.delete(`/missing-pets/${id}/`),
  
  // 내 제보 목록
  getMyPosts: () => API.get('/missing-pets/my_posts/'),
  
  // 상태 변경
  updateStatus: (id, status) => API.patch(`/missing-pets/${id}/update_status/`, { status }),
  
  // 이미지 추가
  addImages: (id, images) => {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image);
    });
    return API.post(`/missing-pets/${id}/add_images/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // 이미지 삭제
  deleteImage: (id, imageId) => API.delete(`/missing-pets/${id}/delete_image/`, {
    data: { image_id: imageId },
  }),
};

// ==========================================
// 댓글 API
// ==========================================
export const commentAPI = {
  // 댓글 목록 (제보별)
  getAll: (missingPetId) => API.get('/missing-pets/comments/', {
    params: { missing_pet: missingPetId },
  }),
  
  // 댓글 생성
  create: (data) => API.post('/missing-pets/comments/', data),
  
  // 댓글 수정
  update: (id, data) => API.patch(`/missing-pets/comments/${id}/`, data),
  
  // 댓글 삭제
  delete: (id) => API.delete(`/missing-pets/comments/${id}/`),
};

// ==========================================
// 커뮤니티 API (추후 구현)
// ==========================================
export const communityAPI = {
  getAll: (params) => API.get('/communities/', { params }),
  getOne: (id) => API.get(`/communities/${id}/`),
  create: (data) => API.post('/communities/', data),
  update: (id, data) => API.patch(`/communities/${id}/`, data),
  delete: (id) => API.delete(`/communities/${id}/`),
};

export default API;