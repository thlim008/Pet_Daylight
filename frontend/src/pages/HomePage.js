import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    navigate('/login');
  }, [navigate]);

  const loadUser = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
    } catch (err) {
      console.error('유저 정보 로드 실패:', err);
      handleLogout();
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    const initAuth = async () => {
      // URL에서 토큰 추출
      const params = new URLSearchParams(location.search);
      const access = params.get('access');
      const refresh = params.get('refresh');

      console.log('🔍 URL 파라미터 확인:', { access, refresh }); // 디버깅

      if (access && refresh) {
        console.log('✅ 소셜 로그인 토큰 발견!');
        
        // 토큰 저장
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        
        // URL 파라미터 제거 (깨끗한 URL로)
        window.history.replaceState({}, document.title, '/');
        
        // 사용자 정보 로드
        await loadUser();
      } else {
        // 기존 토큰 확인
        const token = localStorage.getItem('access_token');
        console.log('🔍 로컬스토리지 토큰:', token ? '있음' : '없음');
        
        if (token) {
          await loadUser();
        } else {
          console.log('❌ 토큰 없음, 로그인 페이지로 이동');
          setLoading(false);
          navigate('/login');
        }
      }
    };

    initAuth();
  }, [location.search, navigate, loadUser]); // location.search 추가!

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <span className="text-white text-lg font-bold">P</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">Pet Daylight</span>
            </div>

            <div className="flex items-center space-x-4">
              {user && (
                <span className="text-sm text-gray-600 font-medium">{user.username}님</span>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            실종된 반려동물을<br />함께 찾아요
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            우리 동네 실종 제보를 확인하고, 커뮤니티와 함께 소중한 가족을 찾아주세요
          </p>
          <div className="flex items-center justify-center space-x-4">
            <button className="px-8 py-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all">
              제보 등록하기
            </button>
            <button className="px-8 py-4 bg-white border border-gray-200 text-gray-900 rounded-xl font-medium hover:border-gray-300 transition-all">
              주변 제보 보기
            </button>
          </div>
        </div>
      </section>

      {/* Welcome Card */}
      {user && (
        <section className="py-20 px-6 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-12 text-center border border-amber-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                환영합니다, {user.username}님 🎉
              </h2>
              <p className="text-lg text-gray-600 mb-2">
                {user.email || '이메일 정보 없음'}
              </p>
              <div className="mt-8 inline-flex items-center space-x-2 text-sm text-gray-600">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>소셜 로그인 성공! API 연결 완료</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default HomePage;