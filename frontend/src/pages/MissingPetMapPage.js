import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { authAPI } from '../services/api';

function MissingPetMapPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(10000); // 기본 10km (미터)

  useEffect(() => {
    loadUserSettings();
    getUserLocation();
    loadReports();
  }, []);

  useEffect(() => {
    if (
      reports.length > 0 &&
      userLocation &&
      !map &&
      document.getElementById('map')
    ) {
      initMap();
    }
  }, [reports, userLocation]); // map 제거

  // 사용자 설정 로드 (검색 반경)
  const loadUserSettings = async () => {
    try {
      const response = await authAPI.getMe();
      setSearchRadius(response.data.notification_distance || 10000);
      console.log('✅ 검색 반경:', response.data.notification_distance / 1000, 'km');
    } catch (err) {
      console.error('❌ 사용자 설정 로드 실패:', err);
    }
  };

  // 현재 위치 가져오기
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      alert('위치 서비스를 지원하지 않는 브라우저입니다.');
      setUserLocation({ latitude: 36.3504, longitude: 127.3845 }); // 대전 기본값
      return;
    }

    console.log('📍 위치 정보 요청 중...');

    const locationOptions = {
      enableHighAccuracy: false, // 빠른 응답을 위해 false로 변경
      timeout: 30000, // 30초로 증가
      maximumAge: 300000 // 5분 이내 캐시된 위치 사용
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        console.log('✅ 현재 위치:', latitude, longitude);
      },
      (error) => {
        console.error('❌ 위치 가져오기 실패:', error);
        
        // 재시도 (정확도 낮춰서)
        console.log('🔄 재시도 중 (낮은 정확도)...');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
            console.log('✅ 현재 위치 (재시도 성공):', latitude, longitude);
          },
          (retryError) => {
            console.error('❌ 재시도 실패:', retryError);
            // 마지막 수단: 기본값
            alert('위치를 가져올 수 없습니다.\n대전을 기본 위치로 설정합니다.');
            setUserLocation({ latitude: 36.3504, longitude: 127.3845 }); // 대전
          },
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 600000 // 10분 이내 캐시 허용
          }
        );
      },
      locationOptions
    );
  };

  // 두 지점 간 거리 계산 (Haversine formula)
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

  // 모바일에서 화면 크기 변경 시 자동으로 내 위치로 이동
  useEffect(() => {
    if (!map || !userLocation) return;

    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      
      if (isMobile) {
        const center = new window.kakao.maps.LatLng(
          userLocation.latitude, 
          userLocation.longitude
        );
        map.setCenter(center);
        console.log("📱 모바일 모드: 내 위치로 이동");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [map, userLocation]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await API.get('/missing-pets/', {
        params: { status: 'active' }
      });
      
      const data = response.data.results || response.data;
      const validReports = data.filter(r => r.latitude && r.longitude);
      
      console.log('📥 전체 제보:', validReports.length);
      setReports(validReports);
    } catch (err) {
      console.error('❌ 제보 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  // 검색 반경에 따라 적절한 줌 레벨 자동 설정
  const getMapLevel = (radiusMeters) => {
    if (radiusMeters <= 1000) return 5;       // 1km: 가까이
    if (radiusMeters <= 3000) return 6;       // 3km
    if (radiusMeters <= 5000) return 7;       // 5km
    if (radiusMeters <= 10000) return 8;      // 10km
    if (radiusMeters <= 20000) return 9;      // 20km
    if (radiusMeters <= 50000) return 10;     // 50km
    return 12;                                 // 전국: 멀리
  };

  const initMap = () => {
    if (!window.kakao || !window.kakao.maps) {
      console.error('카카오맵 SDK가 로드되지 않았습니다.');
      alert('카카오맵을 불러올 수 없습니다. 페이지를 새로고침해주세요.');
      return;
    }

    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    const mapOption = {
      center: new window.kakao.maps.LatLng(userLocation.latitude, userLocation.longitude),
      level: getMapLevel(searchRadius) // 자동 줌 레벨
    };

    const kakaoMap = new window.kakao.maps.Map(mapContainer, mapOption);
    setMap(kakaoMap);

    // 현재 위치 마커 (파란 원)
    const myLocationMarker = new window.kakao.maps.Marker({
      position: new window.kakao.maps.LatLng(userLocation.latitude, userLocation.longitude),
      image: getMyLocationMarkerImage()
    });
    myLocationMarker.setMap(kakaoMap);

    // 검색 반경 원 표시
    const circle = new window.kakao.maps.Circle({
      center: new window.kakao.maps.LatLng(userLocation.latitude, userLocation.longitude),
      radius: searchRadius, // 미터 단위
      strokeWeight: 2,
      strokeColor: '#3B82F6',
      strokeOpacity: 0.5,
      strokeStyle: 'dashed',
      fillColor: '#3B82F6',
      fillOpacity: 0.1
    });
    circle.setMap(kakaoMap);

    // 거리 기반 필터링
    const nearbyReports = reports.filter(report => {
      const distance = getDistance(
        userLocation.latitude,
        userLocation.longitude,
        report.latitude,
        report.longitude
      );
      return distance <= searchRadius;
    });

    console.log('🎯 검색 반경 내 제보:', nearbyReports.length);

    // 필터링된 제보에 마커 생성
    const newMarkers = nearbyReports.map(report => {
      const markerPosition = new window.kakao.maps.LatLng(report.latitude, report.longitude);
      const markerImage = getMarkerImage(report.category);
      
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        image: markerImage,
        clickable: true
      });

      marker.setMap(kakaoMap);

      // 마커 클릭 이벤트
      window.kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedReport(report);
        kakaoMap.setCenter(markerPosition);
      });

      return marker;
    });

    setMarkers(newMarkers);
  };

  const getMyLocationMarkerImage = () => {
    const imageSrc = `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="#3B82F6" opacity="0.3"/>
        <circle cx="20" cy="20" r="10" fill="#3B82F6"/>
        <circle cx="20" cy="20" r="5" fill="white"/>
      </svg>
    `)}`;

    const imageSize = new window.kakao.maps.Size(40, 40);
    const imageOption = { offset: new window.kakao.maps.Point(20, 20) };

    return new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
  };

  const getMarkerImage = (category) => {
    const colors = {
      missing: '#EF4444',  // 빨강
      found: '#3B82F6',    // 파랑
      rescue: '#10B981'    // 초록
    };

    const color = colors[category] || '#6B7280';
    
    const imageSrc = `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
        <path fill="${color}" d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z"/>
        <circle fill="white" cx="16" cy="16" r="6"/>
      </svg>
    `)}`;

    const imageSize = new window.kakao.maps.Size(32, 40);
    const imageOption = { offset: new window.kakao.maps.Point(16, 40) };

    return new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
  };

  const getCategoryColor = (category) => {
    const colors = {
      missing: 'bg-red-100 text-red-700',
      found: 'bg-blue-100 text-blue-700',
      rescue: 'bg-green-100 text-green-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      missing: '🆘',
      found: '👀',
      rescue: '🚑'
    };
    return icons[category] || '📍';
  };

  if (loading || !userLocation) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!userLocation ? '위치 정보를 가져오는 중...' : '지도 로딩 중...'}
          </p>
        </div>
      </div>
    );
  }

  // 거리 기반 필터링된 제보 계산
  const nearbyReports = reports.filter(report => {
    const distance = getDistance(
      userLocation.latitude,
      userLocation.longitude,
      report.latitude,
      report.longitude
    );
    return distance <= searchRadius;
  });

  if (nearbyReports.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF9]">
        {/* 헤더 */}
        <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 lg:py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              >
                <img 
                  src="/logo.png" 
                  alt="Pet Daylight" 
                  className="w-10 h-10 lg:w-14 lg:h-14 object-contain drop-shadow-md"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div>
                  <span className="text-lg lg:text-xl font-bold text-gray-900">Pet Daylight</span>
                  <p className="text-xs text-gray-500">주변 제보 지도</p>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* 빈 화면 */}
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              반경 {searchRadius >= 999999 ? '전국' : `${(searchRadius / 1000).toFixed(0)}km`} 이내에 제보가 없습니다
            </h3>
            <p className="text-gray-600 mb-6">
              검색 반경을 늘리시려면 프로필 설정에서 변경하세요
            </p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={() => navigate('/profile')}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all"
              >
                설정 변경
              </button>
              <button
                onClick={() => navigate('/missing-pets/create')}
                className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all"
              >
                제보 등록하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <img 
                src="/logo.png" 
                alt="Pet Daylight" 
                className="w-10 h-10 lg:w-14 lg:h-14 object-contain drop-shadow-md"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <span className="text-lg lg:text-xl font-bold text-gray-900">Pet Daylight</span>
                <p className="text-xs text-gray-500">
                  실종 제보 지도 
                </p>
              </div>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/profile')}
                className="px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
              >
                ⚙️ 거리 설정
              </button>
              <button
                onClick={() => navigate('/missing-pets')}
                className="px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
              >
                목록으로
              </button>
              <button
                onClick={() => navigate('/missing-pets/create')}
                className="px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all"
              >
                제보 등록
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인: 지도 + 사이드바 */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
        {/* 지도 */}
        <div className="flex-1 relative h-[50vh] lg:h-auto">
          <div id="map" className="w-full h-full"></div>
          
          {/* 범례 - 왼쪽 상단 고정 */}
          <div className="absolute top-2 left-2 lg:top-6 lg:left-6 bg-white rounded-xl lg:rounded-2xl shadow-xl p-3 lg:p-5 border-2 border-gray-200 z-10">
            <h3 className="font-bold text-gray-900 mb-4 text-base flex items-center">
              <span className="mr-2">🗺️</span>
              카테고리
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-md flex-shrink-0"></div>
                <span className="text-sm font-medium text-gray-700">내 위치</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-red-500 rounded-full shadow-md flex-shrink-0"></div>
                <span className="text-sm font-medium text-gray-700">실종</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full shadow-md flex-shrink-0"></div>
                <span className="text-sm font-medium text-gray-700">발견</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-green-500 rounded-full shadow-md flex-shrink-0"></div>
                <span className="text-sm font-medium text-gray-700">구조</span>
              </div>
            </div>
            
            {/* 검색 반경 정보 */}
            <div className="mt-4 pt-4 border-t-2 border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 border-2 border-dashed border-blue-500 rounded-full flex-shrink-0"></div>
                <span className="text-xs font-medium text-gray-600">검색 반경</span>
              </div>
              <p className="text-lg font-bold text-blue-600">
                {searchRadius >= 999999 ? '전국' : `${(searchRadius / 1000).toFixed(0)}km`}
              </p>
              <button
                onClick={() => navigate('/profile')}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
              >
                프로필에서 변경하기
              </button>
            </div>
          </div>
        </div>

        {/* 선택된 제보 정보 */}
        {selectedReport && (
          <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 overflow-y-auto p-4 lg:p-6 max-h-[50vh] lg:max-h-none">
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-3xl">{getCategoryIcon(selectedReport.category)}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedReport.category)}`}>
                  {selectedReport.category_display}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedReport.name || `${selectedReport.species_display} 제보`}
              </h2>

              {selectedReport.breed && (
                <p className="text-gray-600 mb-2">품종: {selectedReport.breed}</p>
              )}

              <p className="text-sm text-gray-500 mb-4">
                📍 {selectedReport.address}
              </p>

              {/* 거리 표시 */}
              <p className="text-sm font-medium text-blue-600 mb-4">
                🚶 현재 위치에서 약 {
                  (getDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    selectedReport.latitude,
                    selectedReport.longitude
                  ) / 1000).toFixed(1)
                }km
              </p>

              {selectedReport.thumbnail && (
                <img 
                  src={selectedReport.thumbnail} 
                  alt="제보 사진"
                  className="w-full h-48 object-cover rounded-xl mb-4"
                />
              )}

              <p className="text-gray-700 leading-relaxed mb-4 line-clamp-3">
                {selectedReport.description}
              </p>

              <div className="pt-4 border-t border-gray-200 space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-2">📅</span>
                  <span>{new Date(selectedReport.occurred_at).toLocaleDateString('ko-KR')}</span>
                </div>
                
                <button
                  onClick={() => navigate(`/missing-pets/${selectedReport.id}`)}
                  className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all mt-4"
                >
                  상세 정보 보기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 사이드바 닫기 버튼 */}
        {selectedReport && (
          <button
            onClick={() => setSelectedReport(null)}
            className="absolute top-4 right-[25rem] bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-all z-10"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default MissingPetMapPage;