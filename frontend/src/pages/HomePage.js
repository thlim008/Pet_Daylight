import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import NotificationDropdown from '../components/NotificationDropdown';

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('features');

  const handleLogout = useCallback(() => {
    localStorage.clear();
    navigate('/login');
  }, [navigate]);

  const loadUser = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      console.log('👤 사용자 정보:', response.data);
    } catch (err) {
      console.error('유저 정보 로드 실패:', err);
      handleLogout();
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    const initAuth = async () => {
      const params = new URLSearchParams(location.search);
      const access = params.get('access');
      const refresh = params.get('refresh');

      console.log('🔍 URL 파라미터 확인:', { access: access ? '있음' : '없음', refresh: refresh ? '있음' : '없음' });

      if (access && refresh) {
        console.log('✅ 소셜 로그인 토큰 발견!');
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        window.history.replaceState({}, document.title, '/');
        await loadUser();
      } else {
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
  }, [location.search, navigate, loadUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 로고 + 타이틀 */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img 
                src="/logo.png" 
                alt="Pet Daylight" 
                className="w-10 h-10 sm:w-16 sm:h-16 object-contain drop-shadow-md"
                onError={(e) => {
                  console.error('헤더 로고 로드 실패');
                  e.target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md';
                  fallback.innerHTML = '<span class="text-3xl">🌞</span>';
                  e.target.parentElement.appendChild(fallback);
                }}
              />
              <div className="hidden sm:block border-l-2 border-gray-200 pl-4">
                <span className="text-sm sm:text-xl font-bold text-gray-900">Pet Daylight</span>
                <p className="text-xs text-gray-500">실종 반려동물 찾기</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <NotificationDropdown />
              {user && (
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => navigate('/profile')}
                    className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                  >
                    {user.display_image ? (
                      <img 
                        src={user.display_image} 
                        alt="프로필" 
                        className="w-8 h-8 rounded-full border-2 border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-600 text-sm">👤</span>
                      </div>
                    )}
                    <span className="hidden sm:inline text-sm text-gray-700 font-medium">
                      {user.display_name}님
                    </span>
                  </button>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - 베이지 배경 */}
      <section className="py-20 px-6 bg-[#F5F1E8]">
        <div className="max-w-4xl mx-auto text-center">
          {/* 큰 로고 */}
          <div className="flex justify-center mb-8">
            <img 
              src="/logo.png" 
              alt="Pet Daylight" 
              className="w-32 h-32 object-contain drop-shadow-2xl"
              onError={(e) => {
                console.error('Hero 로고 로드 실패');
                e.target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'w-32 h-32 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl';
                fallback.innerHTML = '<span class="text-6xl">🌞</span>';
                e.target.parentElement.appendChild(fallback);
              }}
            />
          </div>
                  
          {/* 제목 */}
          <h1 className="text-6xl font-bold mb-6 leading-tight text-gray-900">
            실종된 반려동물을<br />함께 찾아요
          </h1>
                  
          <p className="text-xl text-gray-700 mb-12">
            우리 동네 실종 제보를 확인하고, 커뮤니티와 함께 소중한 가족을 찾아주세요
          </p>
                  
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/missing-pets/create')}
              className="px-8 py-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
            >
              제보 등록하기
            </button>
            <button 
              onClick={() => navigate('/missing-pets')}
              className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-medium hover:border-gray-300 hover:shadow-md transition-all"
            >
              주변 제보 보기
            </button>
            <button 
              onClick={() => navigate('/missing-pets/map')}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <span>🗺️</span>
              <span>지도로 보기</span>
            </button>
          </div>
        </div>
      </section>

      {/* 탭 섹션 */}
      <section className="py-20 px-6 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          {/* 탭 버튼 */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('features')}
                className={`px-8 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'features'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                서비스 소개
              </button>
              {user && (
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-8 py-3 rounded-lg font-medium transition-all ${
                    activeTab === 'profile'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  내 정보
                </button>
              )}
            </div>
          </div>

          {/* 탭 컨텐츠 */}
          {activeTab === 'features' && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
                Pet Daylight와 함께하세요
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div 
                  onClick={() => navigate('/missing-pets')}
                  className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    실종 제보
                  </h3>
                  <p className="text-gray-600">
                    실종된 반려동물 정보를  
                  </p>
                  <p className="text-gray-600">
                    등록하고 주변 사람들과
                  </p>
                  <p className="text-gray-600">
                    공유하세요
                  </p>
                </div>

                <div 
                  onClick={() => navigate('/communities')}
                  className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">💬</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    커뮤니티
                  </h3>
                  <p className="text-gray-600">
                    반려동물 관련 정보와 경험을 나누는 따뜻한 커뮤니티
                  </p>
                </div>

                <div 
                  onClick={() => navigate('/dashboard')}
                  className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">🐾</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    내 펫 관리
                  </h3>
                  <p className="text-gray-600">
                    우리 가족 반려동물의 건강과 
                  </p>
                  <p className="text-gray-600">
                    생애주기를 관리하세요
                  </p>
                </div>

                {/* 🏥 새로 추가: 병원/미용 찾기 */}
                <div 
                  onClick={() => navigate('/hospitals')}
                  className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-2xl">🏥</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    병원/미용 찾기
                  </h3>
                  <p className="text-gray-600">
                    주변 동물병원과 애견미용실을 찾고 리뷰를 확인하세요
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && user && (
            <div className="animate-fade-in max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-12 border border-amber-100 shadow-sm">
                <div className="text-center mb-8">
                  {user.display_image ? (
                    <img 
                      src={user.display_image} 
                      alt="프로필" 
                      className="w-24 h-24 rounded-full mx-auto mb-6 border-4 border-white shadow-lg object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full mx-auto mb-6 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-white shadow-lg">
                      <span className="text-4xl">👤</span>
                    </div>
                  )}
                  
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    환영합니다, {user.display_name}님 🎉
                  </h2>
                  
                  <p className="text-lg text-gray-600 mb-2">
                    {user.email}
                  </p>
                  
                  {user.nickname && user.nickname !== user.username && (
                    <p className="text-sm text-gray-500 mb-4">
                      닉네임: {user.nickname}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">아이디</p>
                    <p className="font-semibold text-gray-900">{user.username}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">가입일</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-1">알림</p>
                    <p className="font-semibold text-gray-900">
                      {user.notification_enabled ? '활성화' : '비활성화'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src="/logo.png" 
              alt="Pet Daylight" 
              className="w-10 h-10 object-contain drop-shadow-md"
              onError={(e) => {
                console.error('Footer 로고 로드 실패');
                e.target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center';
                fallback.innerHTML = '<span class="text-xl">🌞</span>';
                e.target.parentElement.appendChild(fallback);
              }}
            />
            <span className="text-xl font-semibold">Pet Daylight</span>
          </div>
          <p className="text-gray-400 text-sm">
            어둠 속의 제보부터 일상의 기록까지
          </p>
          <p className="text-gray-500 text-xs mt-4">
            © 2025 Pet Daylight. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;