import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';

function PasswordResetConfirmPage() {
  const navigate = useNavigate();
  const { uid, token } = useParams();
  const [formData, setFormData] = useState({
    new_password: '',
    new_password_confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 클라이언트 측 검증
    if (formData.new_password !== formData.new_password_confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    if (formData.new_password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    try {
      const response = await API.post('/accounts/password_reset_confirm/', {
        uid,
        token,
        new_password: formData.new_password,
        new_password_confirm: formData.new_password_confirm,
      });

      console.log('✅ 비밀번호 변경 성공:', response.data);
      setSuccess(true);
    } catch (err) {
      console.error('❌ 비밀번호 변경 실패:', err);
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.token) {
          setError('만료되었거나 유효하지 않은 링크입니다. 비밀번호 재설정을 다시 요청해주세요.');
        } else if (errorData.uid) {
          setError('유효하지 않은 링크입니다.');
        } else if (errorData.new_password_confirm) {
          setError(errorData.new_password_confirm[0] || errorData.new_password_confirm);
        } else if (errorData.non_field_errors) {
          const nfe = Array.isArray(errorData.non_field_errors) 
            ? errorData.non_field_errors[0] 
            : errorData.non_field_errors;
          setError(nfe);
        } else {
          setError('비밀번호 변경에 실패했습니다.');
        }
      } else {
        setError('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-green-400 to-green-500 shadow-lg mx-auto mb-6">
                <span className="text-5xl">✅</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">변경 완료!</h1>
              <p className="text-base text-gray-600">비밀번호가 성공적으로 변경되었습니다</p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-6">
              <div className="text-center mb-6">
                <p className="text-gray-700 mb-4">
                  이제 새로운 비밀번호로 로그인할 수 있습니다.
                </p>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all"
              >
                로그인하러 가기
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <img 
              src="/logo.png" 
              alt="Pet Daylight" 
              className="w-24 h-24 object-contain drop-shadow-2xl mx-auto mb-6"
              onError={(e) => {
                e.target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg mx-auto mb-6';
                fallback.innerHTML = '<span class="text-5xl">🌞</span>';
                e.target.parentElement.appendChild(fallback);
              }}
            />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">새 비밀번호 설정</h1>
            <p className="text-base text-gray-600">
              새로운 비밀번호를 입력해주세요
            </p>
          </div>

          {error && (
            <div className="mb-6 p-5 rounded-2xl bg-red-50 border-2 border-red-400 shadow-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-red-900 mb-2">오류 발생</h3>
                  <p className="text-sm text-red-800 font-medium leading-relaxed whitespace-pre-line">
                    {error}
                  </p>
                  
                  {error.includes('만료') && (
                    <button
                      onClick={() => navigate('/password-reset')}
                      className="mt-4 text-sm text-red-700 hover:text-red-900 underline"
                    >
                      → 비밀번호 재설정 다시 요청하기
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="flex-shrink-0 text-red-600 hover:text-red-800 hover:bg-red-100 transition-all p-2 rounded-lg"
                  title="닫기"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">새 비밀번호</label>
              <input
                name="new_password"
                type="password"
                value={formData.new_password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                placeholder="8자 이상"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
              <input
                name="new_password_confirm"
                type="password"
                value={formData.new_password_confirm}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                placeholder="비밀번호 재입력"
              />
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-start space-x-3">
                <span className="text-xl">ℹ️</span>
                <div className="flex-1">
                  <p className="text-xs text-blue-900 font-medium mb-1">비밀번호 조건:</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• 최소 8자 이상</li>
                    <li>• 영문, 숫자, 특수문자 조합 권장</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← 로그인 페이지로 돌아가기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PasswordResetConfirmPage;