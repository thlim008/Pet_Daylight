import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function CommunityListPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popularPosts, setPopularPosts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    free: 0,
    found_story: 0,
    rescue_story: 0,
    tips: 0,
    lifecycle: 0,
  });

  // localStorage에서 필터 복원
  const getInitialFilters = () => {
    try {
      const savedFilters = localStorage.getItem('communityFilters');
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (err) {
      console.error('필터 복원 실패:', err);
    }
    // 기본값
    return {
      category: '',
      search: '',
    };
  };

  const [filters, setFilters] = useState(getInitialFilters);

  // 필터가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('communityFilters', JSON.stringify(filters));
      console.log('✅ 커뮤니티 필터 저장됨:', filters);
    } catch (err) {
      console.error('❌ 필터 저장 실패:', err);
    }
  }, [filters]);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      
      const response = await API.get('/communities/', { params });
      
      console.log('✅ API 응답:', response.data);
      
      if (response.data.results) {
        setPosts(response.data.results);
      } else if (Array.isArray(response.data)) {
        setPosts(response.data);
      } else {
        console.error('예상치 못한 응답 형식:', response.data);
        setPosts([]);
      }
    } catch (err) {
      console.error('❌ 게시글 로드 실패:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadPopularPosts = useCallback(async () => {
    try {
      const response = await API.get('/communities/popular/');
      if (Array.isArray(response.data)) {
        setPopularPosts(response.data.slice(0, 5));
      }
    } catch (err) {
      console.error('❌ 인기 게시글 로드 실패:', err);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await API.get('/communities/');
      const allPosts = response.data.results || response.data;
      
      const categoryCount = allPosts.reduce((acc, post) => {
        acc[post.category] = (acc[post.category] || 0) + 1;
        return acc;
      }, {});
      
      setStats({
        total: allPosts.length,
        ...categoryCount,
      });
    } catch (err) {
      console.error('❌ 통계 로드 실패:', err);
    }
  }, []);

  useEffect(() => {
    loadPosts();
    loadPopularPosts();
    loadStats();
  }, [loadPosts, loadPopularPosts, loadStats]);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  // 필터 초기화
  const handleResetFilters = () => {
    const defaultFilters = {
      category: '',
      search: '',
    };
    setFilters(defaultFilters);
    localStorage.removeItem('communityFilters');
  };

  // 썸네일 가져오기
  const getThumbnail = (post) => {
    // 1. thumbnail 필드가 있으면 사용
    if (post.thumbnail) {
      // /media/로 시작하면 full URL로 변환
      if (post.thumbnail.startsWith('/media/')) {
        return `https://petdaylight.mooo.com${post.thumbnail}`;
      }
      return post.thumbnail;
    }
    
    // 2. images 배열의 첫 번째 이미지 사용
    if (post.images && Array.isArray(post.images) && post.images.length > 0) {
      const firstImage = post.images[0];
      // /media/로 시작하면 full URL로 변환
      if (firstImage.startsWith('/media/')) {
        return `https://petdaylight.mooo.com${firstImage}`;
      }
      return firstImage;
    }
    
    return null;
  };

  const getCategoryBadge = (category) => {
    const badges = {
      'free': { bg: 'bg-red-100', text: 'text-red-700', label: '자유게시판', emoji: '🔍' },
      'found_story': { bg: 'bg-blue-100', text: 'text-blue-700', label: '발견 후기', emoji: '✅' },
      'rescue_story': { bg: 'bg-green-100', text: 'text-green-700', label: '구조 경험담', emoji: '🏥' },
      'tips': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '꿀팁 공유', emoji: '💡' },
      'lifecycle': { bg: 'bg-purple-100', text: 'text-purple-700', label: '생애주기 경험', emoji: '🐾' },
    };
    
    const badge = badges[category] || badges['tips'];
    
    return (
      <span className={`px-2 sm:px-3 py-1 ${badge.bg} ${badge.text} rounded-full text-xs sm:text-sm font-medium inline-flex items-center space-x-1`}>
        <span>{badge.emoji}</span>
        <span>{badge.label}</span>
      </span>
    );
  };

  const categories = [
    { value: 'free', emoji: '🔍', label: '자유게시판', color: 'red' },
    { value: 'found_story', emoji: '✅', label: '발견 후기', color: 'blue' },
    { value: 'rescue_story', emoji: '🏥', label: '구조 경험담', color: 'green' },
    { value: 'tips', emoji: '💡', label: '꿀팁 공유', color: 'yellow' },
    { value: 'lifecycle', emoji: '🐾', label: '생애주기', color: 'purple' },
  ];

  // 활성화된 필터 개수 계산
  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <img 
                src="/logo.png" 
                alt="Pet Daylight" 
                className="w-8 h-8 sm:w-12 sm:h-12 object-contain drop-shadow-md"
                onError={(e) => {
                  console.error('헤더 로고 로드 실패');
                  e.target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md';
                  fallback.innerHTML = '<span class="text-white text-lg sm:text-2xl font-bold">🌞</span>';
                  e.target.parentElement.appendChild(fallback);
                }}
              />
              <div className="hidden sm:block">
                <span className="text-lg font-bold text-gray-900">Pet Daylight</span>
                <p className="text-xs text-gray-500">커뮤니티</p>
              </div>
            </button>

            {/* 모바일: 아이콘 버튼들 */}
            <div className="flex sm:hidden items-center gap-1.5">
              <button
                onClick={() => navigate('/communities/create')}
                className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-all whitespace-nowrap"
              >
                + 글쓰기
              </button>

              <button
                onClick={() => navigate('/profile')}
                className="p-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>

            {/* 데스크톱: 일반 버튼들 */}
            <div className="hidden sm:flex items-center gap-4">
              <button
                onClick={() => navigate('/communities/create')}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-md"
              >
                + 글쓰기
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
              >
                프로필
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 필터 섹션 */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-700">
              필터 {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                  {activeFiltersCount}개 적용중
                </span>
              )}
            </h2>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 underline"
              >
                필터 초기화
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* 검색 */}
            <input
              type="text"
              placeholder="검색어를 입력하세요..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
            />

            {/* 카테고리 */}
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
            >
              <option value="">전체 카테고리</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 게시글 목록 */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                전체 게시글
              </h2>
              <span className="text-xs sm:text-sm text-gray-500">
                총 {posts.length}개
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 sm:py-20 bg-white rounded-2xl border border-gray-200">
                <div className="text-4xl sm:text-6xl mb-4">📝</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">게시글이 없습니다</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-6">
                  {activeFiltersCount > 0 ? '다른 필터로 검색해보세요' : '첫 번째 게시글을 작성해보세요'}
                </p>
                {activeFiltersCount > 0 ? (
                  <button
                    onClick={handleResetFilters}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all"
                  >
                    필터 초기화
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/communities/create')}
                    className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all"
                  >
                    글쓰기
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {posts.map((post) => {
                  const thumbnail = getThumbnail(post);
                  
                  return (
                    <div
                      key={post.id}
                      onClick={() => navigate(`/communities/${post.id}`)}
                      className="bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                              {getCategoryBadge(post.category)}
                            </div>
                            <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-2 hover:text-amber-600 transition-colors line-clamp-2">
                              {post.title}
                            </h3>
                          </div>
                          
                          {/* 썸네일 */}
                          {thumbnail && (
                            <div className="ml-3 sm:ml-4 flex-shrink-0">
                              <img
                                src={thumbnail}
                                alt={post.title}
                                className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg sm:rounded-xl object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                            {post.user.profile_image ? (
                              <img
                                src={post.user.profile_image}
                                alt={post.user.username}
                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <span className="text-gray-600 text-xs sm:text-sm">👤</span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{post.user.username}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(post.created_at).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-gray-500 flex-shrink-0">
                            <span className="flex items-center space-x-1">
                              <span>👁️</span>
                              <span className="hidden sm:inline">{post.views}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <span>❤️</span>
                              <span>{post.likes}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <span>💬</span>
                              <span>{post.comment_count || 0}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 오른쪽: 사이드바 (데스크톱만) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* 인기 게시글 */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🔥</span>
                  인기 게시글
                </h3>
                <div className="space-y-3">
                  {popularPosts.length > 0 ? (
                    popularPosts.map((post, index) => (
                      <div
                        key={post.id}
                        onClick={() => navigate(`/communities/${post.id}`)}
                        className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                      >
                        <span className="text-lg font-bold text-gray-400">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {post.title}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                            <span>❤️ {post.likes}</span>
                            <span>💬 {post.comment_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      인기 게시글이 없습니다
                    </p>
                  )}
                </div>
              </div>

              {/* 통계 */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📊</span>
                  커뮤니티 현황
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">전체 게시글</span>
                    <span className="text-lg font-bold text-gray-900">{stats.total}</span>
                  </div>
                  <div className="border-t border-amber-200 pt-3 space-y-2">
                    {categories.map((cat) => (
                      <div key={cat.value} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {cat.emoji} {cat.label}
                        </span>
                        <span className="font-medium text-gray-900">
                          {stats[cat.value] || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 글쓰기 CTA */}
              <div className="bg-gray-900 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">✨</div>
                <h3 className="text-lg font-bold text-white mb-2">
                  이야기를 들려주세요
                </h3>
                <p className="text-sm text-gray-300 mb-4">
                  소중한 경험을 공유해보세요
                </p>
                <button
                  onClick={() => navigate('/communities/create')}
                  className="w-full px-6 py-3 bg-white text-gray-900 rounded-xl font-medium hover:bg-gray-100 transition-all"
                >
                  글쓰기
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CommunityListPage;
