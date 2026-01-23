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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      const params = new URLSearchParams(location.search);
      const access = params.get('access');
      const refresh = params.get('refresh');


      if (access && refresh) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        window.history.replaceState({}, document.title, '/');
        await loadUser();
      } else {
        const token = localStorage.getItem('access_token');

        if (token) {
          await loadUser();
        } else {
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
          <p className="text-sm sm:text-base text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 모바일 최적화 헤더 */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* 로고 + 타이틀 */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img
                src="/logo.png"
                alt="Pet Daylight"
                className="w-10 h-10 sm:w-14 sm:h-14 object-contain drop-shadow-md"
                onError={(e) => {
                  console.error('헤더 로고 로드 실패');
                  e.target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md';
                  fallback.innerHTML = '<span class="text-2xl sm:text-3xl">🌞</span>';
                  e.target.parentElement.appendChild(fallback);
                }}
              />
              <div className="border-l-2 border-gray-200 pl-2 sm:pl-4">
                <span className="text-sm sm:text-xl font-bold text-gray-900 block">Pet Daylight</span>
                <p className="text-xs text-gray-500 hidden sm:block">실종 반려동물 찾기</p>
              </div>
            </div>

            {/* 데스크톱 메뉴 */}
            <div className="hidden md:flex items-center space-x-3">
              <NotificationDropdown />
              {user && (
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
                  <span className="text-sm text-gray-700 font-medium">
                    {user.display_name}님
                  </span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
              >
                로그아웃
              </button>
            </div>

            {/* 모바일 메뉴 */}
            <div className="flex md:hidden items-center space-x-2">
              <NotificationDropdown />
              {user && (
                <button
                  onClick={() => navigate('/profile')}
                  className="hover:opacity-80 transition-opacity"
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
                </button>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="메뉴"
              >
                <svg
                  className="w-6 h-6 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* 모바일 드롭다운 메뉴 */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-gray-200 space-y-2">
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section - 베이지 배경 */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-[#F5F1E8]">
        <div className="max-w-4xl mx-auto text-center">
          {/* 큰 로고 */}
          <div className="flex justify-center mb-8">
            <img
              src="/logo.png"
              alt="Pet Daylight"
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain drop-shadow-2xl"
              onError={(e) => {
                console.error('Hero 로고 로드 실패');
                e.target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl';
                fallback.innerHTML = '<span class="text-4xl sm:text-5xl md:text-6xl">🌞</span>';
                e.target.parentElement.appendChild(fallback);
              }}
            />
          </div>

          {/* 제목 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight text-gray-900">
            실종된 반려동물을<br />함께 찾아요
          </h1>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 mb-8 sm:mb-10 md:mb-12 px-4">
            우리 동네 실종 제보를 확인하고, 커뮤니티와 함께 소중한 가족을 찾아주세요
          </p>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/missing-pets/create')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white rounded-xl text-sm sm:text-base font-medium hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
            >
              제보 등록하기
            </button>
            <button
              onClick={() => navigate('/missing-pets')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl text-sm sm:text-base font-medium hover:border-gray-300 hover:shadow-md transition-all"
            >
              주변 제보 보기
            </button>
            <button
              onClick={() => navigate('/missing-pets/map')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-xl text-sm sm:text-base font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <span>🗺️</span>
              <span>지도로 보기</span>
            </button>
          </div>
        </div>
      </section>

      {/* 탭 섹션 */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          {/* 탭 버튼 */}
          <div className="flex justify-center mb-8 sm:mb-12 overflow-x-auto">
            <div className="inline-flex bg-gray-100 rounded-xl p-1 min-w-max">
              <button
                onClick={() => setActiveTab('features')}
                className={`px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base whitespace-nowrap ${
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
                  className={`px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base whitespace-nowrap ${
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
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-12">
                Pet Daylight와 함께하세요
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 md:gap-8">
                {/* 실종 제보 카드 */}
                <div
                  onClick={() => navigate('/missing-pets')}
                  className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer h-full min-h-[200px] flex flex-col"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                    <span className="text-xl sm:text-2xl">🔍</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    실종 제보
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 flex-grow">
                    실종 정보를 등록하고 공유하세요
                  </p>
                </div>

                {/* 커뮤니티 카드 */}
                <div
                  onClick={() => navigate('/communities')}
                  className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer h-full min-h-[200px] flex flex-col"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                    <span className="text-xl sm:text-2xl">💬</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    커뮤니티
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 flex-grow">
                    반려동물 관련 정보와 경험을 나누는 따뜻한 커뮤니티
                  </p>
                </div>

                {/* 내 펫 관리 카드 */}
                <div
                  onClick={() => navigate('/dashboard')}
                  className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer h-full min-h-[200px] flex flex-col"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                    <span className="text-xl sm:text-2xl">🐾</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    내 펫 관리
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 flex-grow">
                    반려동물의 건강과 생애주기를 관리하세요
                  </p>
                </div>

                {/* 병원/미용 찾기 카드 */}
                <div
                  onClick={() => navigate('/hospitals')}
                  className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer h-full min-h-[200px] flex flex-col"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                    <span className="text-xl sm:text-2xl">🏥</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    병원/미용 찾기
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 flex-grow">
		    주변 병원과 미용실을 찾고 리뷰를 확인하세요
                  </p>
                </div>

                {/* AI 증상 체커 카드 */}
                <div
                  onClick={() => navigate('/symptom-checker')}
                  className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer h-full min-h-[200px] flex flex-col"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                    <span className="text-xl sm:text-2xl">🩺</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    AI 증상 체커
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 flex-grow">
                    반려동물 증상을 AI와 상담하고 조언을 받아보세요
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 bg-amber-100 text-green-700 text-xs rounded-full w-fit">
                    BETA
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && user && (
            <div className="animate-fade-in max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 border border-amber-100 shadow-sm">
                <div className="text-center mb-8">
                  {user.display_image ? (
                    <img
                      src={user.display_image}
                      alt="프로필"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto mb-4 sm:mb-6 border-4 border-white shadow-lg object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-4 border-white shadow-lg">
                      <span className="text-3xl sm:text-4xl">👤</span>
                    </div>
                  )}

                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                    환영합니다, {user.display_name}님 🎉
                  </h2>

                  <p className="text-base sm:text-lg text-gray-600 mb-2">
                    {user.email}
                  </p>

                  {user.nickname && user.nickname !== user.username && (
                    <p className="text-sm text-gray-500 mb-4">
                      닉네임: {user.nickname}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">아이디</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">{user.username}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">가입일</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">알림</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">
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
      <footer className="bg-gray-900 text-white py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <img
              src="/logo.png"
              alt="Pet Daylight"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md"
              onError={(e) => {
                console.error('Footer 로고 로드 실패');
                e.target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center';
                fallback.innerHTML = '<span class="text-lg sm:text-xl">🌞</span>';
                e.target.parentElement.appendChild(fallback);
              }}
            />
            <span className="text-lg sm:text-xl font-semibold">Pet Daylight</span>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm">
            어둠 속의 제보부터 일상의 기록까지
          </p>
          <p className="text-gray-500 text-xs mt-3 sm:mt-4">
            © 2025 Pet Daylight. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
