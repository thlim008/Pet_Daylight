import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import KakaoMap from '../components/KakaoMap';

function MissingPetCreatePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    category: 'missing',
    species: 'dog',
    breed: '',
    name: '',
    description: '',
    latitude: 37.5665, // 서울 기본값
    longitude: 126.9780,
    address: '',
    occurred_at: new Date().toISOString().split('T')[0],
    contact: '',
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    // 컴포넌트 마운트 시 현재 위치 자동 가져오기
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
  setLoadingLocation(true);
  
  if (!navigator.geolocation) {
    alert('이 브라우저는 위치 서비스를 지원하지 않습니다.');
    setLoadingLocation(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // 카카오 Geocoder로 주소 변환 (더 정확함)
          if (window.kakao && window.kakao.maps) {
            const geocoder = new window.kakao.maps.services.Geocoder();

            // 카카오는 (경도, 위도) 순서 주의!
            geocoder.coord2Address(longitude, latitude, (result, status) => {
              if (status === window.kakao.maps.services.Status.OK) {
                const addr = result[0].address.address_name;

                setFormData(prev => ({
                  ...prev,
                  latitude: latitude,  // ← 위도
                  longitude: longitude, // ← 경도
                  address: addr
                }));

                console.log('✅ 현재 위치 (카카오):', { latitude, longitude, address: addr });
              } else {
                // 카카오 실패시 OpenStreetMap 사용
                reverseGeocode(latitude, longitude).then(addr => {
                  setFormData(prev => ({
                    ...prev,
                    latitude: latitude,
                    longitude: longitude,
                    address: addr
                  }));
                  console.log('✅ 현재 위치 (OSM):', { latitude, longitude, address: addr });
                });
              }
              setLoadingLocation(false);
            });
          } else {
            // 카카오맵 로드 안됐을 때 OpenStreetMap 사용
            const address = await reverseGeocode(latitude, longitude);
            setFormData(prev => ({
              ...prev,
              latitude: latitude,
              longitude: longitude,
              address: address
            }));
            console.log('✅ 현재 위치 (OSM):', { latitude, longitude, address });
            setLoadingLocation(false);
          }
        } catch (err) {
          console.error('❌ 주소 변환 실패:', err);
          setLoadingLocation(false);
        }
      },
      (error) => {
        console.error('❌ 위치 가져오기 실패:', error);

        let errorMessage = '위치를 가져올 수 없습니다.';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다.';
            break;
          case error.TIMEOUT:
            errorMessage = '위치 요청 시간이 초과되었습니다. 다시 시도해주세요.';
            break;
        }

        alert(errorMessage);
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko`,
        {
          headers: {
            'User-Agent': 'PetDaylight/1.0'
          }
        }
      );
      
      const data = await response.json();
      
      if (data.address) {
        const addr = data.address;
        const koreanAddress = [
          addr.province || addr.state || addr.city,
          addr.city || addr.county,
          addr.borough || addr.suburb || addr.town || addr.village,
          addr.road || addr.neighbourhood
        ].filter(Boolean).join(' ');
        
        return koreanAddress || data.display_name;
      }
      
      return data.display_name;
    } catch (err) {
      console.error('주소 변환 오류:', err);
      return '주소를 가져올 수 없습니다';
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + images.length > 5) {
      alert('이미지는 최대 5장까지 업로드할 수 있습니다.');
      return;
    }

    setImages([...images, ...files]);

    // 미리보기 생성
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleLocationSelect = (location) => {
    setFormData(prev => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = new FormData();
      
      // 🔍 디버깅 로그
      console.log('📤 전송할 데이터:', {
        category: formData.category,
        species: formData.species,
        breed: formData.breed,
        name: formData.name,
        description: formData.description,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
        occurred_at: formData.occurred_at,
        contact: formData.contact,
        images: images.length
      });
      
      data.append('category', formData.category);
      data.append('species', formData.species);
      data.append('breed', formData.breed || '');
      data.append('name', formData.name || '');
      data.append('description', formData.description);
      
      // ✅ 위도/경도를 문자열로 변환
      data.append('latitude', String(formData.latitude));
      data.append('longitude', String(formData.longitude));
      data.append('address', formData.address || '');
      
      // ✅ 날짜를 ISO datetime 형식으로 변환
      const occurredDate = new Date(formData.occurred_at);
      const occurredDateTime = occurredDate.toISOString();
      data.append('occurred_at', occurredDateTime);
      
      data.append('contact', formData.contact);
    
      // 이미지 추가
      images.forEach((image) => {
        data.append('uploaded_images', image);
      });
    
      console.log('📤 occurred_at 변환:', {
        원본: formData.occurred_at,
        변환후: occurredDateTime
      });
    
      const response = await API.post('/missing-pets/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    
      console.log('✅ 제보 등록 성공:', response.data);
      alert('제보가 등록되었습니다!');
      navigate(`/missing-pets/${response.data.id}`);
    } catch (err) {
      console.error('❌ 제보 등록 실패:', err);
      console.error('❌ 에러 응답:', err.response?.data);
      
      // 에러 메시지 표시
      let errorMsg = '제보 등록에 실패했습니다.';
      if (err.response?.data) {
        const errors = err.response.data;
        const errorDetails = Object.entries(errors)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        errorMsg += '\n\n' + errorDetails;
      }
      
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/missing-pets')}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <img 
                src="/logo.png" 
                alt="Pet Daylight" 
                className="w-14 h-14 object-contain drop-shadow-md"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <span className="text-xl font-bold text-gray-900">Pet Daylight</span>
                <p className="text-xs text-gray-500">제보 등록</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/missing-pets')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
            >
              취소
            </button>
          </div>
        </div>
      </header>

      {/* 폼 */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              카테고리 *
            </label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'missing', label: '실종', icon: '🆘', color: 'red' },
                { value: 'found', label: '발견', icon: '👀', color: 'blue' },
                { value: 'rescue', label: '구조', icon: '🚑', color: 'green' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.value })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.category === cat.value
                      ? `border-${cat.color}-500 bg-${cat.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-3xl mb-2 block">{cat.icon}</span>
                  <span className="font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 동물 종류 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              동물 종류 *
            </label>
            <select
              name="species"
              value={formData.species}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            >
              <option value="dog">강아지</option>
              <option value="cat">고양이</option>
              <option value="other">기타</option>
            </select>
          </div>

          {/* 품종 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              품종
            </label>
            <input
              type="text"
              name="breed"
              value={formData.breed}
              onChange={handleChange}
              placeholder="예: 말티즈, 페르시안 고양이"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              이름
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="반려동물 이름 (선택사항)"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* 특징 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              특징 및 설명 *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="6"
              placeholder="외모 특징, 성격, 발견 당시 상황 등을 자세히 적어주세요"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* 위치 정보 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              발생/발견 위치 *
            </label>
            
            <div className="space-y-4">
              {/* 현재 위치 버튼 */}
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={loadingLocation}
                className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loadingLocation ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-700 border-t-transparent"></div>
                    <span>위치 가져오는 중...</span>
                  </>
                ) : (
                  <>
                    <span>📍</span>
                    <span>현재 위치 가져오기</span>
                  </>
                )}
              </button>

              {/* 지도 (항상 표시) */}
              <div className="border-2 border-amber-200 rounded-2xl overflow-hidden">
                <KakaoMap
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  address={formData.address}
                  markerTitle="발생/발견 위치"
                  height="500px"
                  onLocationSelect={handleLocationSelect}
                  draggable={true}
                  showSearch={true}
                />
                <div className="bg-amber-50 p-4 text-sm text-amber-800">
                  💡 검색창에서 장소를 찾거나, 지도를 클릭하거나, 마커를 드래그하여 위치를 선택하세요
                </div>
              </div>
            </div>
          </div>

          {/* 발생 일시 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              발생/발견 날짜 *
            </label>
            <input
              type="date"
              name="occurred_at"
              value={formData.occurred_at}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>

          {/* 연락처 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              연락처 *
            </label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              placeholder="010-1234-5678"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>

          {/* 사진 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              사진 (최대 5장)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="block w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-amber-400 transition-all cursor-pointer text-center"
            >
              <span className="text-4xl mb-2 block">📷</span>
              <span className="text-gray-600">클릭하여 사진 추가</span>
            </label>

            {/* 미리보기 */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-5 gap-4 mt-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`미리보기 ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '등록 중...' : '제보 등록하기'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default MissingPetCreatePage;