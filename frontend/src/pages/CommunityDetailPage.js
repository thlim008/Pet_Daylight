import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';
import { authAPI } from '../services/api';
import ImageGallery from '../components/ImageGallery';
import ShareButtons from '../components/ShareButtons';

function CommunityDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [liking, setLiking] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const loadCurrentUser = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      setCurrentUser(response.data);
    } catch (err) {
      console.error('사용자 정보 로드 실패:', err);
    }
  }, []);

  const loadPost = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get(`/communities/${id}/`);
      setPost(response.data);
    } catch (err) {
      console.error('❌ 게시글 로드 실패:', err);
      alert('게시글을 찾을 수 없습니다.');
      navigate('/communities');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadPost();
    loadCurrentUser();
  }, [loadPost, loadCurrentUser]);

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      await API.delete(`/communities/${id}/`);
      alert('게시글이 삭제되었습니다.');
      navigate('/communities');
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (liking) return;

    try {
      setLiking(true);

      // 🔥 응답 확인
      const response = await API.post(`/communities/${id}/like/`);
      console.log('✅ 좋아요 성공:', response.data);

      await loadPost();
    } catch (err) {
      console.error('❌ 좋아요 실패:', err);
      console.error('에러 응답:', err.response?.data);

      // 🔥 에러 메시지를 더 자세히 확인
      if (err.response?.data) {
        alert(`좋아요 실패: ${JSON.stringify(err.response.data)}`);
      } else {
        alert('좋아요에 실패했습니다.');
      }
    } finally {
      setLiking(false);
    }
  };
  
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      setSubmittingComment(true);

      // 🔥 응답을 받아서 확인
      const response = await API.post('/communities/comments/', {
        community: parseInt(id),
        content: comment,
      });

      console.log('✅ 댓글 작성 성공:', response.data);

      setComment('');
      await loadPost();
      alert('댓글이 작성되었습니다!');
    } catch (err) {
      console.error('❌ 댓글 작성 실패:', err);
      console.error('에러 응답:', err.response?.data);

      // 🔥 에러 메시지를 더 자세히 확인
      if (err.response?.data) {
        alert(`댓글 작성 실패: ${JSON.stringify(err.response.data)}`);
      } else {
        alert(`댓글 작성에 실패했습니다: ${err.message}`);
      }
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
      await API.patch(`/communities/comments/${commentId}/`, {
        content: editingCommentContent,
      });
      
      setEditingCommentId(null);
      setEditingCommentContent('');
      await loadPost();
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
      await API.delete(`/communities/comments/${commentId}/`);
      await loadPost();
      alert('댓글이 삭제되었습니다.');
    } catch (err) {
      console.error('댓글 삭제 실패:', err);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const getCategoryBadge = (category) => {
    const badges = {
      'free': { bg: 'bg-red-100', text: 'text-red-700', label: '자유게시판', emoji: '🔍' },
      'found_story': { bg: 'bg-blue-100', text: 'text-blue-700', label: '발견 후기', emoji: '✅' },
      'rescue_story': { bg: 'bg-green-100', text: 'text-green-700', label: '구조 경험담', emoji: '🏥' },
      'tips': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '꿀팁 공유', emoji: '💡' },
      'lifecycle': { bg: 'bg-purple-100', text: 'text-purple-700', label: '생애주기 경험', emoji: '🐾' },
    };
    
    const badge = badges[category] || badges['tips'];
    
    return (
      <span className={`inline-flex items-center px-4 py-2 ${badge.bg} ${badge.text} rounded-full text-sm font-medium space-x-1`}>
        <span>{badge.emoji}</span>
        <span>{badge.label}</span>
      </span>
    );
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

  if (!post) {
    return null;
  }

  const isOwner = currentUser && post.user.id === currentUser.id;

  const postImages = post.images && Array.isArray(post.images) && post.images.length > 0 
    ? post.images.map(url => {
        if (url.startsWith('/media/')) {
          return `https://petdaylight.mooo.com${url}`;
        }
        return url;
      })
    : [];

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
                }}
              />
              <div>
                <span className="text-xl font-bold text-gray-900">Pet Daylight</span>
                <p className="text-xs text-gray-500">커뮤니티</p>
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

      {/* 메인 */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽: 게시글 상세 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-8">
                {/* 카테고리 배지 */}
                <div className="mb-6">
                  {getCategoryBadge(post.category)}
                </div>

                {/* 제목 */}
                <h1 className="text-3xl font-bold text-gray-900 mb-6">
                  {post.title}
                </h1>

                {/* 이미지 갤러리 */}
                {postImages.length > 0 && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                      {postImages.map((image, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setGalleryIndex(index);
                            setShowGallery(true);
                          }}
                          className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group"
                        >
                          <img
                            src={image}
                            alt={`사진 ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          {/* 호버 오버레이 */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
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
                        images={postImages}
                        initialIndex={galleryIndex}
                        onClose={() => setShowGallery(false)}
                      />
                    )}
                  </>
                )}

                {/* 내용 */}
                <div className="mb-6">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </p>
                </div>

                {/* 작성자 정보 */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {post.user.profile_image ? (
                        <img
                          src={post.user.profile_image}
                          alt={post.user.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600">👤</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{post.user.username}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>조회 {post.views}</span>
                      <span>좋아요 {post.likes}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 댓글 섹션 */}
              <div className="p-8 bg-gray-50 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  댓글 {post.comments?.length || 0}
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
                  {post.comments && post.comments.length > 0 ? (
                    post.comments.map((comment) => (
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

          {/* 오른쪽: 게시글 관리 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">게시글 관리</h3>

              <button
                onClick={handleLike}
                disabled={liking}
                className="w-full px-4 py-3 bg-pink-50 text-pink-700 rounded-xl font-medium hover:bg-pink-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                ❤️ 좋아요 {post.likes}
              </button>

              {isOwner && (
                <>
                  <div className="space-y-3 mb-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => navigate(`/communities/${post.id}/edit`)}
                      className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-all"
                    >
                      ✏️ 게시글 수정
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-xl font-medium hover:bg-red-100 transition-all"
                    >
                      🗑️ 게시글 삭제
                    </button>
                  </div>
                </>
              )}

              {/* 공유하기 */}
              <div className="pt-6 border-t border-gray-200">
                <ShareButtons
                  title={`${post.title} - Pet Daylight`}
                  description={post.content?.substring(0, 100) || '반려동물 커뮤니티'}
                  imageUrl={postImages[0]}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CommunityDetailPage;