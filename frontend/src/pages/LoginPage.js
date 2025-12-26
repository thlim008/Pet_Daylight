import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 컴포넌트 마운트 시 localStorage에서 에러 복원
  useEffect(() => {
    const savedError = localStorage.getItem('login_error');
    if (savedError) {
      setError(savedError);
      console.log('💾 저장된 에러 복원:', savedError);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const clearError = () => {
    setError('');
    localStorage.removeItem('login_error');
    console.log('🗑️ 에러 삭제됨');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('🔐 로그인 시도:', { username: formData.username });
      
      const res = await authAPI.login(formData);
      
      console.log('✅ 로그인 성공!');
      
      localStorage.setItem('access_token', res.data.tokens.access);
      localStorage.setItem('refresh_token', res.data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      clearError(); // 성공 시 에러 삭제
      navigate('/');
    } catch (err) {
      console.error('❌ 로그인 실패:', err);
      console.error('❌ 에러 응답:', err.response?.data);
      
      let errorMessage = '로그인에 실패했습니다.';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = Array.isArray(errorData.non_field_errors) 
            ? errorData.non_field_errors[0] 
            : errorData.non_field_errors;
        } else if (errorData.username || errorData.password) {
          const messages = [];
          if (errorData.username) messages.push(`아이디: ${errorData.username[0] || errorData.username}`);
          if (errorData.password) messages.push(`비밀번호: ${errorData.password[0] || errorData.password}`);
          errorMessage = messages.join('\n');
        } else {
          errorMessage = '아이디 또는 비밀번호를 확인해주세요.';
        }
      }
      
      console.log('🔴 에러 메시지:', errorMessage);
      
      // localStorage에 저장!
      localStorage.setItem('login_error', errorMessage);
      setError(errorMessage);
      
      console.log('💾 에러를 localStorage에 저장함');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    clearError(); // 소셜 로그인 시도 시 에러 삭제
    console.log(`🔑 ${provider} 소셜 로그인`);
    window.location.href = `http://localhost:8000/accounts/${provider}/login/`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-16">
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pet Daylight</h1>
            <p className="text-base text-gray-600">어둠 속의 제보부터 일상의 기록까지</p>
          </div>

          {/* 에러 박스 - localStorage 기반 */}
          {error && (
            <div className="mb-6 p-5 rounded-2xl bg-red-50 border-2 border-red-400 shadow-lg animate-pulse-once">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-red-900 mb-2">로그인 실패</h3>
                  <p className="text-sm text-red-800 whitespace-pre-line font-medium leading-relaxed">
                    {error}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearError}
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

          <div className="space-y-3 mb-8">
            <button
              onClick={() => handleSocialLogin('kakao')}
              className="w-full py-3.5 bg-[#FEE500] text-[#000000] rounded-xl font-medium hover:bg-[#FDD835] transition-all flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 01-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
              </svg>
              <span>카카오로 계속하기</span>
            </button>

            <button
              onClick={() => handleSocialLogin('naver')}
              className="w-full py-3.5 bg-[#03C75A] text-white rounded-xl font-medium hover:bg-[#02B350] transition-all flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
              </svg>
              <span>네이버로 계속하기</span>
            </button>

            <button
              onClick={() => handleSocialLogin('google')}
              className="w-full py-3.5 bg-white border-2 border-gray-200 text-gray-900 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google로 계속하기</span>
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#FAFAF9] text-gray-500">또는</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">아이디</label>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                autoComplete="username"
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                placeholder="아이디를 입력하세요"
              />
            </div>

            {/* 🔥 비밀번호 필드 - 비밀번호 찾기 링크 추가 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">비밀번호</label>
                <button
                  type="button"
                  onClick={() => navigate('/password-reset')}
                  className="text-xs text-gray-600 hover:text-gray-900 hover:underline"
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <button onClick={() => navigate('/register')} className="text-gray-900 font-medium hover:underline">
                회원가입
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;