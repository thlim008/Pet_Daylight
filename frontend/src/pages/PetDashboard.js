import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import BackButton from '../components/BackButton';

function withEulReul(word) {
  if (!word) return '를';
  const lastChar = word[word.length - 1];
  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return '를';
  const hasBatchim = (code - 0xac00) % 28 !== 0;
  return hasBatchim ? '을' : '를';
}

function PetDashboard() {
  const navigate = useNavigate();
  const [myPets, setMyPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [relevantGuides, setRelevantGuides] = useState([]);
  const [adoptionGuides, setAdoptionGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPet, setShowAddPet] = useState(false);

  useEffect(() => {
    loadMyPets();
    loadAdoptionGuides();
  }, []);

  useEffect(() => {
    if (selectedPet) {
      loadRelevantGuides(selectedPet);
    }
  }, [selectedPet]);

  const loadMyPets = async () => {
    try {
      setLoading(true);
      const response = await API.get('/lifecycles/pets/');
      const pets = response.data.results || response.data;
      setMyPets(pets);

      if (pets.length > 0) {
        setSelectedPet(pets[0]);
      }
    } catch (err) {
      console.error('❌ 펫 로드 실패:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAdoptionGuides = async () => {
    try {
      const response = await API.get('/lifecycles/guides/', {
        params: {
          stage: 'adoption'
        }
      });
      setAdoptionGuides(response.data.results || response.data);
    } catch (err) {
      console.error('❌ 입양 가이드 로드 실패:', err);
    }
  };

  const loadRelevantGuides = async (pet) => {
    try {
      const stage = getStageFromAge(pet.age_in_years);
      const params = { species: pet.species, stage };

      // '기타' 종류는 품종란에 적어둔 구체적인 이름(예: 앵무새)으로 먼저 매칭 시도
      if (pet.species === 'other' && pet.breed) {
        params.custom_species_name = pet.breed;
      }

      let response = await API.get('/lifecycles/guides/', { params });
      let data = response.data.results || response.data;

      // 구체적인 종류로 매칭되는 가이드가 없으면 일반 '기타' 가이드로 재시도
      if (data.length === 0 && params.custom_species_name) {
        delete params.custom_species_name;
        response = await API.get('/lifecycles/guides/', { params });
        data = response.data.results || response.data;
      }

      setRelevantGuides(data);
    } catch (err) {
      console.error('❌ 가이드 로드 실패:', err);
    }
  };

  const getStageFromAge = (age) => {
    if (age === null) return 'health';
    if (age < 1) return 'puppy';
    if (age < 7) return 'health';
    return 'senior';
  };

  const getStageName = (stage) => {
    const stages = {
      adoption: '입양 준비',
      puppy: '육아기',
      health: '건강관리',
      senior: '노령케어',
      farewell: '이별/장례'
    };
    return stages[stage] || stage;
  };

  const getStageEmoji = (stage) => {
    const emojis = {
      adoption: '🏠',
      puppy: '🐾',
      health: '💚',
      senior: '👴',
      farewell: '🌈'
    };
    return emojis[stage] || '📌';
  };

  if (loading) {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity"
            >
              <img
                src="/logo.png"
                alt="Pet Daylight"
                className="w-10 h-10 sm:w-14 sm:h-14 object-contain drop-shadow-md"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md';
                  fallback.innerHTML = '<span class="text-white text-xl sm:text-2xl font-bold">🌞</span>';
                  e.target.parentElement.appendChild(fallback);
                }}
              />
              <div>
                <span className="text-lg sm:text-xl font-bold text-gray-900">Pet Daylight</span>
                <p className="text-xs text-gray-500 hidden sm:block">우리 가족 케어</p>
              </div>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <BackButton />
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/lifecycles';
                }}
                className="px-3 sm:px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-all"
              >
                <span className="hidden sm:inline">전체 가이드 보기</span>
                <span className="sm:hidden">가이드</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* 내 반려동물이 없을 때 */}
        {myPets.length === 0 ? (
          <div>
            {/* 등록 유도 섹션 */}
            <div className="text-center py-8 sm:py-12 mb-8 sm:mb-12">
              <div className="max-w-md mx-auto bg-white rounded-2xl p-8 sm:p-12 border-2 border-gray-200">
                <p className="text-5xl sm:text-7xl mb-4 sm:mb-6">🏠</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                  첫 가족을 등록해보세요!
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                  반려동물을 등록하면 나이와 상황에 맞는<br />
                  맞춤 케어 가이드를 받을 수 있어요.
                </p>
                <button
                  onClick={() => navigate(`/lifecycles/pets/new`)}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-amber-500 text-white text-base sm:text-lg rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl"
                >
                  🐾 반려동물 등록하기
                </button>
              </div>
            </div>

            {/* 입양 준비 가이드 */}
            {adoptionGuides.length > 0 && (
              <section>
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    🏠 입양 준비 완벽 가이드
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    첫 가족을 맞이하기 전, 꼭 알아야 할 정보들
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {adoptionGuides.map(guide => (
                    <div
                      key={guide.id}
                      onClick={() => navigate(`/lifecycles/guides/${guide.id}`)}
                      className="bg-white rounded-2xl border-2 border-gray-200 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
                    >
                      {guide.image ? (
                        <div className="h-40 sm:h-48 overflow-hidden bg-gray-100">
                          <img
                            src={guide.image}
                            alt={guide.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="h-40 sm:h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                          <span className="text-5xl sm:text-6xl">🏠</span>
                        </div>
                      )}

                      <div className="p-4 sm:p-6">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-xl sm:text-2xl">🏠</span>
                          <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            입양 준비
                          </span>
                        </div>

                        <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">
                          {guide.title}
                        </h4>

                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {guide.description}
                        </p>

                        {guide.checklist && guide.checklist.length > 0 && (
                          <div className="pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-2">주요 체크리스트:</p>
                            <ul className="space-y-1">
                              {guide.checklist.slice(0, 2).map((item, idx) => (
                                <li key={idx} className="text-sm text-gray-700 flex items-start">
                                  <span className="text-amber-500 mr-2">✓</span>
                                  <span className="line-clamp-1">{item}</span>
                                </li>
                              ))}
                              {guide.checklist.length > 2 && (
                                <li className="text-sm text-amber-600 font-medium">
                                  +{guide.checklist.length - 2}개 더보기
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <>
            {/* 내 반려동물 선택 영역 */}
            <section className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">🐾 우리 가족</h2>
                <button
                  onClick={() => navigate(`/lifecycles/pets/new`)}
                  className="px-3 sm:px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                >
                  + 새 가족 추가
                </button>
              </div>

              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4">
                {myPets.map(pet => (
                  <div
                    key={pet.id}
                    onClick={() => setSelectedPet(pet)}
                    className={`flex-shrink-0 w-44 sm:w-56 p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedPet?.id === pet.id
                        ? 'border-amber-500 bg-amber-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    {pet.profile_image ? (
                      <img
                        src={pet.profile_image}
                        alt={pet.name}
                        className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover mx-auto mb-3 border-4 border-white shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-md">
                        <span className="text-4xl sm:text-6xl">
                          {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'}
                        </span>
                      </div>
                    )}

                    <h3 className="text-lg sm:text-xl font-bold text-center text-gray-900 mb-1">
                      {pet.name}
                    </h3>

                    <div className="text-center space-y-1">
                      <p className="text-sm text-gray-600">
                        {pet.breed || '믹스'}
                      </p>
                      <p className="text-sm font-medium text-amber-600">
                        {pet.age_in_years !== null ? `${pet.age_in_years}살` : '나이 미상'}
                      </p>
                      {pet.weight && (
                        <p className="text-xs text-gray-500">
                          {pet.weight}kg
                        </p>
                      )}
                    </div>

                    {!pet.is_active && (
                      <div className="mt-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs text-center">
                        🌈 무지개다리
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 선택된 펫 정보 */}
            {selectedPet && (
              <>
                {/* 펫 상세 정보 카드 */}
                <section className="mb-6 sm:mb-8">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-8 border-2 border-amber-200">
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                        {selectedPet.name}의 현재 단계
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600">
                        {selectedPet.name}에게 맞는 케어 가이드를 확인해보세요
                      </p>
                    </div>

                    {/* 액션 버튼들 - 모바일에서는 그리드로 */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
                      <button
                        onClick={() => navigate(`/pets/${selectedPet.id}/visits`)}
                        className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all"
                      >
                        🏥 <span className="hidden sm:inline">진료기록</span><span className="sm:hidden">진료</span>
                      </button>
                      <button
                        onClick={() => navigate(`/pets/${selectedPet.id}/vaccinations`)}
                        className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-all"
                      >
                        💉 <span className="hidden sm:inline">예방접종</span><span className="sm:hidden">접종</span>
                      </button>
                      <button
                        onClick={() => navigate(`/pets/${selectedPet.id}/health`)}
                        className="px-3 sm:px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 transition-all"
                      >
                        📊 <span className="hidden sm:inline">건강기록</span><span className="sm:hidden">건강</span>
                      </button>
                      <button
                        onClick={() => navigate(`/pets/${selectedPet.id}/album`)}
                        className="px-3 sm:px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition-all"
                      >
                        📷 앨범
                      </button>
                      <button
                        onClick={() => navigate(`/lifecycles/pets/${selectedPet.id}/edit`)}
                        className="col-span-2 sm:col-span-1 px-3 sm:px-4 py-2 bg-white text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all border border-gray-200"
                      >
                        ✏️ 정보 수정
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-white rounded-xl p-3 sm:p-4 border border-amber-200">
                        <p className="text-xs text-gray-500 mb-1">현재 단계</p>
                        <p className="text-xl sm:text-2xl font-bold text-amber-600">
                          {getStageEmoji(getStageFromAge(selectedPet.age_in_years))}
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-gray-900">
                          {getStageName(getStageFromAge(selectedPet.age_in_years))}
                        </p>
                      </div>

                      <div className="bg-white rounded-xl p-3 sm:p-4 border border-amber-200">
                        <p className="text-xs text-gray-500 mb-1">나이</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">
                          {selectedPet.age_in_years !== null ? selectedPet.age_in_years : '?'}
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">
                          {selectedPet.age_in_years !== null ? '살' : '미상'}
                        </p>
                      </div>

                      <div className="bg-white rounded-xl p-3 sm:p-4 border border-amber-200">
                        <p className="text-xs text-gray-500 mb-1">중성화</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">
                          {selectedPet.is_neutered ? '✅' : '❌'}
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">
                          {selectedPet.is_neutered ? '완료' : '미완료'}
                        </p>
                      </div>

                      <div className="bg-white rounded-xl p-3 sm:p-4 border border-amber-200">
                        <p className="text-xs text-gray-500 mb-1">함께한 날</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">
                          {selectedPet.adoption_date
                            ? Math.floor((new Date() - new Date(selectedPet.adoption_date)) / (1000 * 60 * 60 * 24))
                            : '?'}
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">일</p>
                      </div>
                    </div>

                    {selectedPet.notes && (
                      <div className="mt-4 p-4 bg-white rounded-xl border border-amber-200">
                        <p className="text-xs text-gray-500 mb-2">📝 메모</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {selectedPet.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* 맞춤 가이드 */}
                <section>
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                        📚 {selectedPet.name}{withEulReul(selectedPet.name)} 위한 가이드
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600">
                        현재 단계에 필요한 정보를 확인하세요
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/lifecycles?species=${selectedPet.species}`)}
                      className="px-3 sm:px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-all"
                    >
                      전체 보기 →
                    </button>
                  </div>

                  {relevantGuides.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 bg-white rounded-2xl border-2 border-gray-200">
                      <p className="text-3xl sm:text-4xl mb-4">📖</p>
                      <p className="text-sm sm:text-base text-gray-600">
                        아직 이 단계의 가이드가 준비되지 않았어요
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {relevantGuides.map(guide => (
                        <div
                          key={guide.id}
                          onClick={() => navigate(`/lifecycles/guides/${guide.id}`)}
                          className="bg-white rounded-2xl border-2 border-gray-200 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
                        >
                          {guide.image ? (
                            <div className="h-40 sm:h-48 overflow-hidden bg-gray-100">
                              <img
                                src={guide.image}
                                alt={guide.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            </div>
                          ) : (
                            <div className="h-40 sm:h-48 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
                              <span className="text-5xl sm:text-6xl">
                                {getStageEmoji(guide.stage)}
                              </span>
                            </div>
                          )}

                          <div className="p-4 sm:p-6">
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-xl sm:text-2xl">
                                {getStageEmoji(guide.stage)}
                              </span>
                              <span className="px-2 sm:px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                {getStageName(guide.stage)}
                              </span>
                            </div>

                            <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">
                              {guide.title}
                            </h4>

                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {guide.description}
                            </p>

                            {guide.checklist && guide.checklist.length > 0 && (
                              <div className="pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-500 mb-2">주요 체크리스트:</p>
                                <ul className="space-y-1">
                                  {guide.checklist.slice(0, 2).map((item, idx) => (
                                    <li key={idx} className="text-sm text-gray-700 flex items-start">
                                      <span className="text-amber-500 mr-2">✓</span>
                                      <span className="line-clamp-1">{item}</span>
                                    </li>
                                  ))}
                                  {guide.checklist.length > 2 && (
                                    <li className="text-sm text-amber-600 font-medium">
                                      +{guide.checklist.length - 2}개 더보기
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default PetDashboard;
