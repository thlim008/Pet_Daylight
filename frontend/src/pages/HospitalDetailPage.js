import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';

function HospitalDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [hospital, setHospital] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    loadHospital();
    loadReviews();
  }, [id]);

  const loadHospital = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/hospitals/${id}/`);
      console.log('✅ 병원 상세:', response.data);
      setHospital(response.data);
    } catch (err) {
      console.error('❌ 병원 로드 실패:', err);
      alert('병원 정보를 찾을 수 없습니다.');
      navigate('/hospitals');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await API.get(`/hospitals/${id}/reviews/`);
      console.log('✅ 리뷰 목록:', response.data);
      
      if (response.data.results) {
        setReviews(response.data.results);
      } else if (Array.isArray(response.data)) {
        setReviews(response.data);
      }
    } catch (err) {
      console.error('❌ 리뷰 로드 실패:', err);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const getPriceRangeBadge = (priceRange) => {
    const badges = {
      'free': <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">무료</span>,
      'low': <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">저가</span>,
      'medium': <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">일반</span>,
      'high': <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">고가</span>,
    };
    return badges[priceRange] || null;
  };

  const getTypeBadge = (type) => {
    if (type === 'hospital') {
      return <span className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium">🏥 동물병원</span>;
    }
    return <span className="px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">✂️ 애견미용</span>;
  };

  const renderStars = (rating) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center space-x-1">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400 text-2xl">★</span>
        ))}
        {hasHalfStar && <span className="text-yellow-400 text-2xl">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300 text-2xl">★</span>
        ))}
        <span className="ml-3 text-xl text-gray-700 font-bold">{numRating.toFixed(1)}</span>
      </div>
    );
  };

  const renderSmallStars = (rating) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center space-x-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400 text-sm">★</span>
        ))}
        {hasHalfStar && <span className="text-yellow-400 text-sm">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300 text-sm">★</span>
        ))}
        <span className="ml-1 text-xs text-gray-600">{numRating.toFixed(1)}</span>
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (!hospital) return null;

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
                <p className="text-xs text-gray-500">병원/미용 상세</p>
              </div>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
            >
              뒤로
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* 헤더 정보 */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {getTypeBadge(hospital.type)}
            {getPriceRangeBadge(hospital.price_range)}
            {hospital.is_24_hours && (
              <span className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-bold shadow-lg">
                🌙 24시간 운영
              </span>
            )}
            {hospital.is_open_now && !hospital.is_24_hours && (
              <span className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-bold shadow-lg animate-pulse">
                ✅ 지금 진료중
              </span>
            )}
            {!hospital.is_open_now && !hospital.is_24_hours && (
              <span className="px-4 py-2 bg-gray-400 text-white rounded-full text-sm font-medium">
                ⏰ 진료 종료
              </span>
            )}
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {hospital.name}
          </h1>

          {/* 별점 */}
          <div className="mb-4">
            {renderStars(hospital.rating || 0)}
            <p className="text-sm text-gray-500 mt-2">
              {hospital.review_count || 0}개의 리뷰
            </p>
          </div>
        </div>

        {/* 이미지 */}
        {hospital.image && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <img
              src={hospital.image}
              alt={hospital.name}
              className="w-full h-96 object-cover"
            />
          </div>
        )}

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 기본 정보</h2>
          
          <div className="space-y-4">
            {/* 주소 */}
            <div className="flex items-start">
              <span className="text-2xl mr-4">📍</span>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">주소</p>
                <p className="text-gray-900 font-medium">{hospital.address}</p>
              </div>
            </div>

            {/* 전화번호 */}
            {hospital.phone && (
              <div className="flex items-start">
                <span className="text-2xl mr-4">📞</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">전화번호</p>
                  <a 
                    href={`tel:${hospital.phone}`}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {hospital.phone}
                  </a>
                </div>
              </div>
            )}

            {/* 웹사이트 */}
            {hospital.website && (
              <div className="flex items-start">
                <span className="text-2xl mr-4">🌐</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">웹사이트</p>
                  <a 
                    href={hospital.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium break-all"
                  >
                    {hospital.website}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 영업시간 */}
        {hospital.opening_hours && Object.keys(hospital.opening_hours).length > 0 && (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🕐 영업시간</h2>
            
            <div className="space-y-3">
              {Object.entries(hospital.opening_hours).map(([day, hours]) => (
                <div key={day} className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium w-20">{day}</span>
                  <span className="text-gray-600">{hours}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 제공 서비스 */}
        {hospital.services && hospital.services.length > 0 && (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💼 제공 서비스</h2>
            
            <div className="flex flex-wrap gap-3">
              {hospital.services.map((service, index) => (
                <span 
                  key={index}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-medium"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 설명 */}
        {hospital.description && (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📝 소개</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {hospital.description}
            </p>
          </div>
        )}

        {/* 리뷰 섹션 */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">⭐ 리뷰 ({reviews.length})</h2>
            <button
              onClick={() => navigate(`/hospitals/${id}/reviews/create`)}
              className="px-6 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all"
            >
              리뷰 작성
            </button>
          </div>

          {reviewsLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-900 border-t-transparent mx-auto"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 mb-4">첫 번째 리뷰를 작성해보세요!</p>
              <button
                onClick={() => navigate(`/hospitals/${id}/reviews/create`)}
                className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all"
              >
                리뷰 작성하기
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-lg">👤</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{review.user_name || '익명'}</p>
                        <p className="text-xs text-gray-500">{formatDate(review.created_at)}</p>
                      </div>
                    </div>
                    {renderSmallStars(review.rating)}
                  </div>
                  
                  <p className="text-gray-700 leading-relaxed">
                    {review.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default HospitalDetailPage;