import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import MissingPetListPage from './pages/MissingPetListPage';
import MissingPetCreatePage from './pages/MissingPetCreatePage';
import MissingPetDetailPage from './pages/MissingPetDetailPage';
import MissingPetEditPage from './pages/MissingPetEditPage';
import MissingPetMapPage from './pages/MissingPetMapPage';
import CommunityListPage from './pages/CommunityListPage';
import CommunityDetailPage from './pages/CommunityDetailPage';
import CommunityCreatePage from './pages/CommunityCreatePage';
import CommunityEditPage from './pages/CommunityEditPage';
import LifecyclePage from './pages/LifecyclePage';
import LifecycleDetailPage from './pages/LifecycleDetailPage';
import PetListPage from './pages/PetListPage';
import KakaoChannelButton from './components/KakaoChannelButton';
import NotificationPage from './pages/NotificationPage';
import PasswordResetRequestPage from './pages/PasswordResetRequestPage';
import PasswordResetConfirmPage from './pages/PasswordResetConfirmPage';

// 병원 관련 페이지
import HospitalListPage from './pages/HospitalListPage';
import HospitalDetailPage from './pages/HospitalDetailPage';
import HospitalReviewCreatePage from './pages/HospitalReviewCreatePage';
import HospitalMapPage from './pages/Hospitalmappage'; // 실제 파일명에 맞춤

function App() {
  useEffect(() => {
    // 카카오톡 공유 SDK 초기화
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init('910c2b43257b52df8c83def11d511b95');
      console.log('✅ 카카오 SDK 초기화:', window.Kakao.isInitialized());
    }
  }, []);

  const isAuthenticated = () => {
    return localStorage.getItem('access_token') !== null;
  };

  const PrivateRoute = ({ children }) => {
    const hasUrlToken = window.location.search.includes('access=');
    
    if (isAuthenticated() || hasUrlToken) {
      return children;
    }
    return <Navigate to="/login" replace />;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/password-reset" element={<PasswordResetRequestPage />} />
        <Route path="/password-reset/confirm/:uid/:token" element={<PasswordResetConfirmPage />} />
        
        {/* 보호된 라우트 */}
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          } 
        />
        
        {/* 실종 제보 라우트 */}
        <Route 
          path="/missing-pets" 
          element={
            <PrivateRoute>
              <MissingPetListPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/missing-pets/map"
          element={
            <PrivateRoute>
              <MissingPetMapPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/missing-pets/create" 
          element={
            <PrivateRoute>
              <MissingPetCreatePage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/missing-pets/:id" 
          element={
            <PrivateRoute>
              <MissingPetDetailPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/missing-pets/:id/edit" 
          element={
            <PrivateRoute>
              <MissingPetEditPage />
            </PrivateRoute>
          } 
        />

        {/* 커뮤니티 라우트 */}
        <Route path="/communities" element={<CommunityListPage />} />
        <Route path="/communities/:id" element={<CommunityDetailPage />} />
        <Route path="/communities/create" element={<CommunityCreatePage />} />
        <Route path="/communities/:id/edit" element={<CommunityEditPage />} />

        {/* 생애주기 라우트 */}
        <Route path="/lifecycles" element={<LifecyclePage />} />
        <Route path="/lifecycles/guides/:id" element={<LifecycleDetailPage />} />
        <Route path="/lifecycles/pets" element={<PetListPage />} />
        
        {/* 알림 라우트 */}
        <Route path="/notifications" element={<NotificationPage />} />

        {/* 병원/미용 라우트 */}
        <Route 
          path="/hospitals/map" 
          element={
            <PrivateRoute>
              <HospitalMapPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/hospitals/:id/reviews/create" 
          element={
            <PrivateRoute>
              <HospitalReviewCreatePage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/hospitals/:id" 
          element={
            <PrivateRoute>
              <HospitalDetailPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/hospitals" 
          element={
            <PrivateRoute>
              <HospitalListPage />
            </PrivateRoute>
          } 
        />
        
        {/* 잘못된 경로 접근 시 홈으로 이동 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* 카카오톡 버튼 */}
      <KakaoChannelButton />
    </BrowserRouter>
  );
}

export default App;