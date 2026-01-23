import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import API from '../services/api';

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    phone_number: '',
    notification_enabled: true,
    notification_distance: 10000,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 비밀번호 변경 상태
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 내 활동 상태
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'comments', 'reports', 'reviews'
  const [myPosts, setMyPosts] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [myReportComments, setMyReportComments] = useState([]);
  const [reportCommentsLoading, setReportCommentsLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    loadUser();
    loadMyPosts();
    loadMyComments();
    loadMyReports();
    loadMyReviews();
    loadMyReportComments();
  }, []);

  const loadUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      setFormData({
        nickname: response.data.nickname || '',
        email: response.data.email || '',
        phone_number: response.data.phone_number || '',
        notification_enabled: response.data.notification_enabled,
        notification_distance: response.data.notification_distance,
      });
    } catch (err) {
      console.error('사용자 정보 로드 실패:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  // 내가 쓴 글 로드
  const loadMyPosts = async () => {
    try {
      setPostsLoading(true);
      const response = await API.get('/communities/', {
        params: { my_posts: true }
      });
      setMyPosts(response.data.results || response.data);
    } catch (err) {
      console.error('내 게시글 로드 실패:', err);
    } finally {
      setPostsLoading(false);
    }
  };

  // 내가 쓴 댓글 로드
  const loadMyComments = async () => {
    try {
      setCommentsLoading(true);
      const response = await API.get('/communities/comments/', {
        params: { my_comments: true }
      });
      setMyComments(response.data.results || response.data);
    } catch (err) {
      console.error('내 댓글 로드 실패:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  // 내 실종 제보 로드
  const loadMyReports = async () => {
    try {
      setReportsLoading(true);
      const response = await API.get('/missing-pets/', {
        params: { my_reports: true }
      });
      setMyReports(response.data.results || response.data);
    } catch (err) {
      console.error('내 실종 제보 로드 실패:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  // 내 병원 리뷰 로드
  const loadMyReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await API.get('/hospitals/reviews/', {
        params: { my_reviews: true }
      });
      setMyReviews(response.data.results || response.data);
    } catch (err) {
      console.error('내 리뷰 로드 실패:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  // 내 실종 제보 댓글 로드
  const loadMyReportComments = async () => {
    try {
      setReportCommentsLoading(true);
      const response = await API.get('/missing-pets/comments/', {
        params: { my_comments: true }
      });
      setMyReportComments(response.data.results || response.data);
    } catch (err) {
      console.error('내 실종 제보 댓글 로드 실패:', err);
    } finally {
      setReportCommentsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await API.patch(`/accounts/${user.id}/`, formData);
      setMessage('프로필이 업데이트되었습니다! ✅');
      setEditing(false);
      await loadUser();

      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('프로필 업데이트 실패:', err);
      setMessage('업데이트 실패. 다시 시도해주세요. ❌');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordData.new_password !== passwordData.new_password_confirm) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError('비밀번호는 8자 이상이어야 합니다.');
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await API.post('/accounts/password_change/', passwordData);

      setPasswordSuccess(true);
      setPasswordData({
        current_password: '',
        new_password: '',
        new_password_confirm: '',
      });

      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('❌ 비밀번호 변경 실패:', err);

      if (err.response?.data) {
        const errorData = err.response.data;

        if (errorData.current_password) {
          setPasswordError('현재 비밀번호가 일치하지 않습니다.');
        } else if (errorData.new_password_confirm) {
          setPasswordError('새 비밀번호가 일치하지 않습니다.');
        } else if (errorData.non_field_errors) {
          const nfe = Array.isArray(errorData.non_field_errors)
            ? errorData.non_field_errors[0]
            : errorData.non_field_errors;
          setPasswordError(nfe);
        } else {
          setPasswordError('비밀번호 변경에 실패했습니다.');
        }
      } else {
        setPasswordError('서버와 연결할 수 없습니다.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      free: '📍',
      found_story: '✅',
      rescue_story: '🏥',
      tips: '💡',
      lifecycle: '🐾',
    };
    return emojis[category] || '📌';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      free: '자유게시판',
      found_story: '발견 후기',
      rescue_story: '구조 경험담',
      tips: '꿀팁 공유',
      lifecycle: '생애주기',
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status) => {
    const badges = {
      missing: { label: '실종', color: 'bg-red-100 text-red-700' },
      found: { label: '발견', color: 'bg-green-100 text-green-700' },
      rescued: { label: '구조완료', color: 'bg-blue-100 text-blue-700' },
    };
    return badges[status] || badges.missing;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;

    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/logo.png"
                alt="Pet Daylight"
                className="w-14 h-14 object-contain drop-shadow-md"
                onError={(e) => {
                  console.error('헤더 로고 로드 실패');
                  e.target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md';
                  fallback.innerHTML = '<span class="text-3xl">🌞</span>';
                  e.target.parentElement.appendChild(fallback);
                }}
              />
              <div>
                <span className="text-xl font-bold text-gray-900">Pet Daylight</span>
                <p className="text-xs text-gray-500">프로필 설정</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
              >
                홈으로
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
            <p className="text-sm text-green-800 font-medium">{message}</p>
          </div>
        )}

        {/* 프로필 정보 */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">내 정보</h2>
              <p className="text-sm text-gray-600">프로필 정보를 관리하세요</p>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all"
              >
                수정하기
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">닉네임</label>
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                  placeholder="닉네임"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">전화번호</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                  placeholder="010-1234-5678"
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="notification_enabled"
                  checked={formData.notification_enabled}
                  onChange={handleChange}
                  className="w-5 h-5 text-amber-500 border-gray-300 rounded focus:ring-amber-400"
                />
                <label className="text-sm font-medium text-gray-700">알림 받기</label>
              </div>

              {formData.notification_enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    알림 거리 설정
                  </label>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">1km</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(Number(formData.notification_distance) / 1000).toFixed(0)}km
                    </span>
                    <span className="text-xs text-gray-500">20km</span>
                  </div>

                  <input
                    type="range"
                    min={1000}
                    max={20000}
                    step={1000}
                    name="notification_distance"
                    value={Number(formData.notification_distance)}
                    onChange={handleChange}
                    className="w-full accent-amber-500"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    주변 {(Number(formData.notification_distance) / 1000).toFixed(0)}km 이내 제보만 알림/지도에 표시됩니다.
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">아이디</span>
                <span className="font-medium text-gray-900">{user.username}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">닉네임</span>
                <span className="font-medium text-gray-900">{user.nickname || user.username}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">이메일</span>
                <span className="font-medium text-gray-900">{user.email || '-'}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">전화번호</span>
                <span className="font-medium text-gray-900">{user.phone_number || '-'}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-600">알림</span>
                <span className="font-medium text-gray-900">
                  {user.notification_enabled ? '활성화' : '비활성화'}
                </span>
              </div>
              {user.notification_enabled && (
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-600">알림 거리</span>
                  <span className="font-medium text-gray-900">
                    {(Number(user.notification_distance) / 1000).toFixed(0)}km
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 비밀번호 변경 섹션 */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">비밀번호 설정</h2>
              <p className="text-sm text-gray-600">계정 보안을 위해 비밀번호를 관리하세요</p>
            </div>
          </div>

          {user.is_social_account && (
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <span className="text-3xl">
                    {user.social_providers?.includes('kakao') && '💬'}
                    {user.social_providers?.includes('naver') && '🟢'}
                    {user.social_providers?.includes('google') && '🔴'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900 mb-2">소셜 로그인 계정</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    이 계정은 <strong>{user.social_providers?.map(p => p.toUpperCase()).join(', ')}</strong> 소셜 로그인으로 가입되었습니다.
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-700 mb-2">
                      <strong>🔒 비밀번호 관리:</strong>
                    </p>
                    <p className="text-xs text-blue-600">
                      소셜 로그인 계정은 Pet Daylight에서 비밀번호를 관리하지 않습니다.
                      비밀번호를 변경하려면 {user.social_providers?.map(p => p.toUpperCase()).join(', ')}
                      계정 설정에서 변경해주세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {user.can_change_password && (
            <>
              {!showPasswordChange ? (
                <button
                  onClick={() => setShowPasswordChange(true)}
                  className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                >
                  비밀번호 변경하기
                </button>
              ) : (
                <div className="space-y-4">
                  {passwordSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-sm text-green-800 font-medium">
                        ✅ 비밀번호가 성공적으로 변경되었습니다!
                      </p>
                    </div>
                  )}

                  {passwordError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-800 font-medium">
                        ⚠️ {passwordError}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        현재 비밀번호
                      </label>
                      <input
                        type="password"
                        value={passwordData.current_password}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, current_password: e.target.value })
                        }
                        required
                        autoComplete="current-password"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        새 비밀번호
                      </label>
                      <input
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, new_password: e.target.value })
                        }
                        required
                        autoComplete="new-password"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                        placeholder="8자 이상"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        새 비밀번호 확인
                      </label>
                      <input
                        type="password"
                        value={passwordData.new_password_confirm}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            new_password_confirm: e.target.value,
                          })
                        }
                        required
                        autoComplete="new-password"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                        placeholder="비밀번호 재입력"
                      />
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordChange(false);
                          setPasswordError('');
                          setPasswordData({
                            current_password: '',
                            new_password: '',
                            new_password_confirm: '',
                          });
                        }}
                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50"
                      >
                        {passwordLoading ? '변경 중...' : '변경하기'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        {/* 내 활동 섹션 */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">내 활동</h2>
            <p className="text-sm text-gray-600">커뮤니티, 실종 제보, 병원 리뷰 활동을 확인하세요</p>
          </div>

          {/* 탭 */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-3 font-medium whitespace-nowrap transition-all ${
                activeTab === 'posts'
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              커뮤니티 글 ({myPosts.length})
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-3 font-medium whitespace-nowrap transition-all ${
                activeTab === 'comments'
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              댓글 ({myComments.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-3 font-medium whitespace-nowrap transition-all ${
                activeTab === 'reports'
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              실종/발견/구조 글 ({myReports.length})
            </button>
            <button
              onClick={() => setActiveTab('reportComments')}
              className={`px-4 py-3 font-medium whitespace-nowrap transition-all ${
                activeTab === 'reportComments'
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              실종/발견/구조 댓글 ({myReportComments.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-3 font-medium whitespace-nowrap transition-all ${
                activeTab === 'reviews'
                  ? 'text-amber-600 border-b-2 border-amber-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              병원 리뷰 ({myReviews.length})
            </button>
          </div>

          {/* 커뮤니티 글 */}
          {activeTab === 'posts' && (
            <div className="space-y-4">
              {postsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-900 border-t-transparent mx-auto"></div>
                </div>
              ) : myPosts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">📝</p>
                  <p className="text-gray-600">작성한 글이 없습니다</p>
                </div>
              ) : (
                myPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/communities/${post.id}`)}
                    className="p-5 border border-gray-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getCategoryEmoji(post.category)}</span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {getCategoryLabel(post.category)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(post.created_at)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.content}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>👁️ {post.views || 0}</span>
                      <span>💬 {post.comment_count || 0}</span>
                      <span>❤️ {post.likes_count || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 댓글 */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {commentsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-900 border-t-transparent mx-auto"></div>
                </div>
              ) : myComments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">💬</p>
                  <p className="text-gray-600">작성한 댓글이 없습니다</p>
                </div>
              ) : (
                myComments.map((comment) => (
                  <div
                    key={comment.id}
                    onClick={() => navigate(`/communities/${comment.post}`)}
                    className="p-5 border border-gray-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        게시글: {comment.post_title || `#${comment.post}`}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-900">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 실종 제보 */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {reportsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-900 border-t-transparent mx-auto"></div>
                </div>
              ) : myReports.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="text-gray-600">작성한 실종/발견/구조 글이 없습니다</p>
                </div>
              ) : (
                myReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => navigate(`/missing-pets/${report.id}`)}
                    className="p-5 border border-gray-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      {report.photo && (
                        <img
                          src={report.photo}
                          alt={report.pet_name}
                          className="w-20 h-20 rounded-xl object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{report.pet_name}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(report.status).color}`}>
                            {getStatusBadge(report.status).label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{report.breed} · {report.species === 'dog' ? '강아지' : '고양이'}</p>
                        <p className="text-xs text-gray-500">📍 {report.location}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(report.last_seen_date)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 제보 댓글 */}
          {activeTab === 'reportComments' && (
            <div className="space-y-4">
              {reportCommentsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-900 border-t-transparent mx-auto"></div>
                </div>
              ) : myReportComments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">💬</p>
                  <p className="text-gray-600">작성한 실종/발견/구조 댓글이 없습니다</p>
                </div>
              ) : (
                myReportComments.map((comment) => (
                  <div
                    key={comment.id}
                    onClick={() => navigate(`/missing-pets/${comment.missing_pet}`)}
                    className="p-5 border border-gray-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        제보글: {comment.missing_pet_name || `#${comment.missing_pet}`}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-900">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 병원 리뷰 */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {reviewsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-900 border-t-transparent mx-auto"></div>
                </div>
              ) : myReviews.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">⭐</p>
                  <p className="text-gray-600">작성한 리뷰가 없습니다</p>
                </div>
              ) : (
                myReviews.map((review) => (
                  <div
                    key={review.id}
                    onClick={() => navigate(`/hospitals/${review.hospital}`)}
                    className="p-5 border border-gray-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {review.hospital_name || '병원'}
                        </h3>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < review.rating ? 'text-amber-400' : 'text-gray-300'}>
                              ⭐
                            </span>
                          ))}
                          <span className="text-sm text-gray-600 ml-2">({review.rating}점)</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{review.content}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
