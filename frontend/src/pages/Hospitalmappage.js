import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { authAPI } from '../services/api';

function HospitalMapPage() {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(null); // ✅ null로 시작 (로딩 전)
  const [kakaoPlaces, setKakaoPlaces] = useState([]); // 카카오맵 검색 결과
  const currentInfoWindow = useRef(null); // useState 대신 useRef 사용!
  const [toast, setToast] = useState({ show: false, message: '' }); // 토스트 알림
  const [filterOpen, setFilterOpen] = useState(false); // 필터 패널 열림/닫힘 (모바일)
  const myLocationMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const isFirstMapCenter = useRef(true);
  const kakaoSearchGen = useRef(0); // 겹쳐 도는 카카오 검색 중 최신 것만 결과를 반영하기 위한 세대 번호
  const loadHospitalsRequestId = useRef(0); // 겹쳐 도는 병원 목록 요청 중 최신 것만 반영하기 위한 요청 번호
  const [locationQuery, setLocationQuery] = useState('');
  const [searchedPlaceLabel, setSearchedPlaceLabel] = useState(null);
  const [searchingLocation, setSearchingLocation] = useState(false);

  // 필터 상태
  const [filters, setFilters] = useState({
    type: '', // hospital, grooming
    is_24_hours: false,
    is_open_now: false,
    show_kakao_places: true, // 카카오맵 검색 결과 표시 (기본 활성화)
  });

  // ✅ 1단계: 사용자 설정과 위치 동시에 로드
  useEffect(() => {
    const initialize = async () => {
      await loadUserSettings();
      getUserLocation();
    };
    initialize();
  }, []);

  // ✅ 2단계: 위치와 검색반경이 모두 준비되면 병원 로드 (슬라이더 드래그 중 겹쳐 도는 걸 막기 위해 디바운스)
  useEffect(() => {
    if (userLocation && searchRadius !== null) {
      const timer = setTimeout(() => loadHospitals(), 400);
      return () => clearTimeout(timer);
    }
  }, [userLocation, searchRadius]);

  // ✅ 3단계: 지도 초기화 - DOM 렌더링 후 약간의 딜레이
  useEffect(() => {
    if (
      userLocation &&
      searchRadius !== null &&
      !map &&
      !loading
    ) {
      // DOM이 완전히 렌더링될 때까지 약간 대기
      const timer = setTimeout(() => {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
          initMap();
        } else {
          console.error('❌ map 컨테이너를 찾을 수 없습니다.');
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [userLocation, searchRadius, loading]);

  // 필터 변경, 지도 생성, DB 병원 목록/카카오 검색 결과 도착 시 마커 재생성
  useEffect(() => {
    if (map) {
      updateMarkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, map, hospitals, kakaoPlaces]);

  // ✅ 사용자 설정 로드 (검색 반경) - Promise 반환
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

  // 현재 위치 가져오기
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      alert('위치 서비스를 지원하지 않는 브라우저입니다.');
      setUserLocation({ latitude: 37.5665, longitude: 126.9780 }); // 서울 기본값
      return;
    }


    const locationOptions = {
      enableHighAccuracy: false, // 빠른 응답을 위해 false로 변경
      timeout: 30000, // 30초로 증가
      maximumAge: 300000 // 5분 이내 캐시된 위치 사용
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
      },
      (error) => {
        console.error('❌ 위치 가져오기 실패:', error);
        
        // 재시도 (정확도 낮춰서)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
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

  // ✅ 병원 로드 - searchRadius 확인 후 실행
  const loadHospitals = async () => {
    if (!userLocation || searchRadius === null) {
      setLoading(false);
      return;
    }

    const requestId = ++loadHospitalsRequestId.current;

    try {
      setLoading(true);
      const params = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: Math.min(searchRadius, 20000)
      };

      const response = await API.get('/hospitals/', { params });
      if (requestId !== loadHospitalsRequestId.current) return; // 더 최신 요청이 나갔으면 이 응답은 버림

      const data = response.data.results || response.data;
      const validHospitals = data.filter(h => h.latitude && h.longitude);

      setHospitals(validHospitals);
    } catch (err) {
      if (requestId !== loadHospitalsRequestId.current) return;
      console.error('❌ 병원 로드 실패:', err);
    } finally {
      if (requestId === loadHospitalsRequestId.current) setLoading(false);
    }
  };

  // 카카오맵 Places API로 주변 병원/미용실 검색
  const searchKakaoPlaces = (kakaoMap, location = userLocation) => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      console.error('❌ 카카오맵 Places API가 로드되지 않았습니다.');
      return;
    }

    // 이 검색이 도중에 다른 검색(반경/위치 변경 등)으로 대체되면 결과를 버리기 위한 세대 번호
    const myGen = ++kakaoSearchGen.current;
    const isStale = () => myGen !== kakaoSearchGen.current;

    const places = new window.kakao.maps.services.Places();
    const allPlaces = [];
    const allMarkers = []; // 마커를 즉시 저장

    // 카카오맵 API는 최대 반경 20km까지만 지원
    // 사용자 설정 반경이 20km 넘으면 20km로 제한
    const effectiveRadius = Math.min(searchRadius, 20000);


    const searchOptions = {
      location: new window.kakao.maps.LatLng(location.latitude, location.longitude),
      radius: effectiveRadius,
      sort: window.kakao.maps.services.SortBy.DISTANCE
    };


    // 동물병원 검색 (여러 키워드로 검색)
    const hospitalKeywords = ['동물병원', '24시 동물병원', '반려동물병원'];
    let hospitalSearchCount = 0;

    hospitalKeywords.forEach((keyword, index) => {
      setTimeout(() => {
        if (isStale()) return;
        places.keywordSearch(keyword, (result, status) => {
          if (isStale()) return;
          if (status === window.kakao.maps.services.Status.OK) {
            result.forEach(place => {
              // 중복 제거 (같은 ID는 하나만 + 이미 DB에 저장된 곳은 제외)
              const alreadyInDb = hospitals.some(h => h.kakao_place_id === place.id);
              if (!alreadyInDb && !allPlaces.find(p => p.kakao_id === place.id)) {
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
          if (isStale()) return;
          places.keywordSearch(keyword, (result, status) => {
            if (isStale()) return;
            if (status === window.kakao.maps.services.Status.OK) {
              result.forEach(place => {
                // 중복 제거 (같은 ID는 하나만 + 이미 DB에 저장된 곳은 제외)
                const alreadyInDb = hospitals.some(h => h.kakao_place_id === place.id);
                if (!alreadyInDb && !allPlaces.find(p => p.kakao_id === place.id)) {
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
            }

            groomingSearchCount++;

            // 모든 검색 완료
            if (groomingSearchCount === groomingKeywords.length) {
              if (isStale()) {
                // 이 검색이 이미 대체됐으면 지금까지 만든 마커를 지도에서 지우고 버림
                allMarkers.forEach(m => m.setMap(null));
                return;
              }
              setKakaoPlaces(allPlaces);

              if (allPlaces.length === 0) {
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
    myLocationMarkerRef.current = myLocationMarker;

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
    radiusCircleRef.current = circle;

    // 초기 마커 생성 (DB 데이터가 있으면)
    if (hospitals.length > 0) {
      createMarkers(kakaoMap, hospitals);
    }

    // 카카오맵 Places API로 주변 검색
    searchKakaoPlaces(kakaoMap);
  };


  // 지도가 이미 떠 있는 상태에서 검색 기준 위치가 바뀌면 지도/마커를 새 위치로 이동
  const moveMapToLocation = (lat, lng) => {
    if (!map) return;
    const center = new window.kakao.maps.LatLng(lat, lng);
    map.setCenter(center);
    map.setLevel(getMapLevel(searchRadius));
    if (myLocationMarkerRef.current) myLocationMarkerRef.current.setPosition(center);

    // Circle은 setPosition 대신 안전하게 재생성 (버전에 따라 setPosition 미지원 가능)
    if (radiusCircleRef.current) radiusCircleRef.current.setMap(null);
    const newCircle = new window.kakao.maps.Circle({
      center,
      radius: searchRadius,
      strokeWeight: 2,
      strokeColor: '#3B82F6',
      strokeOpacity: 0.5,
      strokeStyle: 'dashed',
      fillColor: '#3B82F6',
      fillOpacity: 0.1
    });
    newCircle.setMap(map);
    radiusCircleRef.current = newCircle;

    // 기존 마커 제거하고 새 위치 기준으로 카카오 장소 재검색
    markers.forEach((m) => m.setMap(null));
    setMarkers([]);
    setKakaoPlaces([]);
    searchKakaoPlaces(map, { latitude: lat, longitude: lng });
  };

  useEffect(() => {
    if (!map || !userLocation) return;
    if (isFirstMapCenter.current) {
      // initMap이 이미 이 좌표로 지도를 생성했으므로 최초 1회는 건너뜀
      isFirstMapCenter.current = false;
      return;
    }
    // 반경 슬라이더를 드래그하는 동안 매 틱마다 카카오 재검색이 겹쳐 도는 걸 막기 위해 디바운스
    const timer = setTimeout(() => {
      moveMapToLocation(userLocation.latitude, userLocation.longitude);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, map, searchRadius]);

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
      } else {
        alert('검색 결과가 없습니다. 다른 검색어로 시도해보세요.');
      }
    });
  };

  const handleResetToMyLocation = () => {
    setSearchedPlaceLabel(null);
    setLocationQuery('');
    getUserLocation();
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

    // 카카오 검색의 radius 옵션은 sort:DISTANCE와 함께 쓰면 엄격한 필터가 아니라
    // 정렬 기준에 가깝게 동작해서 반경 밖 결과가 섞여 나올 수 있음 - 직접 재검증
    if (userLocation && searchRadius) {
      filtered = filtered.filter(place => {
        const distance = getDistance(
          userLocation.latitude,
          userLocation.longitude,
          parseFloat(place.latitude),
          parseFloat(place.longitude)
        );
        return distance <= searchRadius;
      });
    }

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
    if (userLocation && searchRadius) {
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

      // 마커 클릭 이벤트 - DB 병원도 카카오 장소와 동일하게 마커 위 InfoWindow로 표시
      window.kakao.maps.event.addListener(marker, 'click', () => {
        showHospitalInfoWindow(hospital, marker, kakaoMap);
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

  // DB 등록 병원 정보창 표시 (카카오 장소 InfoWindow와 동일한 스타일로 통일)
  const showHospitalInfoWindow = (hospital, marker, kakaoMap) => {
    if (currentInfoWindow.current) {
      currentInfoWindow.current.close();
    }

    window.copyHospitalInfo = (text, type) => {
      copyToClipboard(text, type);
    };

    window.viewHospitalDetail = () => {
      navigate(`/hospitals/${hospital.id}`);
    };

    const distance = userLocation
      ? getDistance(
          userLocation.latitude,
          userLocation.longitude,
          parseFloat(hospital.latitude),
          parseFloat(hospital.longitude)
        )
      : null;

    const statusBadge = hospital.is_24_hours
      ? `<span style="display:inline-block; padding:3px 8px; background:#EDE9FE; color:#5B21B6; border-radius:12px; font-size:11px; font-weight:600; margin-left:4px;">24시간</span>`
      : hospital.is_open_now
      ? `<span style="display:inline-block; padding:3px 8px; background:#D1FAE5; color:#065F46; border-radius:12px; font-size:11px; font-weight:600; margin-left:4px;">운영중</span>`
      : '';

    const ratingValue = parseFloat(hospital.rating) || 0;
    const filledStars = Math.round(ratingValue);
    const starsHtml = '★'.repeat(filledStars) + '☆'.repeat(5 - filledStars);

    const content = `
      <div style="padding:18px; width:280px; min-height:200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-sizing:border-box;">
        <div style="margin-bottom:8px;">
          <span style="display:inline-block; padding:3px 8px; background:${hospital.type === 'hospital' ? '#FEE2E2' : '#FCE7F3'}; color:${hospital.type === 'hospital' ? '#991B1B' : '#831843'}; border-radius:12px; font-size:11px; font-weight:600;">
            ${hospital.type === 'hospital' ? '🏥 병원' : '✂️ 미용'}
          </span>
          ${statusBadge}
        </div>
        <h3 style="margin:0 0 6px 0; font-weight:700; font-size:15px; color:#111827; word-break:keep-all;">
          ${hospital.name}
        </h3>
        <p style="margin:0 0 10px 0; font-size:12px; color:#F59E0B; font-weight:600;">
          ${starsHtml} ${ratingValue.toFixed(1)} (리뷰 ${hospital.review_count || 0}개)
        </p>

        <div style="display:flex; align-items:flex-start; margin:4px 0; gap:6px;">
          <p style="margin:0; font-size:12px; color:#6B7280; line-height:1.4; flex:1; word-break:keep-all;">
            📍 ${hospital.address}
          </p>
          <button
            onclick="window.copyHospitalInfo('${(hospital.address || '').replace(/'/g, "\\'")}', '주소')"
            style="padding:4px 8px; background:#3B82F6; color:white; border:none; border-radius:6px; font-size:10px; font-weight:600; cursor:pointer; white-space:nowrap; flex-shrink:0;"
            title="주소 복사"
          >
            📋 복사
          </button>
        </div>

        ${hospital.phone ? `
          <div style="display:flex; align-items:center; margin:4px 0; gap:6px;">
            <p style="margin:0; font-size:12px; color:#6B7280; flex:1;">
              📞 ${hospital.phone}
            </p>
            <button
              onclick="window.copyHospitalInfo('${hospital.phone}', '전화번호')"
              style="padding:4px 8px; background:#10B981; color:white; border:none; border-radius:6px; font-size:10px; font-weight:600; cursor:pointer; white-space:nowrap; flex-shrink:0;"
              title="전화번호 복사"
            >
              📋 복사
            </button>
          </div>
        ` : ''}

        ${distance !== null ? `
          <p style="margin:10px 0; font-size:13px; color:#3B82F6; font-weight:600;">
            🚶 현재 위치에서 약 ${(distance / 1000).toFixed(1)}km
          </p>
        ` : ''}

        <button
          onclick="window.viewHospitalDetail()"
          style="width:100%; padding:12px 16px; background:#111827; color:white; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top:5px;"
          onmouseover="this.style.background='#1F2937'"
          onmouseout="this.style.background='#111827'"
        >
          📝 상세보기 & 리뷰
        </button>
      </div>
    `;

    const infowindow = new window.kakao.maps.InfoWindow({
      content: content,
      removable: false
    });

    infowindow.open(kakaoMap, marker);
    currentInfoWindow.current = infowindow;
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
      <div style="padding:18px; width:280px; min-height:200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-sizing:border-box;">
        <div style="margin-bottom:8px;">
          <span style="display:inline-block; padding:3px 8px; background:${place.type === 'hospital' ? '#FEE2E2' : '#FCE7F3'}; color:${place.type === 'hospital' ? '#991B1B' : '#831843'}; border-radius:12px; font-size:11px; font-weight:600;">
            ${place.type === 'hospital' ? '🏥 병원' : '✂️ 미용'}
          </span>
        </div>
        <h3 style="margin:0 0 10px 0; font-weight:700; font-size:15px; color:#111827; word-break:keep-all;">
          ${place.name}
        </h3>
        
        <!-- 주소 + 복사 버튼 -->
        <div style="display:flex; align-items:flex-start; margin:4px 0; gap:6px;">
          <p style="margin:0; font-size:12px; color:#6B7280; line-height:1.4; flex:1; word-break:keep-all;">
            📍 ${place.address}
          </p>
          <button 
            onclick="window.copyKakaoInfo('${place.address.replace(/'/g, "\\'")}', '주소')"
            style="padding:4px 8px; background:#3B82F6; color:white; border:none; border-radius:6px; font-size:10px; font-weight:600; cursor:pointer; white-space:nowrap; flex-shrink:0;"
            title="주소 복사"
          >
            📋 복사
          </button>
        </div>
        
        ${place.phone ? `
          <!-- 전화번호 + 복사 버튼 -->
          <div style="display:flex; align-items:center; margin:4px 0; gap:6px;">
            <p style="margin:0; font-size:12px; color:#6B7280; flex:1;">
              📞 ${place.phone}
            </p>
            <button 
              onclick="window.copyKakaoInfo('${place.phone}', '전화번호')"
              style="padding:4px 8px; background:#10B981; color:white; border:none; border-radius:6px; font-size:10px; font-weight:600; cursor:pointer; white-space:nowrap; flex-shrink:0;"
              title="전화번호 복사"
            >
              📋 복사
            </button>
          </div>
        ` : ''}
        
        <p style="margin:10px 0; font-size:13px; color:#3B82F6; font-weight:600;">
          🚶 약 ${(place.distance / 1000).toFixed(1)}km
        </p>
        
        <!-- 상세보기 버튼 -->
        <button
          onclick="window.viewKakaoDetail()"
          style="width:100%; padding:12px 16px; background:#111827; color:white; border:none; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top:5px;"
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
        color = '#EAB308'; // yellow-500 (노랑)
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

  // ✅ 로딩 조건 수정: searchRadius도 체크
  if ((loading && !map) || !userLocation || searchRadius === null) {
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

      {/* 검색 위치 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex flex-wrap items-center gap-2">
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
      </div>

      {/* 메인: 지도 + 사이드바 */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-136px)]">
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
                <span className="text-sm font-medium text-gray-700">✅ 지금 운영중</span>
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
                <span className="text-sm font-medium text-gray-700">📍 주변 검색</span>
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
                  <span className="text-xs text-gray-600">운영중</span>
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

            {/* 검색 반경 정보 (이 화면에서만 적용, 알림 설정은 안 바뀜) */}
            <div className="mt-4 pt-4 border-t-2 border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 border-2 border-dashed border-blue-500 rounded-full flex-shrink-0"></div>
                <span className="text-xs font-medium text-gray-600">검색 반경</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">1km</span>
                <p className="text-lg font-bold text-blue-600">
                  {searchRadius >= 999999 ? '전국' : `${(searchRadius / 1000).toFixed(0)}km`}
                </p>
                <span className="text-xs text-gray-400">20km</span>
              </div>
              <input
                type="range"
                min={1000}
                max={20000}
                step={1000}
                value={Math.min(searchRadius || 1000, 20000)}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <p className="mt-1 text-[11px] text-gray-400">이 화면에서만 적용돼요</p>
            </div>
          </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default HospitalMapPage;