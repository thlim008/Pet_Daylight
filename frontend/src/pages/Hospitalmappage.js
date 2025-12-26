import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { authAPI } from '../services/api';

function HospitalMapPage() {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(10000); // 기본 10km (미터)
  const [kakaoPlaces, setKakaoPlaces] = useState([]); // 카카오맵 검색 결과
  const currentInfoWindow = useRef(null); // useState 대신 useRef 사용!
  const [toast, setToast] = useState({ show: false, message: '' }); // 토스트 알림
  const [filterOpen, setFilterOpen] = useState(false); // 필터 패널 열림/닫힘 (모바일)
  
  // 필터 상태
  const [filters, setFilters] = useState({
    type: '', // hospital, grooming
    is_24_hours: false,
    is_open_now: false,
    show_kakao_places: true, // 카카오맵 검색 결과 표시 (기본 활성화)
  });

  useEffect(() => {
    loadUserSettings();
    getUserLocation();
    loadHospitals();
  }, []);

  // 위치와 병원 로드 완료 후 지도 초기화
  useEffect(() => {
    if (
      userLocation &&
      !map &&
      !loading && // 로딩 완료 후
      document.getElementById('map')
    ) {
      initMap();
    }
  }, [userLocation, loading]); // loading 추가!

  // 필터 변경 시 마커 재생성
  useEffect(() => {
    if (map) {
      updateMarkers();
    }
  }, [filters]);

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
      setUserLocation({ latitude: 37.5665, longitude: 126.9780 }); // 서울 기본값
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
            // 마지막 수단: IP 기반 위치 또는 기본값
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

  const loadHospitals = async () => {
    try {
      setLoading(true);
      const response = await API.get('/hospitals/');
      
      const data = response.data.results || response.data;
      const validHospitals = data.filter(h => h.latitude && h.longitude);
      
      console.log('📥 전체 병원/미용:', validHospitals.length);
      setHospitals(validHospitals);
    } catch (err) {
      console.error('❌ 병원 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  // 카카오맵 Places API로 주변 병원/미용실 검색
  const searchKakaoPlaces = (kakaoMap) => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      console.error('❌ 카카오맵 Places API가 로드되지 않았습니다.');
      return;
    }

    const places = new window.kakao.maps.services.Places();
    const allPlaces = [];
    const allMarkers = []; // 마커를 즉시 저장

    // 카카오맵 API는 최대 반경 20km까지만 지원
    const effectiveRadius = Math.min(searchRadius, 20000);
    
    const searchOptions = {
      location: new window.kakao.maps.LatLng(userLocation.latitude, userLocation.longitude),
      radius: effectiveRadius,
      sort: window.kakao.maps.services.SortBy.DISTANCE
    };

    console.log('🔍 카카오맵 검색 시작 (반경:', effectiveRadius / 1000, 'km)');

    // 동물병원 검색 (여러 키워드로 검색)
    const hospitalKeywords = ['동물병원', '24시 동물병원', '반려동물병원'];
    let hospitalSearchCount = 0;

    hospitalKeywords.forEach((keyword, index) => {
      setTimeout(() => {
        places.keywordSearch(keyword, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            console.log(`✅ "${keyword}" 검색:`, result.length, '곳');
            result.forEach(place => {
              // 중복 제거 (같은 ID는 하나만)
              if (!allPlaces.find(p => p.kakao_id === place.id)) {
                const placeData = {
                  id: `kakao_hospital_${place.id}`,
                  kakao_id: place.id,
                  name: place.place_name,
                  type: 'hospital',
                  source: 'kakao',
                  address: place.road_address_name || place.address_name,
                  latitude: place.y,
                  longitude: place.x,
                  phone: place.phone || '',
                  category: place.category_name,
                  place_url: place.place_url,
                  distance: parseInt(place.distance || 0),
                };
                allPlaces.push(placeData);
                
                // 즉시 마커 생성
                const marker = createSingleKakaoMarker(kakaoMap, placeData);
                if (marker) allMarkers.push(marker);
              }
            });
          } else {
            console.log(`⚠️ "${keyword}" 검색 결과 없음`);
          }

          hospitalSearchCount++;
          
          // 동물병원 검색 완료 후 미용실 검색
          if (hospitalSearchCount === hospitalKeywords.length) {
            searchGroomingPlaces();
          }
        }, searchOptions);
      }, index * 300); // 요청 간격 300ms
    });

    // 애견미용 검색
    const searchGroomingPlaces = () => {
      const groomingKeywords = ['애견미용', '펫미용', '강아지미용'];
      let groomingSearchCount = 0;

      groomingKeywords.forEach((keyword, index) => {
        setTimeout(() => {
          places.keywordSearch(keyword, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              console.log(`✅ "${keyword}" 검색:`, result.length, '곳');
              result.forEach(place => {
                // 중복 제거
                if (!allPlaces.find(p => p.kakao_id === place.id)) {
                  const placeData = {
                    id: `kakao_grooming_${place.id}`,
                    kakao_id: place.id,
                    name: place.place_name,
                    type: 'grooming',
                    source: 'kakao',
                    address: place.road_address_name || place.address_name,
                    latitude: place.y,
                    longitude: place.x,
                    phone: place.phone || '',
                    category: place.category_name,
                    place_url: place.place_url,
                    distance: parseInt(place.distance || 0),
                  };
                  allPlaces.push(placeData);
                  
                  // 즉시 마커 생성
                  const marker = createSingleKakaoMarker(kakaoMap, placeData);
                  if (marker) allMarkers.push(marker);
                }
              });
            } else {
              console.log(`⚠️ "${keyword}" 검색 결과 없음`);
            }

            groomingSearchCount++;
            
            // 모든 검색 완료
            if (groomingSearchCount === groomingKeywords.length) {
              setKakaoPlaces(allPlaces);
              console.log('🎯 카카오맵 검색 완료:', allPlaces.length, '곳');
              console.log('🗺️ 생성된 마커:', allMarkers.length, '개');
              
              if (allPlaces.length === 0) {
                console.log('⚠️ 검색 결과가 없습니다. 반경을 늘려보세요.');
              }
              
              // 마커 배열에 추가
              setMarkers(prev => [...prev, ...allMarkers]);
            }
          }, searchOptions);
        }, index * 300); // 요청 간격 300ms
      });
    };
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

    // 지도 클릭 시 InfoWindow 닫기
    window.kakao.maps.event.addListener(kakaoMap, 'click', () => {
      if (currentInfoWindow.current) {
        currentInfoWindow.current.close();
        currentInfoWindow.current = null;
      }
    });

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

    // 초기 마커 생성 (DB 데이터가 있으면)
    if (hospitals.length > 0) {
      createMarkers(kakaoMap, hospitals);
    }

    // 카카오맵 Places API로 주변 검색
    searchKakaoPlaces(kakaoMap);
  };


  // 모바일에서 화면 크기 변경 시 자동으로 내 위치로 이동
  useEffect(() => {
    if (!map || !userLocation) return;

    const handleResize = () => {
      const isMobile = window.innerWidth < 1024; // lg breakpoint
      
      if (isMobile) {
        // 모바일: 내 위치로 중심 이동
        const center = new window.kakao.maps.LatLng(
          userLocation.latitude, 
          userLocation.longitude
        );
        map.setCenter(center);
        console.log('📱 모바일 모드: 내 위치로 이동');
      }
    };

    // 초기 실행
    handleResize();

    // 화면 크기 변경 감지
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [map, userLocation]);

  const updateMarkers = () => {
    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    
    // 필터링된 병원만 마커 생성 (DB 데이터가 있으면)
    if (hospitals.length > 0) {
      const filteredHospitals = getFilteredHospitals();
      createMarkers(map, filteredHospitals);
    }
    
    // 카카오맵 검색 결과도 필터링해서 표시
    if (filters.show_kakao_places && kakaoPlaces.length > 0) {
      const filteredKakaoPlaces = getFilteredKakaoPlaces();
      createKakaoMarkers(map, filteredKakaoPlaces);
    }
  };

  // 카카오맵 검색 결과 필터링
  const getFilteredKakaoPlaces = () => {
    let filtered = kakaoPlaces;

    // 타입 필터 적용 (병원/미용 구분)
    if (filters.type) {
      filtered = filtered.filter(place => place.type === filters.type);
    }

    // 24시간/진료중 필터는 카카오맵 데이터에 정보가 없으므로 무시
    // (카카오맵 검색 결과는 이런 정보를 제공하지 않음)

    return filtered;
  };

  const getFilteredHospitals = () => {
    let filtered = hospitals;

    // 필터 적용
    filtered = filtered.filter(hospital => {
      if (filters.type && hospital.type !== filters.type) return false;
      if (filters.is_24_hours && !hospital.is_24_hours) return false;
      if (filters.is_open_now && !hospital.is_open_now) return false;
      return true;
    });

    // 거리 기반 필터링 (검색 반경 내)
    if (userLocation) {
      filtered = filtered.filter(hospital => {
        const distance = getDistance(
          userLocation.latitude,
          userLocation.longitude,
          parseFloat(hospital.latitude),
          parseFloat(hospital.longitude)
        );
        return distance <= searchRadius;
      });
    }

    return filtered;
  };

  const createMarkers = (kakaoMap, hospitalList) => {
    const newMarkers = hospitalList.map(hospital => {
      const markerPosition = new window.kakao.maps.LatLng(
        parseFloat(hospital.latitude),
        parseFloat(hospital.longitude)
      );
      const markerImage = getMarkerImage(hospital.type, hospital.is_24_hours, hospital.is_open_now, 'database');
      
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        image: markerImage,
        clickable: true
      });

      marker.setMap(kakaoMap);

      // 마커 클릭 이벤트
      window.kakao.maps.event.addListener(marker, 'click', () => {
        // 기존 InfoWindow 닫기
        if (currentInfoWindow.current) {
          currentInfoWindow.current.close();
          currentInfoWindow.current = null;
        }
        setSelectedHospital(hospital);
        kakaoMap.setCenter(markerPosition);
      });

      return marker;
    });

    setMarkers(newMarkers);
  };

  // 카카오맵 검색 결과 마커 생성
  const createKakaoMarkers = (kakaoMap, placesList) => {
    const kakaoMarkers = placesList.map(place => {
      return createSingleKakaoMarker(kakaoMap, place);
    }).filter(Boolean);

    // 기존 마커에 카카오 마커 추가
    setMarkers(prev => [...prev, ...kakaoMarkers]);
  };

  // 단일 카카오 마커 생성 (즉시 생성용)
  const createSingleKakaoMarker = (kakaoMap, place) => {
    try {
      const markerPosition = new window.kakao.maps.LatLng(
        parseFloat(place.latitude),
        parseFloat(place.longitude)
      );
      const markerImage = getMarkerImage(place.type, false, false, 'database');
      
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        image: markerImage,
        clickable: true
      });

      marker.setMap(kakaoMap);

      // 카카오맵 장소는 InfoWindow로 표시
      window.kakao.maps.event.addListener(marker, 'click', () => {
        showKakaoInfoWindow(place, marker, kakaoMap);
      });

      console.log('✅ 마커 생성:', place.name);
      return marker;
    } catch (error) {
      console.error('❌ 마커 생성 실패:', place.name, error);
      return null;
    }
  };

  // 카카오 장소를 DB에 자동 생성하고 상세 페이지로 이동
  const createAndViewKakaoPlace = async (place) => {
    try {
      // 로딩 표시
      showToast('병원 정보를 불러오는 중...');
      
      const response = await API.post('/hospitals/create-from-kakao/', {
        kakao_id: place.kakao_id,
        name: place.name,
        type: place.type,
        address: place.address,
        phone: place.phone,
        latitude: place.latitude,
        longitude: place.longitude,
        category: place.category,
        place_url: place.place_url
      });
      
      if (response.data.hospital_id) {
        // 생성 성공 또는 이미 존재함
        navigate(`/hospitals/${response.data.hospital_id}`);
      }
    } catch (error) {
      console.error('❌ 병원 생성 실패:', error);
      alert('병원 정보를 불러올 수 없습니다. 다시 시도해주세요.');
    }
  };

  // 카카오맵 장소 정보창 표시
  const showKakaoInfoWindow = (place, marker, kakaoMap) => {
    // 기존에 열린 InfoWindow가 있으면 닫기
    if (currentInfoWindow.current) {
      currentInfoWindow.current.close();
    }

    // 전역 함수로 복사 기능 제공 (InfoWindow 내부에서 접근 가능)
    window.copyKakaoInfo = (text, type) => {
      copyToClipboard(text, type);
    };
    
    // 전역 함수로 상세보기 기능 제공
    window.viewKakaoDetail = () => {
      createAndViewKakaoPlace(place);
    };

    const content = `
      <div style="padding:15px; min-width:250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <div style="margin-bottom:8px;">
          <span style="display:inline-block; padding:3px 8px; background:${place.type === 'hospital' ? '#FEE2E2' : '#FCE7F3'}; color:${place.type === 'hospital' ? '#991B1B' : '#831843'}; border-radius:12px; font-size:11px; font-weight:600;">
            ${place.type === 'hospital' ? '🏥 병원' : '✂️ 미용'}
          </span>
        </div>
        <h3 style="margin:0 0 10px 0; font-weight:700; font-size:15px; color:#111827;">
          ${place.name}
        </h3>
        
        <!-- 주소 + 복사 버튼 -->
        <div style="display:flex; align-items:center; margin:4px 0; gap:6px;">
          <p style="margin:0; font-size:13px; color:#6B7280; line-height:1.5; flex:1;">
            📍 ${place.address}
          </p>
          <button 
            onclick="window.copyKakaoInfo('${place.address.replace(/'/g, "\\'")}', '주소')"
            style="padding:4px 10px; background:#3B82F6; color:white; border:none; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; white-space:nowrap; transition: all 0.2s;"
            onmouseover="this.style.background='#2563EB'"
            onmouseout="this.style.background='#3B82F6'"
            title="주소 복사"
          >
            📋 복사
          </button>
        </div>
        
        ${place.phone ? `
          <!-- 전화번호 + 복사 버튼 -->
          <div style="display:flex; align-items:center; margin:4px 0; gap:6px;">
            <p style="margin:0; font-size:13px; color:#6B7280; flex:1;">
              📞 ${place.phone}
            </p>
            <button 
              onclick="window.copyKakaoInfo('${place.phone}', '전화번호')"
              style="padding:4px 10px; background:#10B981; color:white; border:none; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; white-space:nowrap; transition: all 0.2s;"
              onmouseover="this.style.background='#059669'"
              onmouseout="this.style.background='#10B981'"
              title="전화번호 복사"
            >
              📋 복사
            </button>
          </div>
        ` : ''}
        
        <p style="margin:8px 0 8px 0; font-size:13px; color:#3B82F6; font-weight:600;">
          🚶 약 ${(place.distance / 1000).toFixed(1)}km
        </p>
        
        <!-- 상세보기 버튼 -->
        <button
          onclick="window.viewKakaoDetail()"
          style="width:100%; padding:10px 16px; background:#111827; color:white; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
          onmouseover="this.style.background='#1F2937'"
          onmouseout="this.style.background='#111827'"
        >
          📝 상세보기 & 리뷰
        </button>
      </div>
    `;

    const infowindow = new window.kakao.maps.InfoWindow({
      content: content,
      removable: false // X 버튼 없애기 - 다른 마커 클릭하면 자동으로 닫힘
    });

    infowindow.open(kakaoMap, marker);
    
    // 현재 열린 InfoWindow 저장
    currentInfoWindow.current = infowindow;
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

  const getMarkerImage = (type, is24Hours, isOpenNow, source = 'database') => {
    let color = '#6B7280'; // 기본 회색
    
    if (source === 'kakao') {
      // 카카오맵 검색 결과 - 주황색
      color = '#F97316'; // orange-500
    } else {
      // DB 데이터 - 우선순위: 병원/미용 기본색 → 24시간 → 진료중
      
      // 1. 먼저 병원/미용 기본 색깔 설정
      if (type === 'hospital') {
        color = '#EF4444'; // red-500 (빨강)
      } else if (type === 'grooming') {
        color = '#EC4899'; // pink-500 (핑크)
      }
      
      // 2. 24시간이면 보라색으로 덮어쓰기
      if (is24Hours) {
        color = '#9333EA'; // purple-600 (보라)
      }
      // 3. 진료중이면 초록색으로 덮어쓰기 (24시간 제외)
      else if (isOpenNow) {
        color = '#10B981'; // green-500 (초록)
      }
    }
    
    const imageSrc = `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
        <path fill="${color}" d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z"/>
        <circle cx="16" cy="16" r="8" fill="white"/>
      </svg>
    `)}`;

    const imageSize = new window.kakao.maps.Size(32, 40);
    const imageOption = { offset: new window.kakao.maps.Point(16, 40) };

    return new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  // 토스트 알림 표시
  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 2000);
  };

  // 클립보드 복사
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${type}가 복사되었습니다! 📋`);
    }).catch(() => {
      alert('복사에 실패했습니다.');
    });
  };

  const renderStars = (rating) => {
    // rating을 숫자로 변환 (안전 처리)
    const numRating = parseFloat(rating) || 0;
    
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center space-x-1">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400 text-lg">★</span>
        ))}
        {hasHalfStar && <span className="text-yellow-400 text-lg">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300 text-lg">★</span>
        ))}
        <span className="ml-2 text-sm text-gray-600 font-medium">{numRating.toFixed(1)}</span>
      </div>
    );
  };

  const filteredHospitals = getFilteredHospitals();

  if (loading || !userLocation) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!userLocation ? '위치 정보를 가져오는 중...' : '로딩 중...'}
          </p>
        </div>
      </div>
    );
  }

  // 빈 화면 조건 제거 - 카카오맵 검색이 있으므로 항상 지도 표시

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 토스트 알림 */}
      {toast.show && (
        <div 
          className="fixed top-20 left-1/2 z-[9999]"
          style={{
            transform: 'translateX(-50%)',
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <div className="bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3">
            <span className="text-lg">✅</span>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

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
                  병원/미용 지도
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
                onClick={() => navigate('/hospitals')}
                className="px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
              >
                목록으로
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
          
          {/* 필터 패널 - 왼쪽 상단 */}
          <div className="absolute top-2 left-2 lg:top-6 lg:left-6 z-10">
            {/* 모바일: 토글 버튼 */}
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="lg:hidden bg-white rounded-xl shadow-xl p-3 border-2 border-gray-200 mb-2 font-bold text-gray-900 flex items-center space-x-2"
            >
              <span>🔍</span>
              <span>{filterOpen ? '필터 닫기' : '필터 열기'}</span>
              <span>{filterOpen ? '▲' : '▼'}</span>
            </button>

            {/* 필터 내용 */}
            <div className={`bg-white rounded-xl lg:rounded-2xl shadow-xl p-3 lg:p-5 border-2 border-gray-200 max-w-[90vw] lg:max-w-xs ${filterOpen ? 'block' : 'hidden lg:block'}`}>
            <h3 className="font-bold text-gray-900 mb-4 text-base hidden lg:flex items-center">
              <span className="mr-2">🔍</span>
              필터
            </h3>
            
            {/* 구분 필터 */}
            <div className="space-y-3 mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  checked={filters.type === ''}
                  onChange={() => handleFilterChange('type', '')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">전체</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  checked={filters.type === 'hospital'}
                  onChange={() => handleFilterChange('type', 'hospital')}
                  className="w-4 h-4 text-red-600"
                />
                <span className="text-sm font-medium text-gray-700">🏥 병원</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  checked={filters.type === 'grooming'}
                  onChange={() => handleFilterChange('type', 'grooming')}
                  className="w-4 h-4 text-pink-600"
                />
                <span className="text-sm font-medium text-gray-700">✂️ 미용</span>
              </label>
            </div>

            <div className="border-t-2 border-gray-200 pt-4 space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.is_24_hours}
                  onChange={(e) => handleFilterChange('is_24_hours', e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">🌙 24시간 운영</span>
              </label>
              <p className="text-xs text-gray-500 ml-6 -mt-2">
                * DB 등록 병원만 적용
              </p>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.is_open_now}
                  onChange={(e) => handleFilterChange('is_open_now', e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">✅ 지금 진료중</span>
              </label>
              <p className="text-xs text-gray-500 ml-6 -mt-2">
                * DB 등록 병원만 적용
              </p>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.show_kakao_places}
                  onChange={(e) => handleFilterChange('show_kakao_places', e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">📍 카카오맵 주변 검색</span>
              </label>
            </div>

            {/* 범례 */}
            <div className="mt-4 pt-4 border-t-2 border-gray-200">
              <h4 className="text-xs font-bold text-gray-600 mb-3">범례</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md flex-shrink-0"></div>
                  <span className="text-xs text-gray-600">내 위치</span>
                </div>
                <div className="border-t border-gray-100 my-2"></div>
                <p className="text-xs font-semibold text-gray-700 mb-1">등록된 병원/미용</p>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-600 rounded-full shadow-md flex-shrink-0"></div>
                  <span className="text-xs text-gray-600">24시간</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full shadow-md flex-shrink-0"></div>
                  <span className="text-xs text-gray-600">진료중</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full shadow-md flex-shrink-0"></div>
                  <span className="text-xs text-gray-600">병원</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-pink-500 rounded-full shadow-md flex-shrink-0"></div>
                  <span className="text-xs text-gray-600">미용</span>
                </div>
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
        </div>

        {/* 선택된 병원 정보 */}
        {selectedHospital && (
          <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 overflow-y-auto p-4 lg:p-6 max-h-[50vh] lg:max-h-none">
            <div className="mb-4">
              {/* 배지 */}
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedHospital.type === 'hospital' ? (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    🏥 동물병원
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                    ✂️ 애견미용
                  </span>
                )}
                {selectedHospital.is_24_hours && (
                  <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-bold">
                    24시간
                  </span>
                )}
                {selectedHospital.is_open_now && !selectedHospital.is_24_hours && (
                  <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
                    진료중
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {selectedHospital.name}
              </h2>

              {/* 별점 */}
              <div className="mb-4">
                {renderStars(selectedHospital.rating || 0)}
                <p className="text-xs text-gray-500 mt-1">
                  리뷰 {selectedHospital.review_count || 0}개
                </p>
              </div>

              <p className="text-sm text-gray-600 mb-2 flex items-center justify-between">
                <span>📍 {selectedHospital.address}</span>
                <button
                  onClick={() => copyToClipboard(selectedHospital.address, '주소')}
                  className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-all font-medium"
                >
                  📋 복사
                </button>
              </p>

              {selectedHospital.phone && (
                <p className="text-sm text-gray-600 mb-4 flex items-center justify-between">
                  <span>📞 {selectedHospital.phone}</span>
                  <button
                    onClick={() => copyToClipboard(selectedHospital.phone, '전화번호')}
                    className="ml-2 px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-all font-medium"
                  >
                    📋 복사
                  </button>
                </p>
              )}

              {/* 거리 표시 */}
              {userLocation && (
                <p className="text-sm font-medium text-blue-600 mb-4">
                  🚶 현재 위치에서 약 {
                    (getDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      parseFloat(selectedHospital.latitude),
                      parseFloat(selectedHospital.longitude)
                    ) / 1000).toFixed(1)
                  }km
                </p>
              )}

              {selectedHospital.description && (
                <p className="text-gray-700 leading-relaxed mb-4 line-clamp-3">
                  {selectedHospital.description}
                </p>
              )}

              {/* 서비스 */}
              {selectedHospital.services && selectedHospital.services.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-600 mb-2">제공 서비스</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedHospital.services.slice(0, 3).map((service, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs"
                      >
                        {service}
                      </span>
                    ))}
                    {selectedHospital.services.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                        +{selectedHospital.services.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => navigate(`/hospitals/${selectedHospital.id}`)}
                  className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all"
                >
                  상세 정보 보기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 사이드바 닫기 버튼 */}
        {selectedHospital && (
          <button
            onClick={() => {
              setSelectedHospital(null);
              // InfoWindow도 닫기
              if (currentInfoWindow.current) {
                currentInfoWindow.current.close();
                currentInfoWindow.current = null;
              }
            }}
            className="absolute top-2 right-2 lg:top-4 lg:right-[25rem] bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-all z-10"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default HospitalMapPage;