import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { authAPI } from '../services/api';

function HospitalListPage() {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(null); // ✅ null로 시작 (로딩 전)
  const [kakaoSyncDone, setKakaoSyncDone] = useState(false);
  
  // 필터 상태
  const [filters, setFilters] = useState({
    type: '', // hospital, grooming
    price_range: '', // free, low, medium, high
    is_24_hours: '', // true, false
    is_open_now: '', // true, false
    search: '',
    sort: 'distance', // ✅ 기본값을 distance로 변경
  });

  // ✅ 1단계: 사용자 설정 먼저 로드
  useEffect(() => {
    const initialize = async () => {
      await loadUserSettings();
      getUserLocation();
    };
    initialize();
  }, []);

  // ✅ 2단계: 위치와 검색반경이 준비되면 카카오 동기화
  useEffect(() => {
    if (userLocation && searchRadius !== null && !kakaoSyncDone) {
      syncKakaoPlaces();
    }
  }, [userLocation, searchRadius, kakaoSyncDone]);

  // ✅ 3단계: 모든 조건 충족 시 병원 로드
  useEffect(() => {
    if (userLocation && searchRadius !== null) {
      const timer = setTimeout(() => {
        loadHospitals();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [filters, kakaoSyncDone, userLocation, searchRadius]);
  // 사용자 설정 로드
  const loadUserSettings = async () => {
    try {
      const response = await authAPI.getMe();
      const distance = response.data.notification_distance || 10000; // 기본 10km
      setSearchRadius(distance);
      return distance;
    } catch (err) {
      console.error('❌ 사용자 설정 로드 실패:', err);
      setSearchRadius(10000); // 실패 시 기본값 10km
      return 10000;
    }
  };

  // 위치 가져오기
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
      () => {
        setUserLocation({ latitude: 36.3504, longitude: 127.3845 });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  // ✅ 두 지점 간 거리 계산 (Haversine formula)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // 미터 단위
  };

  // 카카오맵 검색 결과를 DB에 동기화 (백그라운드)
  const syncKakaoPlaces = async () => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      setKakaoSyncDone(true);
      return;
    }

    const places = new window.kakao.maps.services.Places();
    const effectiveRadius = Math.min(searchRadius, 20000);
    
    
    const searchOptions = {
      location: new window.kakao.maps.LatLng(userLocation.latitude, userLocation.longitude),
      radius: effectiveRadius,
      sort: window.kakao.maps.services.SortBy.DISTANCE
    };

    const savedPlaces = [];
    
    // 병원 검색 & 저장
    const hospitalKeywords = ['동물병원'];
    for (const keyword of hospitalKeywords) {
      await new Promise((resolve) => {
        places.keywordSearch(keyword, async (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            for (const place of result.slice(0, 10)) { // 상위 10개만
              const saved = await saveToDb({
                kakao_id: place.id,
                name: place.place_name,
                type: 'hospital',
                address: place.road_address_name || place.address_name,
                phone: place.phone || '',
                latitude: place.y,
                longitude: place.x,
                category: place.category_name,
                place_url: place.place_url
              });
              if (saved) savedPlaces.push(place.place_name);
            }
          }
          resolve();
        }, searchOptions);
      });
    }

    // 미용 검색 & 저장
    const groomingKeywords = ['애견미용'];
    for (const keyword of groomingKeywords) {
      await new Promise((resolve) => {
        places.keywordSearch(keyword, async (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            for (const place of result.slice(0, 10)) {
              const saved = await saveToDb({
                kakao_id: place.id,
                name: place.place_name,
                type: 'grooming',
                address: place.road_address_name || place.address_name,
                phone: place.phone || '',
                latitude: place.y,
                longitude: place.x,
                category: place.category_name,
                place_url: place.place_url
              });
              if (saved) savedPlaces.push(place.place_name);
            }
          }
          resolve();
        }, searchOptions);
      });
    }

    setKakaoSyncDone(true);
  };

  // DB에 저장
  const saveToDb = async (placeData) => {
    try {
      const response = await API.post('/hospitals/create-from-kakao/', placeData);
      if (response.data.created) {
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // ✅ 병원 로드 - 위치와 반경 파라미터 추가
  const loadHospitals = useCallback(async () => {
    if (!userLocation || searchRadius === null) {
      return;
    }

    try {
      setLoading(true);
      const params = {
        // ✅ 위치와 반경 파라미터 추가
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: Math.min(searchRadius, 20000)
      };
      
      if (filters.type) params.type = filters.type;
      if (filters.price_range) params.price_range = filters.price_range;
      if (filters.is_24_hours) params.is_24_hours = filters.is_24_hours;
      if (filters.is_open_now) params.is_open_now = filters.is_open_now;
      if (filters.search) params.search = filters.search;
      
      // ✅ 거리순 정렬은 클라이언트에서 처리 (API가 지원 안 할 수 있으므로)
      if (filters.sort === 'rating') {
        params.ordering = '-rating';
      } else if (filters.sort === 'review_count') {
        params.ordering = '-review_count';
      } else if (filters.sort === 'name') {
        params.ordering = 'name';
      }
      
      
      const response = await API.get('/hospitals/', { params });
      
      
      let hospitalData = [];
      if (response.data.results) {
        hospitalData = response.data.results;
      } else if (Array.isArray(response.data)) {
        hospitalData = response.data;
      }

      // ✅ 각 병원에 거리 정보 추가
      const hospitalsWithDistance = hospitalData.map(hospital => {
        if (hospital.latitude && hospital.longitude) {
          const distance = getDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(hospital.latitude),
            parseFloat(hospital.longitude)
          );
          return { ...hospital, calculatedDistance: distance };
        }
        return { ...hospital, calculatedDistance: Infinity };
      });

      // ✅ 검색 반경 내 병원만 필터링
      const filteredByRadius = hospitalsWithDistance.filter(
        hospital => hospital.calculatedDistance <= searchRadius
      );

      // ✅ 거리순 정렬 (클라이언트 측)
      let sortedHospitals = [...filteredByRadius];
      if (filters.sort === 'distance') {
        sortedHospitals.sort((a, b) => a.calculatedDistance - b.calculatedDistance);
      }

      setHospitals(sortedHospitals);
    } catch (err) {
      console.error('❌ 병원 목록 로드 실패:', err);
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  }, [filters, userLocation, searchRadius]);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleResetFilters = () => {
    setFilters({
      type: '',
      price_range: '',
      is_24_hours: '',
      is_open_now: '',
      search: '',
      sort: 'distance', // ✅ 기본값 distance
    });
  };

  const getPriceRangeBadge = (priceRange) => {
    const badges = {
      'free': <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">무료</span>,
      'low': <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">저가</span>,
      'medium': <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">일반</span>,
      'high': <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">고가</span>,
    };
    return badges[priceRange] || null;
  };

  const getTypeBadge = (type) => {
    if (type === 'hospital') {
      return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">🏥 병원</span>;
    }
    return <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">✂️ 미용</span>;
  };

  const renderStars = (rating) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center space-x-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400 text-sm">★</span>
        ))}
        {hasHalfStar && <span className="text-yellow-400 text-sm">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300 text-sm">★</span>
        ))}
        <span className="ml-1 text-xs text-gray-600">{numRating.toFixed(1)}</span>
      </div>
    );
  };

  // ✅ 거리 포맷팅 함수
  const formatDistance = (meters) => {
    if (meters === Infinity || meters === undefined) return '';
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const activeFiltersCount = [
    filters.type,
    filters.price_range,
    filters.is_24_hours,
    filters.is_open_now,
    filters.search
  ].filter(Boolean).length;

  // ✅ 로딩 조건 수정
  if (loading || !userLocation || searchRadius === null) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!userLocation ? '위치 정보를 가져오는 중...' : 
             searchRadius === null ? '설정을 불러오는 중...' : '로딩 중...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <img 
                src="/logo.png" 
                alt="Pet Daylight" 
                className="w-10 h-10 sm:w-14 sm:h-14 object-contain drop-shadow-md"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <span className="hidden sm:inline text-xl font-bold text-gray-900">Pet Daylight</span>
                <p className="hidden sm:block text-xs text-gray-500">병원/미용 목록</p>
              </div>
            </button>

            <div className="flex items-center space-x-3">
              {/* ✅ 검색 반경 표시 */}
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                <span className="text-xs text-blue-600">📍 반경</span>
                <span className="text-sm font-bold text-blue-700">
                  {searchRadius >= 999999 ? '전국' : `${(searchRadius / 1000).toFixed(0)}km`}
                </span>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
              >
                ⚙️ 설정
              </button>
              <button
                onClick={() => navigate('/hospitals/map')}
                className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all"
              >
                🗺️ 지도
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 필터 */}
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
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                필터 초기화
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* 검색 */}
            <input
              type="text"
              placeholder="병원명, 주소로 검색..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
            />

            {/* 구분 */}
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
            >
              <option value="">전체 (병원/미용)</option>
              <option value="hospital">병원</option>
              <option value="grooming">미용</option>
            </select>

            {/* 가격대 */}
            <select
              value={filters.price_range}
              onChange={(e) => handleFilterChange('price_range', e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
            >
              <option value="">전체 가격대</option>
              <option value="free">무료</option>
              <option value="low">저가</option>
              <option value="medium">일반</option>
              <option value="high">고가</option>
            </select>

            {/* 24시간 운영 */}
            <select
              value={filters.is_24_hours}
              onChange={(e) => handleFilterChange('is_24_hours', e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
            >
              <option value="">24시간 (전체)</option>
              <option value="true">24시간 운영</option>
              <option value="false">일반 운영</option>
            </select>

            {/* 진료중 */}
            <select
              value={filters.is_open_now}
              onChange={(e) => handleFilterChange('is_open_now', e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
            >
              <option value="">운영시간 (전체)</option>
              <option value="true">지금 진료중</option>
              <option value="false">진료 종료</option>
            </select>

            {/* ✅ 정렬 - 거리순 추가 */}
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
            >
              <option value="distance">거리순</option>
              <option value="rating">평점순</option>
              <option value="review_count">리뷰많은순</option>
              <option value="name">이름순</option>
            </select>
          </div>
        </div>
      </section>

      {/* 병원 목록 */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* ✅ 결과 요약 */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-bold text-gray-900">{hospitals.length}</span>개의 병원/미용실
            <span className="text-gray-400 ml-2">
              (반경 {searchRadius >= 999999 ? '전국' : `${(searchRadius / 1000).toFixed(0)}km`} 내)
            </span>
          </p>
        </div>

        {hospitals.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">병원/미용실이 없습니다</h3>
            <p className="text-gray-600 mb-6">
              {activeFiltersCount > 0 ? '다른 필터로 검색해보세요' : '검색 반경을 늘려보세요'}
            </p>
            <div className="flex justify-center gap-3">
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all"
                >
                  필터 초기화
                </button>
              )}
              <button
                onClick={() => navigate('/profile')}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all"
              >
                검색 반경 변경
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {hospitals.map((hospital) => (
              <div
                key={hospital.id}
                onClick={() => navigate(`/hospitals/${hospital.id}`)}
                className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer"
              >
                {/* 이미지 */}
                <div className="relative h-48 bg-gradient-to-br from-blue-50 to-indigo-100">
                  {hospital.image ? (
                    <img
                      src={hospital.image}
                      alt={hospital.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-6xl">
                        {hospital.type === 'hospital' ? '🏥' : '✂️'}
                      </span>
                    </div>
                  )}
                  {/* 배지 */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {getTypeBadge(hospital.type)}
                    {hospital.is_24_hours && (
                      <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold shadow-lg">
                        24시간
                      </span>
                    )}
                    {hospital.is_open_now && !hospital.is_24_hours && (
                      <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse">
                        진료중
                      </span>
                    )}
                    {!hospital.is_24_hours && !hospital.is_open_now && (!hospital.opening_hours || Object.keys(hospital.opening_hours).length === 0) && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        {hospital.type === 'grooming' ? '영업시간 미제공' : '진료시간 미제공'}
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    {getPriceRangeBadge(hospital.price_range)}
                  </div>
                  {/* ✅ 거리 배지 추가 */}
                  {hospital.calculatedDistance && hospital.calculatedDistance !== Infinity && (
                    <div className="absolute bottom-3 right-3">
                      <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold shadow-lg">
                        🚶 {formatDistance(hospital.calculatedDistance)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {hospital.name}
                  </h3>
                  
                  {/* 별점 */}
                  <div className="mb-3">
                    {renderStars(hospital.rating || 0)}
                  </div>
                  
                  {/* 주소 */}
                  <div className="flex items-start text-sm text-gray-600 mb-2">
                    <span className="mr-1">📍</span>
                    <span className="truncate">{hospital.address}</span>
                  </div>
                  
                  {/* 전화번호 */}
                  {hospital.phone && (
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <span className="mr-1">📞</span>
                      <span>{hospital.phone}</span>
                    </div>
                  )}
                  
                  {/* 리뷰 수 + 거리 */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <span>리뷰 {hospital.review_count || 0}개</span>
                    {hospital.services && hospital.services.length > 0 && (
                      <span className="truncate ml-2">
                        {hospital.services.slice(0, 2).join(', ')}
                        {hospital.services.length > 2 && ' 외'}
                      </span>
                    )}
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

export default HospitalListPage;
