import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';

function HospitalReviewCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    rating: 5,
    content: '',
  });

  useEffect(() => {
    loadHospital();
  }, [id]);

  const loadHospital = async () => {
    try {
      const response = await API.get(`/hospitals/${id}/`);
      console.log('✅ 병원 정보:', response.data);
      setHospital(response.data);
    } catch (err) {
      console.error('❌ 병원 로드 실패:', err);
      alert('병원 정보를 찾을 수 없습니다.');
      navigate('/hospitals');
    }
  };

  const handleRatingClick = (rating) => {
    setFormData({ ...formData, rating });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.content.trim()) {
        setError('리뷰 내용을 입력해주세요.');
        setLoading(false);
        return;
      }

      if (formData.content.length < 10) {
        setError('리뷰는 최소 10자 이상 작성해주세요.');
        setLoading(false);
        return;
      }

      console.log('📤 전송 데이터:', {
        hospital: id,
        ...formData,
      });

      const response = await API.post(`/hospitals/${id}/reviews/`, {
        rating: formData.rating,
        content: formData.content,
      });

      console.log('✅ 리뷰 등록 성공:', response.data);
      alert('리뷰가 등록되었습니다!');
      navigate(`/hospitals/${id}`);
    } catch (err) {
      console.error('❌ 리뷰 등록 실패:', err);
      console.error('❌ 에러 응답:', err.response?.data);
      
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다.');
        setTimeout(() => navigate('/login'), 1500);
      } else if (err.response?.data) {
        const errors = err.response.data;
        const errorMessages = Object.entries(errors)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        setError(`등록 실패:\n${errorMessages}`);
      } else {
        setError('리뷰 등록에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStarSelection = () => {
    return (
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingClick(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <span 
              className={`text-5xl ${
                star <= formData.rating ? 'text-yellow-400' : 'text-gray-300'
              }`}
            >
              ★
            </span>
          </button>
        ))}
      </div>
    );
  };

  const getRatingText = (rating) => {
    const texts = {
      1: '😞 별로예요',
      2: '😐 그저 그래요',
      3: '🙂 괜찮아요',
      4: '😊 좋아요',
      5: '😍 최고예요',
    };
    return texts[rating] || '';
  };

  if (!hospital) {
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
                <p className="text-xs text-gray-500">리뷰 작성</p>
              </div>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
            >
              취소
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl">
            <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8 space-y-8">
            {/* 병원 정보 */}
            <div className="pb-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {hospital.name}
              </h2>
              <p className="text-gray-600">
                {hospital.type === 'hospital' ? '🏥 동물병원' : '✂️ 애견미용'}
              </p>
            </div>

            {/* 별점 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                별점을 선택해주세요 <span className="text-red-500">*</span>
              </label>
              
              <div className="flex flex-col items-center py-8 bg-gray-50 rounded-2xl">
                {renderStarSelection()}
                <p className="mt-4 text-2xl font-bold text-gray-900">
                  {getRatingText(formData.rating)}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  {formData.rating}점 / 5점
                </p>
              </div>
            </div>

            {/* 리뷰 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                리뷰 내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
                rows="10"
                placeholder="병원/미용실을 이용한 경험을 자세히 작성해주세요.&#10;&#10;• 서비스 품질은 어땠나요?&#10;• 직원분들은 친절했나요?&#10;• 가격은 합리적이었나요?&#10;• 다시 방문하고 싶으신가요?&#10;&#10;최소 10자 이상 작성해주세요."
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all resize-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  💡 자세하고 솔직한 리뷰는 다른 사용자에게 큰 도움이 됩니다
                </p>
                <p className={`text-xs ${
                  formData.content.length < 10 ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {formData.content.length}자
                </p>
              </div>
            </div>

            {/* 안내 사항 */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">ℹ️</span>
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium mb-2">리뷰 작성 안내</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• 실제 방문 경험을 바탕으로 작성해주세요</li>
                    <li>• 욕설, 비방, 허위 정보는 삭제될 수 있습니다</li>
                    <li>• 작성한 리뷰는 수정 및 삭제가 가능합니다</li>
                    <li>• 리뷰는 다른 사용자에게 공개됩니다</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '등록 중...' : '리뷰 등록'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default HospitalReviewCreatePage;