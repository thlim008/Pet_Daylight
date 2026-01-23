import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';

function LifecycleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState({});
  const [togglingItem, setTogglingItem] = useState(null);

  useEffect(() => {
    loadGuide();
  }, [id]);

  const loadGuide = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/lifecycles/guides/${id}/`);
      
      setGuide(response.data);
      
      // 백엔드에서 받은 체크리스트 진행상황 설정
      if (response.data.checklist_progress) {
        setCheckedItems(response.data.checklist_progress);
      }
    } catch (err) {
      console.error('⛔ 가이드 로드 실패:', err);
      alert('가이드를 찾을 수 없습니다.');
      navigate('/lifecycles');
    } finally {
      setLoading(false);
    }
  };

  const toggleCheckItem = async (item) => {
    if (togglingItem === item) return; // 이미 처리 중이면 무시

    try {
      setTogglingItem(item);
      
      // 먼저 UI 업데이트 (낙관적 업데이트)
      setCheckedItems(prev => ({
        ...prev,
        [item]: !prev[item]
      }));

      // 백엔드 API 호출
      const response = await API.post(`/lifecycles/guides/${id}/toggle_checklist/`, {
        checklist_item: item
      });


      // 백엔드 응답으로 정확한 상태 업데이트
      setCheckedItems(prev => ({
        ...prev,
        [item]: response.data.is_completed
      }));

    } catch (err) {
      console.error('⛔ 체크리스트 토글 실패:', err);
      
      // 실패하면 원래 상태로 되돌리기
      setCheckedItems(prev => ({
        ...prev,
        [item]: !prev[item]
      }));
      
      // 로그인 필요 에러
      if (err.response?.status === 401) {
        alert('로그인이 필요합니다.');
        navigate('/login');
      } else {
        alert('체크리스트 저장에 실패했습니다.');
      }
    } finally {
      setTogglingItem(null);
    }
  };

  const getStageInfo = (stage) => {
    const stages = {
      adoption: { label: '입양 준비', emoji: '🏠', color: 'blue' },
      puppy: { label: '육아', emoji: '🍼', color: 'pink' },
      health: { label: '건강관리', emoji: '⚕️', color: 'green' },
      senior: { label: '노령 케어', emoji: '💚', color: 'purple' },
      farewell: { label: '이별/장례', emoji: '🌈', color: 'indigo' },
    };
    return stages[stage] || stages.adoption;
  };

  const getCompletionRate = () => {
    if (!guide?.checklist || guide.checklist.length === 0) return 0;
    const completed = guide.checklist.filter(item => checkedItems[item]).length;
    return Math.round((completed / guide.checklist.length) * 100);
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

  if (!guide) return null;

  const stageInfo = getStageInfo(guide.stage);
  const completionRate = getCompletionRate();

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
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>뒤로</span>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* 헤더 정보 */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-4xl">{stageInfo.emoji}</span>
            <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              {stageInfo.label}
            </span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {guide.title}
          </h1>

          <p className="text-xl text-gray-600">
            {guide.description}
          </p>
        </div>

        {/* 이미지 */}
        {guide.image && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <img
              src={guide.image}
              alt={guide.title}
              className="w-full h-96 object-cover"
            />
          </div>
        )}

        {/* 상세 내용 */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📖 상세 가이드</h2>
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {guide.content}
            </p>
          </div>
        </div>

        {/* 체크리스트 */}
        {guide.checklist && guide.checklist.length > 0 && (
          <div className="bg-white rounded-2xl p-8 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">✅ 체크리스트</h2>
              
              {/* 진행률 표시 */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm text-gray-500">완료율</p>
                  <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
                </div>
                <div className="w-16 h-16 relative">
                  <svg className="transform -rotate-90 w-16 h-16">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - completionRate / 100)}`}
                      className="text-green-500 transition-all duration-500"
                    />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {guide.checklist.map((item, index) => {
                const isChecked = checkedItems[item] || false;
                const isToggling = togglingItem === item;
                
                return (
                  <div
                    key={index}
                    onClick={() => !isToggling && toggleCheckItem(item)}
                    className={`flex items-start space-x-4 p-4 rounded-xl border-2 transition-all ${
                      isToggling 
                        ? 'opacity-50 cursor-wait'
                        : 'cursor-pointer'
                    } ${
                      isChecked
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isChecked
                        ? 'bg-green-500 border-green-500'
                        : 'bg-white border-gray-300'
                    }`}>
                      {isChecked && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className={`text-lg transition-all ${
                        isChecked ? 'text-gray-500 line-through' : 'text-gray-900'
                      }`}>
                        {item}
                      </p>
                    </div>

                    {isToggling && (
                      <div className="flex-shrink-0">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-900 border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800">
                💾 <strong>자동 저장:</strong> 체크리스트 항목을 클릭하면 자동으로 저장됩니다. 로그인하면 어디서든 확인 가능해요!
              </p>
            </div>

            {completionRate === 100 && (
              <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl text-center">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-2xl font-bold text-green-900 mb-2">
                  축하합니다!
                </h3>
                <p className="text-green-700">
                  모든 체크리스트를 완료했습니다!
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default LifecycleDetailPage;