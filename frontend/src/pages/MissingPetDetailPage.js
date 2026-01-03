import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';
import { authAPI } from '../services/api';
import KakaoMap from '../components/KakaoMap';
import ImageGallery from '../components/ImageGallery';
import ShareButtons from '../components/ShareButtons';

function MissingPetDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [pet, setPet] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  
  // 🔥 QR코드 & 포스터 state 추가
  const [generatingQR, setGeneratingQR] = useState(false);
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);
  const [posterUrl, setPosterUrl] = useState(null);

  const loadCurrentUser = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      setCurrentUser(response.data);
    } catch (err) {
      console.error('사용자 정보 로드 실패:', err);
    }
  }, []);

  const loadPet = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get(`/missing-pets/${id}/`);
      console.log('✅ 제보 상세 로드:', response.data);
      setPet(response.data);
    } catch (err) {
      console.error('❌ 제보 로드 실패:', err);
      alert('제보를 찾을 수 없습니다.');
      navigate('/missing-pets');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadPet();
    loadCurrentUser();
  }, [loadPet, loadCurrentUser]);

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm('상태를 변경하시겠습니까?')) return;

    try {
      await API.patch(`/missing-pets/${id}/update_status/`, { status: newStatus });
      await loadPet();
      alert('상태가 변경되었습니다.');
    } catch (err) {
      console.error('❌ 상태 변경 실패:', err);
      console.error('에러 상세:', err.response?.data);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      await API.delete(`/missing-pets/${id}/`);
      alert('제보가 삭제되었습니다.');
      navigate('/missing-pets');
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      setSubmittingComment(true);
      
      console.log('📤 댓글 전송 데이터:', {
        missing_pet: parseInt(id),
        content: comment,
      });

      const response = await API.post('/missing-pets/comments/', {
        missing_pet: parseInt(id),
        content: comment,
      });
      
      console.log('✅ 댓글 작성 성공:', response.data);
      
      setComment('');
      await loadPet();
      alert('댓글이 작성되었습니다!');
    } catch (err) {
      console.error('❌ 댓글 작성 실패:', err);
      console.error('❌ 에러 응답:', err.response?.data);
      alert(`댓글 작성에 실패했습니다: ${err.response?.data?.error || err.message}`);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const handleUpdateComment = async (commentId) => {
    if (!editingCommentContent.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    try {
      await API.patch(`/missing-pets/comments/${commentId}/`, {
        content: editingCommentContent,
      });
      
      setEditingCommentId(null);
      setEditingCommentContent('');
      await loadPet();
      alert('댓글이 수정되었습니다.');
    } catch (err) {
      console.error('댓글 수정 실패:', err);
      alert('댓글 수정에 실패했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      await API.delete(`/missing-pets/comments/${commentId}/`);
      await loadPet();
      alert('댓글이 삭제되었습니다.');
    } catch (err) {
      console.error('댓글 삭제 실패:', err);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  // 🔥 QR코드 생성 핸들러
  const handleGenerateQR = async () => {
    try {
        setGeneratingQR(true);
        const response = await API.post(`/missing-pets/${id}/generate_qr/`);
        console.log('✅ QR코드 생성 성공:', response.data);
        
        const fullUrl = response.data.full_url;
        setQrUrl(fullUrl);
                // 🔥 브라우저 미리보기 방지 및 강제 다운로드 로직
        const res = await fetch(fullUrl);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `pet-qr-${id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl); // 메모리 해제
        
        alert('QR코드가 생성되고 다운로드되었습니다!');
      } catch (err) {
        console.error('❌ QR코드 생성 실패:', err);
        alert('QR코드 생성에 실패했습니다.');
      } finally {
        setGeneratingQR(false);
      }
  };
  // 🔥 포스터 생성 핸들러
  const handleGeneratePoster = async () => {
    try {
      setGeneratingPoster(true);
      const response = await API.post(`/missing-pets/${id}/generate_poster/`);
      console.log('✅ 포스터 생성 성공:', response.data);
      setPosterUrl(response.data.full_url);
      
      // 자동 다운로드
      window.open(response.data.full_url, '_blank');
      alert('포스터가 생성되었습니다! 다운로드를 확인하세요.');
    } catch (err) {
      console.error('❌ 포스터 생성 실패:', err);
      alert('포스터 생성에 실패했습니다.');
    } finally {
      setGeneratingPoster(false);
    }
  };

  const getCategoryBadge = (category) => {
    if (category === 'missing') {
      return (
        <span className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium">
          🔍 실종
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
        ✅ 발견
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
          진행중
        </span>
      ),
      resolved: (
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          해결됨
        </span>
      ),
      closed: (
        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
          종료
        </span>
      ),
    };
    return badges[status] || null;
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

  if (!pet) {
    return null;
  }

  const isOwner = currentUser && currentUser.id === pet.user.id;
  const petImages = pet.images_full_url || pet.images || [];

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
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
                <p className="text-xs text-gray-500">제보 상세</p>
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
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽: 제보 상세 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-8">
                {/* 카테고리 & 상태 */}
                <div className="flex items-center justify-between mb-6">
                  {getCategoryBadge(pet.category)}
                  {getStatusBadge(pet.status)}
                </div>

                {/* 기본 정보 */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {pet.name || `${pet.species_display} 제보`}
                  </h1>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">종류:</span>
                      <span className="font-medium text-gray-900">{pet.species_display}</span>
                    </div>
                    {pet.breed && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">품종:</span>
                        <span className="font-medium text-gray-900">{pet.breed}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">발생일:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(pet.occurred_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">장소:</span>
                      <span className="font-medium text-gray-900">{pet.address}</span>
                    </div>
                  </div>
                </div>

                {/* 이미지 갤러리 */}
                {petImages.length > 0 && (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-8">
                      {petImages.map((image, index) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            setGalleryIndex(index);
                            setShowGallery(true);
                          }}
                        >
                          <img
                            src={image}
                            alt={`${pet.name || '제보'} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {index === 0 && (
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
                              대표
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 갤러리 모달 */}
                    {showGallery && (
                      <ImageGallery
                        images={petImages}
                        initialIndex={galleryIndex}
                        onClose={() => setShowGallery(false)}
                      />
                    )}
                  </>
                )}

                {/* 설명 */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">특징</h3>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {pet.description}
                  </p>
                </div>

                {/* 연락처 */}
                <div className="bg-amber-50 rounded-2xl p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">연락처</h3>
                  <p className="text-gray-700">
                    📞 {pet.contact}
                  </p>
                </div>

                {/* 🔥 QR코드 & 포스터 생성 섹션 */}
                {currentUser && currentUser.id === pet.user.id && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8 border-2 border-purple-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="text-2xl mr-2">📱</span>
                      전단지 & QR코드
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* QR코드 생성 */}
                      <div className="bg-white rounded-xl p-4 border border-purple-200">
                        <div className="flex items-start space-x-3 mb-3">
                          <span className="text-3xl">📲</span>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-1">QR코드 생성</h4>
                            <p className="text-xs text-gray-600">스캔하면 이 제보로 바로 이동</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={handleGenerateQR}
                          disabled={generatingQR}
                          className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {generatingQR ? '생성 중...' : 'QR코드 생성'}
                        </button>
                        
                        {qrUrl && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <img src={qrUrl} alt="QR Code" className="w-32 h-32 mx-auto mb-2" />
                            <a
                              href={qrUrl}
                              download={`pet-qr-${id}.png`}
                              className="block text-center text-xs text-purple-600 hover:underline"
                            >
                              이미지 다운로드
                            </a>
                          </div>
                        )}
                      </div>
                      
                      {/* 포스터 생성 */}
                      <div className="bg-white rounded-xl p-4 border border-pink-200">
                        <div className="flex items-start space-x-3 mb-3">
                          <span className="text-3xl">📄</span>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-1">전단지 생성</h4>
                            <p className="text-xs text-gray-600">A4 인쇄용 PDF (QR코드 포함)</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={handleGeneratePoster}
                          disabled={generatingPoster}
                          className="w-full py-2.5 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {generatingPoster ? '생성 중...' : '전단지 생성 (PDF)'}
                        </button>
                        
                        {posterUrl && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-green-600 text-center mb-2">✅ 생성 완료!</p>
                            <a
                              href={posterUrl}
                              download={`pet-poster-${id}.pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-center text-xs text-pink-600 hover:underline"
                            >
                              PDF 다시 다운로드
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-white bg-opacity-50 rounded-lg border border-purple-100">
                      <p className="text-xs text-gray-600 text-center">
                        💡 전단지를 인쇄해서 동네에 붙이면 더 많은 사람들이 볼 수 있어요!
                      </p>
                    </div>
                  </div>
                )}

                {/* 지도 */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">발생/발견 위치</h3>
                  <div className="rounded-2xl overflow-hidden border-2 border-gray-200">
                    <KakaoMap
                      latitude={pet.latitude}
                      longitude={pet.longitude}
                      address={pet.address}
                      markerTitle={pet.name || '제보 위치'}
                      height="400px"
                    />
                  </div>
                </div>

                {/* 작성자 정보 */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {pet.user.profile_image ? (
                        <img
                          src={pet.user.profile_image}
                          alt={pet.user.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600">👤</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{pet.user.username}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(pet.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">조회 {pet.views}</div>
                  </div>
                </div>
              </div>

              {/* 댓글 섹션 */}
              <div className="p-8 bg-gray-50 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  댓글 {pet.comments?.length || 0}
                </h3>

                {/* 댓글 작성 */}
                <form onSubmit={handleCommentSubmit} className="mb-6">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    rows="3"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={submittingComment || !comment.trim()}
                      className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingComment ? '등록 중...' : '댓글 작성'}
                    </button>
                  </div>
                </form>

                {/* 댓글 목록 */}
                <div className="space-y-4">
                  {pet.comments && pet.comments.length > 0 ? (
                    pet.comments.map((comment) => (
                      <div key={comment.id} className="bg-white rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                          {comment.user.profile_image ? (
                            <img
                              src={comment.user.profile_image}
                              alt={comment.user.username}
                              className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-gray-600 text-sm">👤</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">
                                {comment.user.username}
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">
                                  {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                                </span>
                                
                                {/* 작성자만 수정/삭제 가능 */}
                                {currentUser && comment.user.id === currentUser.id && (
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => handleEditComment(comment)}
                                      className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded transition-all"
                                    >
                                      수정
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="text-xs text-red-600 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded transition-all"
                                    >
                                      삭제
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* 수정 모드 */}
                            {editingCommentId === comment.id ? (
                              <div className="mt-2">
                                <textarea
                                  value={editingCommentContent}
                                  onChange={(e) => setEditingCommentContent(e.target.value)}
                                  rows="3"
                                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none transition-all resize-none"
                                />
                                <div className="flex justify-end space-x-2 mt-2">
                                  <button
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                                  >
                                    취소
                                  </button>
                                  <button
                                    onClick={() => handleUpdateComment(comment.id)}
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                                  >
                                    저장
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-700 whitespace-pre-wrap">
                                {comment.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      첫 댓글을 작성해보세요!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 제보 관리 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">제보 관리</h3>

              {isOwner ? (
                <>
                  {/* 상태 변경 버튼 */}
                  <div className="space-y-3 mb-6">
                    <button
                      onClick={() => handleStatusChange('active')}
                      disabled={pet.status === 'active'}
                      className="w-full px-4 py-3 bg-yellow-50 text-yellow-700 rounded-xl font-medium hover:bg-yellow-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      진행중으로 변경
                    </button>
                    <button
                      onClick={() => handleStatusChange('resolved')}
                      disabled={pet.status === 'resolved'}
                      className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-xl font-medium hover:bg-green-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      해결됨으로 변경
                    </button>
                    <button
                      onClick={() => handleStatusChange('closed')}
                      disabled={pet.status === 'closed'}
                      className="w-full px-4 py-3 bg-gray-50 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      종료로 변경
                    </button>
                  </div>

                  {/* 수정/삭제 버튼 */}
                  <div className="space-y-3 mb-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => navigate(`/missing-pets/${pet.id}/edit`)}
                      className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-all"
                    >
                      ✏️ 제보 수정
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-xl font-medium hover:bg-red-100 transition-all"
                    >
                      🗑️ 제보 삭제
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-600 text-center">
                    작성자만 제보를 관리할 수 있습니다
                  </p>
                </div>
              )}

              {/* 공유하기 */}
              <div className="pt-6 border-t border-gray-200">
                <ShareButtons
                  title={pet.name ? `${pet.name} - Pet Daylight` : 'Pet Daylight 제보'}
                  description={pet.description?.substring(0, 100) || '반려동물을 함께 지켜주세요'}
                  imageUrl={petImages[0]}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default MissingPetDetailPage;