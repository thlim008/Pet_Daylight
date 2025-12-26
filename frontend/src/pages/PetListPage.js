import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function PetListPage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog',
    breed: '',
    gender: 'unknown',
    is_neutered: false,
    neutered_date: '',
    birth_date: '',
    adoption_date: '',
    weight: '',
    notes: '',
    profile_image: null,
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      setLoading(true);
      const response = await API.get('/lifecycles/pets/');
      setPets(response.data.results || response.data);
    } catch (err) {
      console.error('❌ 반려동물 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = new FormData();
      
      // 디버깅: 전송할 데이터 확인
      console.log('📤 전송할 formData:', formData);
      
      // 필수: is_active는 항상 true (활성 상태)
      submitData.append('is_active', 'true');
      
      // 각 필드별로 처리
      // 이름 (필수)
      if (formData.name) {
        submitData.append('name', formData.name);
      }
      
      // 종류, 성별 (필수)
      if (formData.species) {
        submitData.append('species', formData.species);
      }
      if (formData.gender) {
        submitData.append('gender', formData.gender);
      }
      
      // 품종 (선택)
      if (formData.breed) {
        submitData.append('breed', formData.breed);
      }
      
      // 중성화 (boolean)
      submitData.append('is_neutered', formData.is_neutered ? 'true' : 'false');
      
      // 날짜 필드들 (선택)
      if (formData.neutered_date) {
        submitData.append('neutered_date', formData.neutered_date);
      }
      if (formData.birth_date) {
        submitData.append('birth_date', formData.birth_date);
      }
      if (formData.adoption_date) {
        submitData.append('adoption_date', formData.adoption_date);
      }
      
      // 몸무게 (숫자, 선택)
      if (formData.weight !== '' && formData.weight !== null && formData.weight !== undefined) {
        submitData.append('weight', formData.weight);
        console.log('⚖️ weight:', formData.weight, typeof formData.weight);
      }
      
      // 메모 (선택)
      if (formData.notes) {
        submitData.append('notes', formData.notes);
      }
      
      // 이미지 (선택)
      if (formData.profile_image instanceof File) {
        submitData.append('profile_image', formData.profile_image);
        console.log('🖼️ 이미지 추가:', formData.profile_image.name);
      }

      console.log('🟢 is_active: true (항상 활성)');
      console.log('🚀 전송 시작...');
      
      // FormData 내용 확인
      console.log('📦 FormData 내용:');
      for (let pair of submitData.entries()) {
        console.log(`  ${pair[0]}: ${pair[1]}`);
      }
      
      if (editingPet) {
        // 수정 시에는 PATCH 사용 (부분 업데이트)
        const response = await API.patch(`/lifecycles/pets/${editingPet.id}/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('✅ 수정 성공:', response.data);
      } else {
        const response = await API.post('/lifecycles/pets/', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('✅ 생성 성공:', response.data);
      }
      
      setShowForm(false);
      setEditingPet(null);
      resetForm();
      loadPets();
    } catch (err) {
      console.error('❌ 저장 실패:', err);
      console.error('❌ 에러 상세:', err.response?.data);
      alert('저장에 실패했습니다:\n' + JSON.stringify(err.response?.data || err.message, null, 2));
    }
  };

  const handleEdit = (pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      gender: pet.gender,
      is_neutered: pet.is_neutered || false,
      neutered_date: pet.neutered_date || '',
      birth_date: pet.birth_date || '',
      adoption_date: pet.adoption_date || '',
      weight: pet.weight !== null && pet.weight !== undefined ? pet.weight : '',
      notes: pet.notes || '',
      profile_image: null,
    });
    setImagePreview(pet.profile_image || null);
    setShowForm(true);
    
    console.log('📝 수정 모드:', pet);
    console.log('📝 로드된 데이터:', {
      name: pet.name,
      weight: pet.weight,
      is_neutered: pet.is_neutered
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await API.delete(`/lifecycles/pets/${id}/`);
      loadPets();
    } catch (err) {
      console.error('❌ 삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('무지개다리를 건넌 것으로 표시하시겠습니까?')) return;
    try {
      await API.patch(`/lifecycles/pets/${id}/deactivate/`);
      loadPets();
    } catch (err) {
      console.error('❌ 비활성화 실패:', err);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      species: 'dog',
      breed: '',
      gender: 'unknown',
      is_neutered: false,
      neutered_date: '',
      birth_date: '',
      adoption_date: '',
      weight: '',
      notes: '',
      profile_image: null,
    });
    setImagePreview(null);
    setEditingPet(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profile_image: file });
      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getSpeciesEmoji = (species) => {
    const emojis = { dog: '🐕', cat: '🐱', other: '🐾' };
    return emojis[species] || '🐾';
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/lifecycles')}
              className="flex items-center space-x-2 text-amber-600 hover:text-amber-700"
            >
              <span>←</span>
              <span>생애주기 가이드로 돌아가기</span>
            </button>

            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all"
            >
              + 반려동물 추가
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🐾 내 반려동물 관리
          </h1>
          <p className="text-lg text-gray-600">
            우리 가족의 소중한 반려동물들
          </p>
        </div>

        {/* 반려동물 목록 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        ) : pets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🐕</p>
            <p className="text-xl text-gray-600 mb-4">아직 등록된 반려동물이 없습니다</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all"
            >
              첫 반려동물 등록하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pets.map((pet) => (
              <div
                key={pet.id}
                className={`bg-white rounded-2xl border-2 ${
                  pet.is_active ? 'border-gray-200' : 'border-gray-300 opacity-75'
                } hover:shadow-lg transition-all overflow-hidden`}
              >
                {/* 프로필 이미지 */}
                <div className="h-48 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
                  {pet.profile_image ? (
                    <img
                      src={pet.profile_image}
                      alt={pet.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl">{getSpeciesEmoji(pet.species)}</span>
                  )}
                </div>

                {/* 정보 */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900">{pet.name}</h3>
                    {!pet.is_active && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        🌈 무지개다리
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">품종:</span> {pet.breed || '-'}
                    </p>
                    {pet.age_in_years !== undefined && (
                      <p>
                        <span className="font-medium">나이:</span> {pet.age_in_years}세
                      </p>
                    )}
                    {pet.is_neutered && (
                      <p className="flex items-center">
                        <span className="font-medium">중성화:</span> 
                        <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                          ✓ 완료
                        </span>
                      </p>
                    )}
                  </div>

                  {/* 버튼 */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(pet)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
                    >
                      수정
                    </button>
                    {pet.is_active ? (
                      <button
                        onClick={() => handleDeactivate(pet.id)}
                        className="flex-1 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-all"
                      >
                        🌈
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(pet.id)}
                        className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 등록/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPet ? '반려동물 정보 수정' : '새 반려동물 등록'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* 프로필 이미지 업로드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  프로필 사진
                </label>
                <div className="flex items-center space-x-4">
                  {/* 이미지 미리보기 */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="미리보기"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl">{getSpeciesEmoji(formData.species)}</span>
                    )}
                  </div>
                  {/* 파일 선택 버튼 */}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="profile-image-input"
                    />
                    <label
                      htmlFor="profile-image-input"
                      className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-xl cursor-pointer hover:bg-gray-200 transition-all"
                    >
                      📷 사진 선택
                    </label>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, profile_image: null });
                          setImagePreview(null);
                        }}
                        className="ml-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종류 *
                  </label>
                  <select
                    value={formData.species}
                    onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="dog">강아지 🐕</option>
                    <option value="cat">고양이 🐱</option>
                    <option value="other">기타 🐾</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    성별
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="unknown">모름</option>
                    <option value="male">수컷</option>
                    <option value="female">암컷</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  품종
                </label>
                <input
                  type="text"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    생년월일
                  </label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    입양일
                  </label>
                  <input
                    type="date"
                    value={formData.adoption_date}
                    onChange={(e) => setFormData({ ...formData, adoption_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* 중성화 여부 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_neutered"
                    checked={formData.is_neutered}
                    onChange={(e) => setFormData({ ...formData, is_neutered: e.target.checked })}
                    className="w-5 h-5 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <label htmlFor="is_neutered" className="text-sm font-medium text-gray-700">
                    중성화 수술 완료
                  </label>
                </div>

                {formData.is_neutered && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      중성화 수술일
                    </label>
                    <input
                      type="date"
                      value={formData.neutered_date}
                      onChange={(e) => setFormData({ ...formData, neutered_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  몸무게 (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  특이사항 및 메모
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                ></textarea>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPet(null);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all"
                >
                  {editingPet ? '수정하기' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PetListPage;