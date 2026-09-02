import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';

function PetFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog',
    breed: '',
    gender: 'unknown',
    is_neutered: false,
    neutered_date: '',
    birth_date: '',
    birth_date_unknown: false,
    adoption_date: '',
    weight: '',
    notes: '',
    profile_image: null,
    is_active: true
  });

  useEffect(() => {
    if (isEditMode) {
      loadPet();
    }
  }, [id]);

  const loadPet = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/lifecycles/pets/${id}/`);
      setFormData({
        name: response.data.name || '',
        species: response.data.species || 'dog',
        breed: response.data.breed || '',
        gender: response.data.gender || 'unknown',
        is_neutered: response.data.is_neutered || false,
        neutered_date: response.data.neutered_date || '',
        birth_date: response.data.birth_date || '',
        birth_date_unknown: response.data.birth_date_unknown || false,
        adoption_date: response.data.adoption_date || '',
        weight: response.data.weight || '',
        notes: response.data.notes || '',
        profile_image: response.data.profile_image || null,
        is_active: response.data.is_active !== undefined ? response.data.is_active : true
      });
      
      // 기존 이미지 미리보기 설정
      if (response.data.profile_image) {
        setImagePreview(response.data.profile_image);
      }
    } catch (err) {
      console.error('❌ 펫 로드 실패:', err);
      alert('펫 정보를 불러올 수 없습니다.');
      navigate('/lifecycles/pets');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일 크기 체크 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 크기는 5MB 이하여야 합니다.');
        return;
      }

      // 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
      }

      setImageFile(file);
      
      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = async () => {
    // 수정 모드이고 기존 이미지가 있으면 서버에서 삭제
    if (isEditMode && formData.profile_image) {
      try {
        await API.delete(`/lifecycles/pets/${id}/profile-image/`);
        alert('프로필 사진이 삭제되었습니다.');
      } catch (error) {
        console.error('프로필 사진 삭제 실패:', error);
        alert('프로필 사진 삭제에 실패했습니다.');
        return;
      }
    }
    
    // 로컬 상태 초기화
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, profile_image: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      
      // FormData 생성 (파일 업로드용)
      const submitData = new FormData();
      
      // 기본 필드 추가
      submitData.append('name', formData.name);
      submitData.append('species', formData.species);
      submitData.append('breed', formData.breed || '');
      submitData.append('gender', formData.gender);
      submitData.append('is_neutered', formData.is_neutered);
      submitData.append('is_active', formData.is_active);
      submitData.append('birth_date_unknown', formData.birth_date_unknown);
      submitData.append('notes', formData.notes || '');
      
      // 날짜 필드 (null 체크)
      if (formData.neutered_date) submitData.append('neutered_date', formData.neutered_date);
      if (formData.birth_date_unknown) {
        submitData.append('birth_date', '');
      } else if (formData.birth_date) {
        submitData.append('birth_date', formData.birth_date);
      }
      if (formData.adoption_date) submitData.append('adoption_date', formData.adoption_date);
      
      // 몸무게
      if (formData.weight) submitData.append('weight', formData.weight);
      
      // 이미지 파일 (새로 선택한 경우만)
      if (imageFile) {
        submitData.append('profile_image', imageFile);
      }

      if (isEditMode) {
        await API.put(`/lifecycles/pets/${id}/`, submitData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        alert('수정되었습니다!');
      } else {
        await API.post('/lifecycles/pets/', submitData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        alert('등록되었습니다!');
      }
      
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ 저장 실패:', err);
      alert('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      setLoading(true);
      await API.delete(`/lifecycles/pets/${id}/`);
      alert('삭제되었습니다.');
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ 삭제 실패:', err);
      alert('삭제에 실패했습니다.');
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
                <p className="text-xs text-gray-500">{isEditMode ? '펫 정보 수정' : '새 가족 등록'}</p>
              </div>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>취소</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 border border-gray-200">
          {/* 프로필 이미지 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">프로필 사진</h2>
            
            <div className="flex items-start gap-6">
              {/* 이미지 미리보기 */}
              <div className="flex-shrink-0">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="프로필 미리보기"
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center border-4 border-gray-200">
                    <span className="text-5xl">📷</span>
                  </div>
                )}
              </div>

              {/* 업로드 버튼 */}
              <div className="flex-1">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <div className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all cursor-pointer inline-block">
                    📁 사진 선택
                  </div>
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  • 최대 5MB<br />
                  • JPG, PNG, GIF 가능
                </p>
              </div>
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">기본 정보</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="예: 뭉치"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              {/* 종류 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종류 <span className="text-red-500">*</span>
                </label>
                <select
                  name="species"
                  value={formData.species}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="dog">🐕 강아지</option>
                  <option value="cat">🐱 고양이</option>
                  <option value="other">🐾 기타</option>
                </select>
              </div>

              {/* 품종 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.species === 'other' ? '구체적인 종류' : '품종'}
                </label>
                <input
                  type="text"
                  name="breed"
                  value={formData.breed}
                  onChange={handleChange}
                  placeholder={formData.species === 'other' ? '예: 도마뱀, 햄스터, 앵무새' : '예: 골든리트리버'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              {/* 성별 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  성별
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="unknown">모름</option>
                  <option value="male">수컷</option>
                  <option value="female">암컷</option>
                </select>
              </div>
            </div>
          </div>

          {/* 건강 정보 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">건강 정보</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 중성화 */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_neutered"
                    checked={formData.is_neutered}
                    onChange={handleChange}
                    className="w-5 h-5 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    중성화 완료
                  </span>
                </label>
              </div>

              {/* 무지개다리 */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={!formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: !e.target.checked }))}
                    className="w-5 h-5 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    🌈 무지개다리를 건넜어요
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* 중성화 날짜 */}
              {formData.is_neutered && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    중성화 수술일
                  </label>
                  <input
                    type="date"
                    name="neutered_date"
                    value={formData.neutered_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* 몸무게 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  몸무게 (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="예: 8.5"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* 날짜 정보 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">날짜 정보</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 생년월일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  생년월일
                </label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  disabled={formData.birth_date_unknown}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="birth_date_unknown"
                    checked={formData.birth_date_unknown}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        birth_date_unknown: checked,
                        birth_date: checked ? '' : prev.birth_date
                      }));
                    }}
                    className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-xs text-gray-600">생년월일을 모름</span>
                </label>
              </div>

              {/* 입양일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  입양일
                </label>
                <input
                  type="date"
                  name="adoption_date"
                  value={formData.adoption_date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* 메모 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">메모</h2>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="특이사항이나 기억하고 싶은 내용을 자유롭게 적어보세요."
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* 버튼 */}
          <div className="flex items-center justify-between">
            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all disabled:opacity-50"
              >
                삭제
              </button>
            )}
            
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={loading}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all disabled:opacity-50"
              >
                {loading ? '저장 중...' : isEditMode ? '수정하기' : '등록하기'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default PetFormPage;
