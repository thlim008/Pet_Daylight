import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { authAPI } from '../services/api';

function MissingPetListPage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(null);

  const loadUserSettings = async () => {
    try {
      const response = await authAPI.getMe();
      setSearchRadius(response.data.notification_distance || 10000);
    } catch (err) {
      console.error('사용자 설정 로드 실패:', err);
      setSearchRadius(10000);
    }
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setUserLocation({ latitude: 36.3504, longitude: 127.3845 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
      },
      () => setUserLocation({ latitude: 36.3504, longitude: 127.3845 }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    loadUserSettings();
    getUserLocation();
  }, []);


  // localStorage에서 필터 복원
  const getInitialFilters = () => {
    try {
      const savedFilters = localStorage.getItem('missingPetFilters');
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (err) {
      console.error('필터 복원 실패:', err);
    }
    // 기본값
    return {
      category: '',
      species: '',
      status: '',
      search: '',
    };
  };

  const [filters, setFilters] = useState(getInitialFilters);
  const [filterOpen, setFilterOpen] = useState(false);

  // 필터가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('missingPetFilters', JSON.stringify(filters));
    } catch (err) {
      console.error('⛔ 필터 저장 실패:', err);
    }
  }, [filters]);

  const loadPetsRequestId = useRef(0);

  const loadPets = useCallback(async () => {
    const requestId = ++loadPetsRequestId.current;
    try {
      setLoading(true);
      const params = {};

      if (filters.category) params.category = filters.category;
      if (filters.species) params.species = filters.species;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (userLocation && searchRadius !== null) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
        params.radius = searchRadius;
      }

      const response = await API.get('/missing-pets/', { params });
      if (requestId !== loadPetsRequestId.current) return; // 최신 요청의 응답이 아니면 버림

      // 응답이 객체인 경우 (pagination)
      if (response.data.results) {
        setPets(response.data.results);
      }
      // 응답이 배열인 경우
      else if (Array.isArray(response.data)) {
        setPets(response.data);
      }
      // 그 외의 경우
      else {
        console.error('예상치 못한 응답 형식:', response.data);
        setPets([]);
      }
    } catch (err) {
      if (requestId !== loadPetsRequestId.current) return;
      console.error('⛔ 제보 로드 실패:', err);
      setPets([]);
    } finally {
      if (requestId === loadPetsRequestId.current) setLoading(false);
    }
  }, [filters, userLocation, searchRadius]);

  useEffect(() => {
    const timer = setTimeout(() => loadPets(), 400);
    return () => clearTimeout(timer);
  }, [loadPets]);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  // 필터 초기화
  const handleResetFilters = () => {
    const defaultFilters = {
      category: '',
      species: '',
      status: '',
      search: '',
    };
    setFilters(defaultFilters);
    localStorage.removeItem('missingPetFilters');
  };

  const getCategoryBadge = (category) => {
    if (category === 'missing') {
      return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">실종</span>;
    }
    if (category === 'rescue') {
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">구조</span>;
    }
    return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">발견</span>;
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">진행중</span>,
      'resolved': <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">해결됨</span>,
      'closed': <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">종료</span>,
    };
    return badges[status] || null;
  };

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
                <p className="text-xs text-gray-500">실종/발견 제보</p>
              </div>
            </button>

            {/* 모바일: 아이콘 버튼들 */}
            <div className="flex sm:hidden items-center gap-1.5">
              <button
                onClick={() => navigate('/missing-pets/map')}
                className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-all"
              >
                🗺️
              </button>

              <button
                onClick={() => navigate('/missing-pets/create')}
                className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-all whitespace-nowrap"
              >
                + 제보
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
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={() => navigate('/missing-pets/map')}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-all flex items-center gap-2"
              >
                <span>🗺️</span>
                <span>지도</span>
              </button>

              <button
                onClick={() => navigate('/missing-pets/create')}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-md"
              >
                + 제보 등록
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

      {/* 필터 */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="lg:hidden w-full flex items-center justify-between py-2 mb-2 font-medium text-gray-900"
          >
            <span>
              🔍 필터 {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                  {activeFiltersCount}개 적용중
                </span>
              )}
            </span>
            <span>{filterOpen ? '▲' : '▼'}</span>
          </button>

          <div className={`${filterOpen ? 'block' : 'hidden'} lg:block`}>
            <div className="hidden lg:flex items-center justify-between mb-4">
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
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  필터 초기화
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* 검색 */}
              <input
                type="text"
                placeholder="이름, 품종, 위치로 검색..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
              />

              {/* 구분 */}
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
              >
                <option value="">전체 (실종/발견/구조)</option>
                <option value="missing">실종</option>
                <option value="found">발견</option>
                <option value="rescue">구조</option>
              </select>

              {/* 종류 */}
              <select
                value={filters.species}
                onChange={(e) => handleFilterChange('species', e.target.value)}
                className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
              >
                <option value="">전체 종류</option>
                <option value="dog">강아지</option>
                <option value="cat">고양이</option>
                <option value="other">기타</option>
              </select>

              {/* 상태 */}
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
              >
                <option value="">전체 상태</option>
                <option value="active">진행중</option>
                <option value="resolved">해결됨</option>
                <option value="closed">종료</option>
              </select>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="lg:hidden mt-3 text-sm text-gray-600 hover:text-gray-900 underline"
              >
                필터 초기화
              </button>
            )}

            {/* 검색 반경 슬라이더 (이 화면에서만 적용, 알림 설정은 안 바뀜) */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
              <span className="text-sm text-gray-500 whitespace-nowrap">📍 검색 반경</span>
              <input
                type="range"
                min={1000}
                max={20000}
                step={1000}
                value={Math.min(searchRadius || 1000, 20000)}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <span className="text-sm font-bold text-gray-900 whitespace-nowrap w-12 text-right">
                {((searchRadius || 1000) / 1000).toFixed(0)}km
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 제보 목록 */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
          </div>
        ) : pets.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">제보가 없습니다</h3>
            <p className="text-gray-600 mb-6">
              {activeFiltersCount > 0 ? '다른 필터로 검색해보세요' : '첫 번째 제보를 등록해보세요'}
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
                onClick={() => navigate('/missing-pets/create')}
                className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all"
              >
                제보 등록하기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {pets.map((pet) => (
              <div
                key={pet.id}
                onClick={() => navigate(`/missing-pets/${pet.id}`)}
                className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer"
              >
                {/* 이미지 */}
                <div className="relative h-48 bg-gray-100">
                  {pet.thumbnail ? (
                    <img
                      src={pet.thumbnail}
                      alt={pet.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('이미지 로드 실패:', pet.thumbnail);
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-6xl">
                        {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                      </span>
                    </div>
                  )}
                  {/* 배지 */}
                  <div className="absolute top-3 left-3">
                    {getCategoryBadge(pet.category)}
                  </div>
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(pet.status)}
                  </div>
                </div>

                {/* 정보 */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {pet.name || '이름 없음'}
                    </h3>
                    <span className="text-sm text-gray-500">{pet.species_display}</span>
                  </div>
                  
                  {pet.breed && (
                    <p className="text-sm text-gray-600 mb-2">{pet.breed}</p>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <span className="mr-1">📍</span>
                    <span className="truncate">{pet.address}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span>{new Date(pet.occurred_at).toLocaleDateString('ko-KR')}</span>
                    <span>조회 {pet.views}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default MissingPetListPage;
