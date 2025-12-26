import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';
const API_BASE_URL = 'http://localhost:8000';
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

  useEffect(() => {
    loadPet();
  }, [id]);

  const loadPet = async () => {
    try {
      setInitialLoading(true);
      const response = await API.get(`/missing-pets/${id}/`);
      const pet = response.data;
      
      console.log('✅ 제보 데이터 로드:', pet);

      // 폼 데이터 설정
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

        if (pet.images && Array.isArray(pet.images)) {
        const formattedImages = pet.images.map(img => {
          // 이미 주소 형식이면 그대로 두고, /media/로 시작하면 백엔드 주소를 붙임
          if (typeof img === 'string' && img.startsWith('http')) {
            return img;
          }
          return `${API_BASE_URL}${img}`;
        });
        setExistingImages(formattedImages);
      }
    } catch (err) {
      console.error('❌ 제보 로드 실패:', err);
      alert('제보를 찾을 수 없습니다.');
      navigate('/missing-pets');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (existingImages.length + files.length > 5) {
      setError('이미지는 최대 5장까지 업로드 가능합니다.');
      return;
    }

    setImages(files);

    // 미리보기 생성
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
    setError('');
  };

  const removeNewImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const removeExistingImage = (index) => {
    const newExisting = existingImages.filter((_, i) => i !== index);
    setExistingImages(newExisting);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          alert('현재 위치가 설정되었습니다!');
        },
        (error) => {
          console.error('위치 가져오기 실패:', error);
          alert('위치 정보를 가져올 수 없습니다.');
        }
      );
    } else {
      alert('이 브라우저는 위치 정보를 지원하지 않습니다.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 데이터 검증
      if (!formData.description) {
        setError('상세 설명을 입력해주세요.');
        setLoading(false);
        return;
      }

      if (!formData.address) {
        setError('위치를 입력해주세요.');
        setLoading(false);
        return;
      }

      if (!formData.contact) {
        setError('연락처를 입력해주세요.');
        setLoading(false);
        return;
      }

      // FormData 생성
      const data = new FormData();
      
      // 기본 필드 추가
      data.append('category', formData.category);
      data.append('species', formData.species);
      data.append('breed', formData.breed || '');
      data.append('name', formData.name || '');
      data.append('description', formData.description);
      data.append('address', formData.address);
      data.append('latitude', parseFloat(formData.latitude));
      data.append('longitude', parseFloat(formData.longitude));
      data.append('occurred_at', formData.occurred_at);
      data.append('contact', formData.contact);
      data.append('status', formData.status);
      
      // 새 이미지 파일 추가
      images.forEach((image) => {
        data.append('uploaded_images', image);
      });

      // 기존 이미지 URL 추가 (JSON 문자열로)
      data.append('existing_images', JSON.stringify(existingImages));

      console.log('📤 전송 데이터:', {
        ...formData,
        new_images_count: images.length,
        existing_images_count: existingImages.length,
      });

      const response = await API.patch(`/missing-pets/${id}/`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ 제보 수정 성공:', response.data);
      alert('제보가 수정되었습니다!');
      navigate(`/missing-pets/${id}`);
    } catch (err) {
      console.error('❌ 제보 수정 실패:', err);
      console.error('❌ 에러 응답:', err.response?.data);
      
      if (err.response?.data) {
        const errors = err.response.data;
        const errorMessages = Object.entries(errors)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        setError(`수정 실패:\n${errorMessages}`);
      } else {
        setError('제보 수정에 실패했습니다. 다시 시도해주세요.');
      }
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
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button onClick={() => navigate(`/missing-pets/${id}`)} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <img 
                  src="/logo.png"
                  alt="Pet Daylight" 
                  className="h-10 w-auto"
                />
                <div>
                  <span className="text-xl font-bold text-gray-900">Pet Daylight</span>
                  <p className="text-xs text-gray-500">제보 수정</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => navigate(`/missing-pets/${id}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
            >
              취소
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl">
            <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8 space-y-8">
            {/* 제목 */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">제보 수정</h2>
              <p className="text-gray-600">수정할 정보를 입력해주세요.</p>
            </div>

            {/* 구분 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                구분 <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-4">
                <label className="flex-1">
                  <input
                    type="radio"
                    name="category"
                    value="missing"
                    checked={formData.category === 'missing'}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-center font-medium text-gray-700 cursor-pointer peer-checked:border-red-400 peer-checked:bg-red-50 peer-checked:text-red-700 transition-all">
                    🔍 실종
                  </div>
                </label>
                <label className="flex-1">
                  <input
                    type="radio"
                    name="category"
                    value="found"
                    checked={formData.category === 'found'}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-center font-medium text-gray-700 cursor-pointer peer-checked:border-blue-400 peer-checked:bg-blue-50 peer-checked:text-blue-700 transition-all">
                    ✅ 발견
                  </div>
                </label>
              </div>
            </div>

            {/* 종류 & 품종 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종류 <span className="text-red-500">*</span>
                </label>
                <select
                  name="species"
                  value={formData.species}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                >
                  <option value="dog">🐕 강아지</option>
                  <option value="cat">🐈 고양이</option>
                  <option value="other">🐾 기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  품종
                </label>
                <input
                  type="text"
                  name="breed"
                  value={formData.breed}
                  onChange={handleChange}
                  placeholder="예: 말티즈, 페르시안 고양이"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                />
              </div>
            </div>

            {/* 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이름
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="예: 뽀삐"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
              />
            </div>

            {/* 상세 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상세 설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="5"
                placeholder="실종/발견 당시 상황, 특이사항 등을 자세히 작성해주세요."
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all resize-none"
              />
            </div>

            {/* 위치 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                위치 (주소) <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="예: 서울시 강남구 역삼동 123-45"
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all whitespace-nowrap"
                >
                  📍 현재 위치
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                위도: {formData.latitude}, 경도: {formData.longitude}
              </p>
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                required
                placeholder="010-1234-5678"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
              />
            </div>

            {/* 날짜 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                실종/발견 날짜 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="occurred_at"
                value={formData.occurred_at}
                onChange={handleChange}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
              />
            </div>

            {/* 상태 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기존 이미지
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {existingImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`기존 이미지 ${index + 1}`}
                        className="w-full h-40 object-cover rounded-xl border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 사진 추가 (최대 {5 - existingImages.length}장)
              </label>
              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={existingImages.length >= 5}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {/* 새 이미지 미리보기 */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`새 이미지 ${index + 1}`}
                          className="w-full h-40 object-cover rounded-xl border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/missing-pets/${id}`)}
              className="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '수정 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default MissingPetEditPage;