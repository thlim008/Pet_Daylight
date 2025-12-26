import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function LifecyclePage() {
  const navigate = useNavigate();
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecies, setSelectedSpecies] = useState('dog'); // dog, cat, other
  const [selectedStage, setSelectedStage] = useState('all');

  const speciesTabs = [
    { value: 'dog', label: '강아지', emoji: '🐕', color: 'amber' },
    { value: 'cat', label: '고양이', emoji: '🐱', color: 'purple' },
    { value: 'other', label: '기타', emoji: '�', color: 'gray' },
  ];

  const stages = [
    { value: 'all', label: '전체', emoji: '�', color: 'gray' },
    { value: 'adoption', label: '입양 준비', emoji: '🏠', color: 'blue' },
    { value: 'puppy', label: '육아', emoji: '🍼', color: 'pink' },
    { value: 'health', label: '건강관리', emoji: '⚕️', color: 'green' },
    { value: 'senior', label: '노령 케어', emoji: '💚', color: 'indigo' },
    { value: 'farewell', label: '이별/장례', emoji: '🌈', color: 'purple' },
  ];

  useEffect(() => {
    loadGuides();
  }, [selectedSpecies, selectedStage]);

  const loadGuides = async () => {
    try {
      setLoading(true);
      const params = {
        species: selectedSpecies,
      };
      
      if (selectedStage !== 'all') {
        params.stage = selectedStage;
      }
      
      const response = await API.get('/lifecycles/guides/', { params });
      
      console.log('📦 API 응답:', response.data);
      
      // 페이지네이션된 응답 처리
      if (response.data.results) {
        setGuides(response.data.results);
      } else if (Array.isArray(response.data)) {
        setGuides(response.data);
      } else {
        setGuides([]);
      }
      
    } catch (err) {
      console.error('⛔ 가이드 로드 실패:', err);
      setGuides([]);
    } finally {
      setLoading(false);
    }
  };

  const getColorClass = (color) => {
    const colors = {
      gray: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
      blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
      pink: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
      green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
      purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
      amber: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
    };
    return colors[color] || colors.gray;
  };

  const getSelectedColorClass = (color) => {
    const colors = {
      gray: 'bg-gray-200 border-gray-400 text-gray-900',
      blue: 'bg-blue-200 border-blue-400 text-blue-900',
      pink: 'bg-pink-200 border-pink-400 text-pink-900',
      green: 'bg-green-200 border-green-400 text-green-900',
      purple: 'bg-purple-200 border-purple-400 text-purple-900',
      indigo: 'bg-indigo-200 border-indigo-400 text-indigo-900',
      amber: 'bg-amber-200 border-amber-400 text-amber-900',
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
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
                  const fallback = document.createElement('div');
                  fallback.className = 'w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md';
                  fallback.innerHTML = '<span class="text-white text-2xl font-bold">🌞</span>';
                  e.target.parentElement.appendChild(fallback);
                }}
              />
              <div>
                <span className="text-xl font-bold text-gray-900">Pet Daylight</span>
                <p className="text-xs text-gray-500">생애주기 가이드</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/lifecycles/pets')}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all"
            >
              내 반려동물 관리
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🐾 반려동물 생애주기 가이드
          </h1>
          <p className="text-lg text-gray-600">
            입양부터 이별까지, 함께하는 모든 순간을 위한 안내서
          </p>
        </div>

        {/* 종류별 탭 (강아지/고양이/기타) */}
        <div className="mb-8">
          <div className="flex justify-center gap-4">
            {speciesTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setSelectedSpecies(tab.value);
                  setSelectedStage('all'); // 종류 변경 시 단계 필터 초기화
                }}
                className={`px-8 py-4 rounded-2xl font-bold text-lg border-2 transition-all ${
                  selectedSpecies === tab.value
                    ? getSelectedColorClass(tab.color)
                    : getColorClass(tab.color)
                }`}
              >
                <span className="text-3xl mr-3">{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 단계별 필터 */}
        <div className="mb-12">
          <div className="flex flex-wrap justify-center gap-3">
            {stages.map((stage) => (
              <button
                key={stage.value}
                onClick={() => setSelectedStage(stage.value)}
                className={`px-6 py-3 rounded-xl font-medium border-2 transition-all ${
                  selectedStage === stage.value
                    ? getSelectedColorClass(stage.color)
                    : getColorClass(stage.color)
                }`}
              >
                <span className="text-xl mr-2">{stage.emoji}</span>
                {stage.label}
              </button>
            ))}
          </div>
        </div>

        {/* 가이드 목록 */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        ) : guides.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-6">
              {selectedSpecies === 'dog' ? '🐕' : selectedSpecies === 'cat' ? '🐱' : '🐾'}
            </p>
            {selectedSpecies === 'other' ? (
              <div className="max-w-md mx-auto bg-white rounded-2xl p-8 border-2 border-gray-200">
                <p className="text-xl font-bold text-gray-900 mb-4">
                  추가 가이드가 필요하신가요?
                </p>
                <p className="text-gray-600 mb-6">
                  토끼, 햄스터, 새 등 다른 반려동물을 위한 가이드가 필요하시다면
                  <br />아래로 문의해주세요!
                </p>
                <a
                  href="mailto:support@petdaylight.com"
                  className="inline-block px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all"
                >
                  📧 문의하기
                </a>
              </div>
            ) : (
              <p className="text-gray-600">해당 단계의 가이드가 아직 없습니다.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => {
              const stageInfo = stages.find(s => s.value === guide.stage) || stages[0];
              return (
                <div
                  key={guide.id}
                  onClick={() => navigate(`/lifecycles/guides/${guide.id}`)}
                  className="bg-white rounded-2xl border-2 border-gray-200 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
                >
                  {/* 이미지 */}
                  {guide.image ? (
                    <div className="h-48 overflow-hidden bg-gray-100">
                      <img
                        src={guide.image}
                        alt={guide.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
                      <span className="text-6xl">{stageInfo.emoji}</span>
                    </div>
                  )}

                  {/* 콘텐츠 */}
                  <div className="p-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-2xl">{stageInfo.emoji}</span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {stageInfo.label}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">
                      {guide.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {guide.description}
                    </p>

                    {/* 체크리스트 미리보기 */}
                    {guide.checklist && guide.checklist.length > 0 && (
                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">주요 체크리스트:</p>
                        <ul className="space-y-1">
                          {guide.checklist.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start">
                              <span className="text-amber-500 mr-2">•</span>
                              <span className="line-clamp-1">{item}</span>
                            </li>
                          ))}
                          {guide.checklist.length > 3 && (
                            <li className="text-sm text-gray-500">
                              +{guide.checklist.length - 3}개 더보기
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default LifecyclePage;