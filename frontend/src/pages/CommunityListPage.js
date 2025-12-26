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
    missing_story: 0,
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
        return `http://localhost:8000${post.thumbnail}`;
      }
      return post.thumbnail;
    }
    
    // 2. images 배열의 첫 번째 이미지 사용
    if (post.images && Array.isArray(post.images) && post.images.length > 0) {
      const firstImage = post.images[0];
      // /media/로 시작하면 full URL로 변환
      if (firstImage.startsWith('/media/')) {
        return `http://localhost:8000${firstImage}`;
      }
      return firstImage;
    }
    
    return null;
  };

  const getCategoryBadge = (category) => {
    const badges = {
      'missing_story': { bg: 'bg-red-100', text: 'text-red-700', label: '실종 후기', emoji: '🔍' },
      'found_story': { bg: 'bg-blue-100', text: 'text-blue-700', label: '발견 후기', emoji: '✅' },
      'rescue_story': { bg: 'bg-green-100', text: 'text-green-700', label: '구조 경험담', emoji: '🏥' },
      'tips': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '꿀팁 공유', emoji: '💡' },
      'lifecycle': { bg: 'bg-purple-100', text: 'text-purple-700', label: '생애주기 경험', emoji: '🐾' },
    };
    
    const badge = badges[category] || badges['tips'];
    
    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} rounded-full text-sm font-medium inline-flex items-center space-x-1`}>
        <span>{badge.emoji}</span>
        <span>{badge.label}</span>
      </span>
    );
  };

  const categories = [
    { value: 'missing_story', emoji: '🔍', label: '실종 후기', color: 'red' },
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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button onClick={() => navigate('/')} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <img 
                  src="/logo.png" 
                  alt="Pet Daylight" 
                  className="w-14 h-14 object-contain drop-shadow-md"
                  onError={(e) => {
                    console.error('헤더 로고 로드 실패');
                    e.target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md';
                    fallback.innerHTML = '<span class="text-white text-2xl font-bold">🌞</span>';
                    e.target.parentElement.appendChild(fallback);
                  }}
                />
                <div>
                  <span className="text-xl font-bold text-gray-900">Pet Daylight</span>
                  <p className="text-xs text-gray-500">커뮤니티</p>
                </div>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/communities/create')}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-md"
              >
                + 글쓰기
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                프로필
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero 배너 */}
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              🐾 Pet Daylight 커뮤니티
            </h1>
            <p className="text-lg text-gray-600">
              반려동물과의 소중한 순간을 공유하세요
            </p>
          </div>

          {/* 검색 & 필터 */}
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                필터 {activeFiltersCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                    {activeFiltersCount}개 적용중
                  </span>
                )}
              </h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  필터 초기화
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="검색어를 입력하세요..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all"
              />
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all"
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
        </div>
      </section>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽: 게시글 목록 */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {filters.category
                  ? categories.find(c => c.value === filters.category)?.label
                  : '전체 게시글'
                }
              </h2>
              <span className="text-sm text-gray-500">
                총 {posts.length}개
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">게시글이 없습니다</h3>
                <p className="text-gray-600 mb-6">
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
              <div className="space-y-4">
                {posts.map((post) => {
                  const thumbnail = getThumbnail(post);
                  
                  return (
                    <div
                      key={post.id}
                      onClick={() => navigate(`/communities/${post.id}`)}
                      className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {getCategoryBadge(post.category)}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-amber-600 transition-colors">
                              {post.title}
                            </h3>
                          </div>
                          
                          {/* 썸네일 또는 첫 번째 이미지 표시 */}
                          {thumbnail && (
                            <div className="ml-4 flex-shrink-0">
                              <img
                                src={thumbnail}
                                alt={post.title}
                                className="w-24 h-24 rounded-xl object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center space-x-3">
                            {post.user.profile_image ? (
                              <img
                                src={post.user.profile_image}
                                alt={post.user.username}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-600 text-sm">👤</span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{post.user.username}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(post.created_at).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <span>👁️</span>
                              <span>{post.views}</span>
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

          {/* 오른쪽: 사이드바 */}
          <div className="lg:col-span-1">
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