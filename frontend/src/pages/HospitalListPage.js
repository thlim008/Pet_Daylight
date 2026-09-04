import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { authAPI } from '../services/api';

// 카카오 자동동기화 캐시 (같은 지역 재방문 시 카카오 API 재호출 방지)
const KAKAO_SYNC_CACHE_KEY = 'hospitalKakaoSyncCache';
const KAKAO_SYNC_CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

function getKakaoSyncCacheKey(lat, lng, radius) {
  // 좌표를 약 1km 단위로 반올림해서 같은 근방 재검색은 하나의 캐시로 취급
  return `${lat.toFixed(2)}_${lng.toFixed(2)}_${radius}`;
}

function hasRecentKakaoSync(key) {
  try {
    const cache = JSON.parse(localStorage.getItem(KAKAO_SYNC_CACHE_KEY) || '{}');
    const ts = cache[key];
    return !!ts && (Date.now() - ts < KAKAO_SYNC_CACHE_TTL);
  } catch {
    return false;
  }
}

function markKakaoSynced(key) {
  try {
    const cache = JSON.parse(localStorage.getItem(KAKAO_SYNC_CACHE_KEY) || '{}');
    cache[key] = Date.now();
    localStorage.setItem(KAKAO_SYNC_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage 사용 불가 환경이면 캐시 없이 매번 동기화 (기존 동작과 동일)
  }
}

function HospitalListPage() {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(null); // ✅ null로 시작 (로딩 전)
  const [kakaoSyncDone, setKakaoSyncDone] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [locationQuery, setLocationQuery] = useState('');
  const [searchedPlaceLabel, setSearchedPlaceLabel] = useState(null);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const loadHospitalsRequestId = useRef(0);
  const PAGE_SIZE = 30;

  // 필터 상태
  const [filters, setFilters] = useState({
    type: '', // hospital, grooming
    price_range: '', // free, medium
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

  // 검색창에 입력한 지역/장소로 검색 기준 위치 변경
  const handleLocationSearch = () => {
    const query = locationQuery.trim();
    if (!query) return;
    if (!window.kakao?.maps?.services) {
      alert('지도 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    setSearchingLocation(true);
    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(query, (result, status) => {
      setSearchingLocation(false);
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const place = result[0];
        setUserLocation({ latitude: parseFloat(place.y), longitude: parseFloat(place.x) });
        setSearchedPlaceLabel(place.place_name);
        setKakaoSyncDone(false);
      } else {
        alert('검색 결과가 없습니다. 다른 검색어로 시도해보세요.');
      }
    });
  };

  const handleResetToMyLocation = () => {
    setSearchedPlaceLabel(null);
    setLocationQuery('');
    setKakaoSyncDone(false);
    getUserLocation();
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

  // 위도/경도 기준 지점에서 특정 방위각·거리만큼 떨어진 좌표 계산
  const offsetLatLng = (lat, lng, distanceMeters, bearingDeg) => {
    const R = 6371000;
    const bearing = bearingDeg * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lng1 = lng * Math.PI / 180;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distanceMeters / R) +
      Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(bearing)
    );
    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(distanceMeters / R) * Math.cos(lat1),
      Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2)
    );
    return { latitude: lat2 * 180 / Math.PI, longitude: lng2 * 180 / Math.PI };
  };

  // 한 지점 기준으로 카카오 키워드 검색을 페이지네이션까지 끝까지 수집 (최대 45개)
  const searchAllPages = (places, keyword, location, radius) => {
    return new Promise((resolve) => {
      const collected = [];
      const searchOptions = {
        location: new window.kakao.maps.LatLng(location.latitude, location.longitude),
        radius,
        sort: window.kakao.maps.services.SortBy.DISTANCE
      };
      places.keywordSearch(keyword, (result, status, pagination) => {
        if (status === window.kakao.maps.services.Status.OK) {
          collected.push(...result);
          if (pagination.hasNextPage) {
            pagination.nextPage();
            return;
          }
        }
        resolve(collected);
      }, searchOptions);
    });
  };

  // 카카오맵 검색 결과를 DB에 동기화 (백그라운드)
  const syncKakaoPlaces = async () => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      setKakaoSyncDone(true);
      return;
    }

    const effectiveRadius = Math.min(searchRadius, 20000);
    const syncCacheKey = getKakaoSyncCacheKey(userLocation.latitude, userLocation.longitude, effectiveRadius);
    if (hasRecentKakaoSync(syncCacheKey)) {
      setKakaoSyncDone(true);
      return;
    }

    const places = new window.kakao.maps.services.Places();

    // 검색 지점: 중심 + (반경이 넓을 때) 밀집 지역 캡(45개) 우회용 8방위 보조 지점
    const searchPoints = [userLocation];
    if (effectiveRadius > 8000) {
      const satelliteDistance = effectiveRadius * 0.7;
      for (let bearing = 0; bearing < 360; bearing += 45) {
        searchPoints.push(offsetLatLng(userLocation.latitude, userLocation.longitude, satelliteDistance, bearing));
      }
    }

    const savedPlaces = [];
    const seen = new Map(); // kakao_id -> place, 중복 제거용

    const keywordsByType = { hospital: ['동물병원'], grooming: ['애견미용'] };

    for (const [type, keywords] of Object.entries(keywordsByType)) {
      for (const keyword of keywords) {
        for (const point of searchPoints) {
          const results = await searchAllPages(places, keyword, point, effectiveRadius);
          for (const place of results) {
            if (!seen.has(place.id)) {
              seen.set(place.id, { ...place, _type: type });
            }
          }
        }
      }
    }

    // 실제 사용자 위치 기준으로 반경 내에 있는 것만 저장 (보조 지점 검색 결과가 반경 밖일 수 있음)
    for (const place of seen.values()) {
      const distance = getDistance(userLocation.latitude, userLocation.longitude, parseFloat(place.y), parseFloat(place.x));
      if (distance > effectiveRadius) continue;

      const saved = await saveToDb({
        kakao_id: place.id,
        name: place.place_name,
        type: place._type,
        address: place.road_address_name || place.address_name,
        phone: place.phone || '',
        latitude: place.y,
        longitude: place.x,
        category: place.category_name,
        place_url: place.place_url
      });
      if (saved) savedPlaces.push(place.place_name);
    }

    markKakaoSynced(syncCacheKey);
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

    const requestId = ++loadHospitalsRequestId.current;

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

      // 이 응답을 기다리는 사이 더 최신 요청이 나갔으면 지금 응답은 버린다
      if (requestId !== loadHospitalsRequestId.current) return;

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
      setCurrentPage(1);
    } catch (err) {
      if (requestId !== loadHospitalsRequestId.current) return;
      console.error('❌ 병원 목록 로드 실패:', err);
      setHospitals([]);
    } finally {
      if (requestId === loadHospitalsRequestId.current) setLoading(false);
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
      'medium': <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">일반</span>,
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
              <option value="medium">일반</option>
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
              <option value="true">지금 운영중</option>
              <option value="false">운영 종료</option>
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

          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">📍 검색 위치: <span className="font-medium text-gray-900">{searchedPlaceLabel || '내 위치'}</span></span>
            <div className="flex-1 min-w-[240px] flex gap-2">
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLocationSearch(); }}
                placeholder="지역/장소 검색 (예: 강남역, 서울시 종로구)"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                onClick={handleLocationSearch}
                disabled={searchingLocation}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
              >
                {searchingLocation ? '검색중...' : '검색'}
              </button>
              {searchedPlaceLabel && (
                <button
                  onClick={handleResetToMyLocation}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                >
                  내 위치로
                </button>
              )}
            </div>
          </div>

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
              {searchRadius >= 999999 ? '전국' : `${(searchRadius / 1000).toFixed(0)}km`}
            </span>
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
            {hospitals.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((hospital) => (
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
                  <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
                    {getTypeBadge(hospital.type)}
                    {hospital.is_24_hours && (
                      <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold shadow-lg">
                        24시간
                      </span>
                    )}
                    {hospital.is_open_now && !hospital.is_24_hours && (
                      <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold shadow-lg animate-pulse">
                        운영중
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

        {/* 페이지네이션 */}
        {hospitals.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>
            <span className="text-sm text-gray-600 px-2">
              {currentPage} / {Math.ceil(hospitals.length / PAGE_SIZE)} 페이지 ({hospitals.length}개)
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(Math.ceil(hospitals.length / PAGE_SIZE), p + 1))}
              disabled={currentPage >= Math.ceil(hospitals.length / PAGE_SIZE)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default HospitalListPage;
