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

  // 🔥 비밀번호 변경 상태 추가
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      console.log('✅ 사용자 정보:', response.data);
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

  // 🔥 비밀번호 변경 핸들러
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);

    // 클라이언트 측 검증
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
      console.log('✅ 비밀번호 변경 성공:', response.data);
      
      setPasswordSuccess(true);
      setPasswordData({
        current_password: '',
        new_password: '',
        new_password_confirm: '',
      });
      
      // 3초 후 섹션 닫기
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
              {/* 🔔 알림 거리 설정 */}
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
              {user.notification_enabled && (<div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-600">알림 거리</span>
                <span className="font-medium text-gray-900">
                {(Number(user.notification_distance) / 1000).toFixed(0)}km
                </span>
              </div>
              )}
            </div>
          )}
        </div>

        {/* 🔥 비밀번호 변경 섹션 */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">비밀번호 설정</h2>
              <p className="text-sm text-gray-600">계정 보안을 위해 비밀번호를 관리하세요</p>
            </div>
          </div>

          {/* 소셜 로그인 계정 안내 */}
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

          {/* 일반 계정 비밀번호 변경 */}
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
      </main>
    </div>
  );
}

export default ProfilePage;