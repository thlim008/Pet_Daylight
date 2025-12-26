import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    phone_number: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. 유효성 검사 (기존 로직 유지)
    if (formData.password !== formData.password_confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 2. 회원가입 요청
      await authAPI.register(formData);
      
      // 3. 가입 성공 후 자동 로그인 시도
      const loginRes = await authAPI.login({
        username: formData.username,
        password: formData.password,
      });
      
      // [수정] HomePage.js 및 App.js와 키 이름을 통일하여 저장
      // loginRes.data.tokens 구조는 백엔드 응답 형식에 맞춰 확인 필요
      if (loginRes.data.tokens) {
        localStorage.setItem('access_token', loginRes.data.tokens.access);
        localStorage.setItem('refresh_token', loginRes.data.tokens.refresh);
      }
      
      // 유저 정보 저장 (필요 시)
      localStorage.setItem('user', JSON.stringify(loginRes.data.user));
      
      // 4. 메인 페이지로 이동
      // replace: true를 사용하여 뒤로가기 시 회원가입 폼으로 돌아오지 않게 함
      navigate('/', { replace: true });
      
    } catch (err) {
      // 에러 핸들링 (기존 로직 유지)
      if (err.response?.data?.username) {
        setError('이미 사용 중인 아이디입니다.');
      } else if (err.response?.data?.email) {
        setError('이미 사용 중인 이메일입니다.');
      } else {
        setError(err.response?.data?.message || '회원가입에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pet Daylight</h1>
            <p className="text-base text-gray-600">함께 반려동물을 지켜주세요</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 입력 필드들은 기존 소스와 동일하게 유지 (생략 없음) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">아이디</label>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                placeholder="아이디"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                placeholder="8자 이상"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
              <input
                name="password_confirm"
                type="password"
                value={formData.password_confirm}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                placeholder="비밀번호 재입력"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전화번호 <span className="text-gray-400 text-xs">(선택)</span>
              </label>
              <input
                name="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                placeholder="010-1234-5678"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {loading ? '가입 중...' : '가입하기'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-gray-900 font-medium hover:underline"
              >
                로그인
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default RegisterPage;