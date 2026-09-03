import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';
import KakaoMap from '../components/KakaoMap';
import { formatPhoneInput, isValidPhone } from '../utils/phone';

const API_BASE_URL = 'https://petdaylight.mooo.com';

function MissingPetEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    category: 'missing',
    species: 'dog',
    breed: '',
    name: '',
    description: '',
    address: '',
    latitude: 37.5665,
    longitude: 126.9780,
    occurred_at: new Date().toISOString().split('T')[0],
    contact: '',
    status: 'active',
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);

  useEffect(() => {
    loadPet();
  }, [id]);

  const loadPet = async () => {
    try {
      setInitialLoading(true);
      const response = await API.get(`/missing-pets/${id}/`);
      const pet = response.data;
      
      console.log('LOG', pet);

      setFormData({
        category: pet.category,
        species: pet.species,
        breed: pet.breed || '',
        name: pet.name || '',
        description: pet.description,
        address: pet.address,
        latitude: pet.latitude,
        longitude: pet.longitude,
        occurred_at: pet.occurred_at.split('T')[0],
        contact: pet.contact,
        status: pet.status,
      });

      if (pet.images_full_url && pet.images_full_url.length > 0) {
        setExistingImages(pet.images_full_url);
      }

    } catch (err) {
      console.error('LOG', err);
      alert('제보를 불러오는데 실패했습니다.');
      navigate('/missing-pets');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const totalImages = existingImages.length + images.length + files.length;

    if (totalImages > 3) {
      alert('최대 3장까지 업로드 가능합니다.');
      return;
    }

    setImages(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeNewImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationSelect = (location) => {
    setFormData(prev => ({
      ...prev,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude
    }));
  };

  // 지역/장소 검색으로 위치 설정 (상단 검색바)
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
        handleLocationSelect({
          latitude: parseFloat(place.y),
          longitude: parseFloat(place.x),
          address: place.road_address_name || place.address_name || place.place_name,
        });
      } else {
        alert('검색 결과가 없습니다. 다른 검색어로 시도해보세요.');
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.species || !formData.description || !formData.address || !formData.occurred_at || !formData.contact) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    if (!isValidPhone(formData.contact)) {
      alert('연락처 형식이 올바르지 않습니다. (예: 010-1234-5678)');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data = new FormData();
      data.append('category', formData.category);
      data.append('species', formData.species);
      data.append('breed', formData.breed);
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('address', formData.address);
      data.append('latitude', formData.latitude);
      data.append('longitude', formData.longitude);
      data.append('occurred_at', formData.occurred_at);
      data.append('contact', formData.contact);
      data.append('status', formData.status);

      images.forEach(image => {
        data.append('uploaded_images', image);
      });

      if (existingImages.length > 0) {
        data.append('existing_images', JSON.stringify(existingImages));
      }

      await API.patch(`/missing-pets/${id}/`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('제보가 수정되었습니다!');
      navigate(`/missing-pets/${id}`);
    } catch (err) {
      console.error('LOG', err);
      setError(err.response?.data?.error || '제보 수정에 실패했습니다.');
      alert(err.response?.data?.error || '제보 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
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
                <p className="text-xs text-gray-500">제보 수정</p>
              </div>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>취소</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">제보 수정</h1>
            <p className="text-gray-600 mb-8">제보 내용을 수정해주세요</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-8">
              {/* 카테고리 선택 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  카테고리 *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: 'missing' }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.category === 'missing'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">🔍</div>
                    <div className="font-medium">실종</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: 'found' }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.category === 'found'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">✅</div>
                    <div className="font-medium">발견</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: 'rescue' }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.category === 'rescue'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">🚨</div>
                    <div className="font-medium">구조</div>
                  </button>
                </div>
              </div>

              {/* 동물 종류 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  동물 종류 *
                </label>
                <select
                  name="species"
                  value={formData.species}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                >
                  <option value="dog">강아지</option>
                  <option value="cat">고양이</option>
                  <option value="other">기타</option>
                </select>
              </div>

              {/* 품종 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  품종
                </label>
                <input
                  type="text"
                  name="breed"
                  value={formData.breed}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  placeholder="예: 말티즈, 페르시안 등"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                />
              </div>

              {/* 이름 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  이름
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  placeholder="반려동물 이름"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                />
              </div>

              {/* 특징 및 설명 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  특징 및 설명 *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="5"
                  placeholder="외형적 특징, 성격, 특이사항 등을 자세히 작성해주세요"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all resize-none"
                />
              </div>

              {/* 발생/발견 위치 - KakaoMap으로 교체 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  발생/발견 위치 *
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLocationSearch(); } }}
                    placeholder="지역/장소 검색 (예: 강남역, 서울시 종로구)"
                    className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleLocationSearch}
                    disabled={searchingLocation}
                    className="px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 whitespace-nowrap"
                  >
                    {searchingLocation ? '검색중...' : '검색'}
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden border-2 border-gray-200">
                  <KakaoMap
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    address={formData.address}
                    markerTitle="발생/발견 위치"
                    height="500px"
                    onLocationSelect={handleLocationSelect}
                    draggable={true}
                    showSearch={false}
                  />
                </div>
                {formData.address && (
                  <p className="mt-2 text-sm text-gray-600">
                    선택된 위치: {formData.address}
                  </p>
                )}
              </div>

              {/* 발생/발견 날짜 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  발생/발견 날짜 *
                </label>
                <input
                  type="date"
                  name="occurred_at"
                  value={formData.occurred_at}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                />
              </div>

              {/* 연락처 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  연락처 *
                </label>
                <input
                  type="tel"
                  name="contact"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: formatPhoneInput(e.target.value) })}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  maxLength={13}
                  placeholder="010-0000-0000"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                />
              </div>

              {/* 진행 상태 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  진행 상태
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                >
                  <option value="active">진행중</option>
                  <option value="resolved">해결됨</option>
                  <option value="closed">종료</option>
                </select>
              </div>

              {/* 기존 이미지 */}
              {existingImages.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    기존 사진
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {existingImages.map((image, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                        <img
                          src={image}
                          alt={`기존 사진 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center text-xl font-bold leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 새 이미지 업로드 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  {existingImages.length > 0 ? '추가 사진' : '사진 업로드'} (최대 {Math.max(3 - existingImages.length, 0)}장)
                </label>
                
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                        <img
                          src={preview}
                          alt={`미리보기 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center text-xl font-bold leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {(existingImages.length + images.length) < 3 && (
                  <label className="block w-full p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-amber-400 transition-colors cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        클릭하여 사진 추가 (최대 {3 - existingImages.length - images.length}장)
                      </p>
                    </div>
                  </label>
                )}
              </div>

              {/* 제출 버튼 */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '수정 중...' : '수정 완료'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default MissingPetEditPage;