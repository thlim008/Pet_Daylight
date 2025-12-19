import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';

function App() {
  // 인증 체크: 오직 저장된 토큰이 있는지만 확인합니다.
  const isAuthenticated = () => {
    return localStorage.getItem('access_token') !== null;
  };

  // 보호된 라우트 컴포넌트
  const PrivateRoute = ({ children }) => {
    // 현재 URL에 토큰이 들어오는 경우(소셜 로그인 직후)는 예외적으로 진입 허용
    const hasUrlToken = window.location.search.includes('access=');
    
    if (isAuthenticated() || hasUrlToken) {
      return children;
    }
    return <Navigate to="/login" replace />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          } 
        />
        {/* 잘못된 경로 접근 시 홈으로 이동 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;