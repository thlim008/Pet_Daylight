import React, { useEffect, useRef, useState } from 'react';

function KakaoMap({ 
  latitude, 
  longitude, 
  address, 
  markerTitle = '위치',
  height = '400px',
  onLocationSelect = null,
  draggable = false,
  showSearch = false
}) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const infowindowInstance = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // 검색 관련 상태
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // address가 변경될 때 검색창에도 반영 (의존성 배열 수정)
  useEffect(() => {
    if (address) {
      setSearchKeyword(address);
    }
  }, [address]); // searchKeyword 제거

  useEffect(() => {
    // 카카오맵 SDK 로딩 대기
    const checkKakaoMaps = () => {
      if (window.kakao && window.kakao.maps) {
        setIsLoaded(true);
      } else {
        setTimeout(checkKakaoMaps, 100);
      }
    };

    checkKakaoMaps();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // 지도 생성
    const options = {
      center: new window.kakao.maps.LatLng(latitude, longitude),
      level: 3
    };

    const map = new window.kakao.maps.Map(mapContainer.current, options);
    mapInstance.current = map;

    // 마커 생성
    const markerPosition = new window.kakao.maps.LatLng(latitude, longitude);
    const marker = new window.kakao.maps.Marker({
      position: markerPosition,
      draggable: draggable
    });

    marker.setMap(map);
    markerInstance.current = marker;

    // 인포윈도우 생성
    const infowindow = new window.kakao.maps.InfoWindow({
      content: `<div style="padding:10px;min-width:150px;text-align:center;">
                  <strong>${markerTitle}</strong><br/>
                  ${address || ''}
                </div>`
    });

    infowindow.open(map, marker);
    infowindowInstance.current = infowindow;

    // 마커 드래그 이벤트
    if (draggable && onLocationSelect) {
      window.kakao.maps.event.addListener(marker, 'dragend', function() {
        const position = marker.getPosition();
        
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.coord2Address(position.getLng(), position.getLat(), (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const addr = result[0].address.address_name;
            
            onLocationSelect({
              latitude: position.getLat(),
              longitude: position.getLng(),
              address: addr
            });

            infowindow.setContent(`<div style="padding:10px;min-width:150px;text-align:center;">
                                     <strong>선택한 위치</strong><br/>
                                     ${addr}
                                   </div>`);
          }
        });
      });
    }

    // 지도 클릭 이벤트
    if (onLocationSelect) {
      window.kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
        const latlng = mouseEvent.latLng;
        
        marker.setPosition(latlng);
        
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const addr = result[0].address.address_name;
            
            onLocationSelect({
              latitude: latlng.getLat(),
              longitude: latlng.getLng(),
              address: addr
            });

            infowindow.setContent(`<div style="padding:10px;min-width:150px;text-align:center;">
                                     <strong>선택한 위치</strong><br/>
                                     ${addr}
                                   </div>`);
            infowindow.open(map, marker);
          }
        });
      });
    }

  }, [isLoaded, latitude, longitude, address, markerTitle, draggable, onLocationSelect]);

  // 장소 검색 함수
  const handleSearch = () => {
    if (!searchKeyword.trim() || !isLoaded) return;

    const ps = new window.kakao.maps.services.Places();

    ps.keywordSearch(searchKeyword, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setSearchResults(data);
        setShowResults(true);
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        alert('검색 결과가 없습니다.');
        setSearchResults([]);
      } else {
        alert('검색 중 오류가 발생했습니다.');
        setSearchResults([]);
      }
    });
  };

  // 검색 결과 선택
  const handleSelectPlace = (place) => {
    const { y: lat, x: lng, place_name, address_name } = place;

    // 지도 이동
    const moveLatLon = new window.kakao.maps.LatLng(lat, lng);
    mapInstance.current.setCenter(moveLatLon);
    mapInstance.current.setLevel(3);

    // 마커 이동
    markerInstance.current.setPosition(moveLatLon);

    // 인포윈도우 업데이트
    infowindowInstance.current.setContent(
      `<div style="padding:10px;min-width:150px;text-align:center;">
        <strong>${place_name}</strong><br/>
        ${address_name}
      </div>`
    );
    infowindowInstance.current.open(mapInstance.current, markerInstance.current);

    // 부모 컴포넌트에 위치 전달
    if (onLocationSelect) {
      onLocationSelect({
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        address: address_name
      });
    }

    // 검색 결과 닫기
    setShowResults(false);
  };

  // 엔터키 검색
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 로딩 중일 때
  if (!isLoaded) {
    return (
      <div 
        style={{ 
          width: '100%', 
          height: height,
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>지도 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 검색창 */}
      {showSearch && (
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          left: '10px', 
          right: '10px', 
          zIndex: 10 
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            backgroundColor: 'white',
            padding: '8px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowResults(searchResults.length > 0)}
              placeholder="장소, 주소 검색"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={handleSearch}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              🔍 검색
            </button>
          </div>

          {/* 검색 결과 */}
          {showResults && searchResults.length > 0 && (
            <div style={{
              marginTop: '8px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {searchResults.map((place, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectPlace(place)}
                  style={{
                    padding: '12px',
                    borderBottom: index < searchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef3c7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                    📍 {place.place_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {place.address_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 지도 */}
      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: height,
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      />
    </div>
  );
}

export default KakaoMap;
