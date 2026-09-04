import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
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
import HospitalMapPage from './pages/Hospitalmappage';

import PetDashboard from './pages/PetDashboard';
import PetFormPage from './pages/PetFormPage';
import PetVisitListPage from './pages/PetVisitListPage';
import PetVaccinationPage from './pages/PetVaccinationPage';
import PetHealthPage from './pages/PetHealthPage';
import PetAlbumPage from './pages/PetAlbumPage';
import PetVisitCreatePage from './pages/PetVisitCreatePage';


import SymptomCheckerPage from './pages/SymptomCheckerPage';
// PrivateRoute 컴포넌트를 Router 내부에서 사용하도록 수정
function PrivateRoute({ children }) {
  const location = useLocation();
  
  const isAuthenticated = () => {
    return localStorage.getItem('access_token') !== null;
  };

  const hasUrlToken = location.search.includes('access=');

  if (isAuthenticated() || hasUrlToken) {
    return children;
  }
  
  return <Navigate to="/login" state={{ from: location }} replace />;
}

function App() {
  useEffect(() => {
    // 카카오톡 공유 SDK 초기화
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init('910c2b43257b52df8c83def11d511b95');
    }
  }, []);

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
          path="/dashboard"
          element={
            <PrivateRoute>
              <PetDashboard />
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

        {/* 관리자 페이지 */}
        <Route
          path="/admin-panel"
          element={
            <PrivateRoute>
              <AdminPage />
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
          element={<MissingPetDetailPage />}
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
        <Route
          path="/lifecycles"
          element={
            <PrivateRoute>
              <LifecyclePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/lifecycles/guides/:id"
          element={
            <PrivateRoute>
              <LifecycleDetailPage />
            </PrivateRoute>
          }
        />

        {/* 펫 관리 */}
        <Route
          path="/lifecycles/pets"
          element={
            <PrivateRoute>
              <PetListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/lifecycles/pets/new"
          element={
            <PrivateRoute>
              <PetFormPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/lifecycles/pets/:id/edit"
          element={
            <PrivateRoute>
              <PetFormPage />
            </PrivateRoute>
          }
        />
	{/* AI 증상 체커 */}
        <Route
          path="/symptom-checker"
          element={
            <PrivateRoute>
              <SymptomCheckerPage />
            </PrivateRoute>
          }
        />
        {/* 진료 기록 라우트 */}
        <Route
          path="/pets/:petId/visits"
          element={
            <PrivateRoute>
              <PetVisitListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/pets/:petId/visits/new"
          element={
            <PrivateRoute>
              <PetVisitCreatePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/pets/:petId/visits/:visitId/edit"
          element={
            <PrivateRoute>
              <PetVisitCreatePage />
            </PrivateRoute>
          }
        />

        {/* 예방접종 라우트 */}
        <Route
          path="/pets/:petId/vaccinations"
          element={
            <PrivateRoute>
              <PetVaccinationPage />
            </PrivateRoute>
          }
        />

        {/* 건강기록 라우트 */}
        <Route
          path="/pets/:petId/health"
          element={
            <PrivateRoute>
              <PetHealthPage />
            </PrivateRoute>
          }
        />

        {/* 앨범 라우트 */}
        <Route
          path="/pets/:petId/album"
          element={
            <PrivateRoute>
              <PetAlbumPage />
            </PrivateRoute>
          }
        />

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
          path="/hospitals/:id/reviews/:reviewId/edit"
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
