import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function PasswordResetRequestPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/accounts/password_reset_request/', {
        email: email.trim(),
      });

      console.log('✅ 비밀번호 재설정 이메일 발송 성공:', response.data);
      setSuccess(true);
    } catch (err) {
      console.error('❌ 비밀번호 재설정 요청 실패:', err);
      console.error('❌ 에러 응답 전체:', err.response);
      console.error('❌ 에러 데이터:', err.response?.data);
      
      let errorMessage = '비밀번호 재설정 요청에 실패했습니다.';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // 여러 에러 형식 처리
        if (errorData.email) {
          // email 필드 에러
          errorMessage = Array.isArray(errorData.email) 
            ? errorData.email[0] 
            : errorData.email;
        } else if (errorData.error) {
          // error 필드
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          // detail 필드
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          // message 필드
          errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
          // 문자열로 온 경우
          errorMessage = errorData;
        } else {
          // 기타 객체 형태
          console.log('🔍 알 수 없는 에러 형식:', errorData);
          errorMessage = '비밀번호 재설정 요청에 실패했습니다. 이메일 주소를 확인해주세요.';
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
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
                <span className="text-5xl">✉️</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">이메일 발송 완료!</h1>
              <p className="text-base text-gray-600">비밀번호 재설정 링크를 이메일로 발송했습니다</p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-6">
              <div className="text-center mb-6">
                <p className="text-gray-700 mb-4">
                  <strong className="text-gray-900">{email}</strong>
                  <br />
                  위 주소로 비밀번호 재설정 링크를 보냈습니다.
                </p>
                <p className="text-sm text-gray-500">
                  이메일을 확인하고 링크를 클릭하여 새로운 비밀번호를 설정해주세요.
                </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-6">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">💡</span>
                  <div className="flex-1">
                    <p className="text-sm text-blue-900 font-medium mb-1">이메일이 보이지 않나요?</p>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• 스팸 메일함을 확인해보세요</li>
                      <li>• 이메일 주소가 정확한지 확인해보세요</li>
                      <li>• 몇 분 정도 기다려주세요</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all"
              >
                로그인 페이지로 돌아가기
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                다른 이메일로 다시 시도
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">비밀번호 재설정</h1>
            <p className="text-base text-gray-600">
              가입 시 등록한 이메일 주소를 입력해주세요
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
                  
                  {/* 소셜 로그인 안내 */}
                  {error.includes('소셜 로그인') && (
                    <div className="mt-4 pt-4 border-t border-red-200">
                      <p className="text-xs text-red-700 mb-3">소셜 로그인으로 가입하신 경우:</p>
                      <div className="space-y-2">
                        {error.includes('KAKAO') && (
                          <button
                            onClick={() => window.location.href = 'http://localhost:8000/accounts/kakao/login/'}
                            className="w-full py-2.5 bg-[#FEE500] text-[#000000] rounded-lg font-medium hover:bg-[#FDD835] transition-all text-sm"
                          >
                            카카오 로그인하기
                          </button>
                        )}
                        {error.includes('NAVER') && (
                          <button
                            onClick={() => window.location.href = 'http://localhost:8000/accounts/naver/login/'}
                            className="w-full py-2.5 bg-[#03C75A] text-white rounded-lg font-medium hover:bg-[#02B350] transition-all text-sm"
                          >
                            네이버 로그인하기
                          </button>
                        )}
                        {error.includes('GOOGLE') && (
                          <button
                            onClick={() => window.location.href = 'http://localhost:8000/accounts/google/login/'}
                            className="w-full py-2.5 bg-white border-2 border-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-all text-sm"
                          >
                            Google 로그인하기
                          </button>
                        )}
                      </div>
                    </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일 주소</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                placeholder="example@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? '전송 중...' : '재설정 링크 보내기'}
            </button>
          </form>

          <div className="mt-8 text-center space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="block w-full text-sm text-gray-600 hover:text-gray-900"
            >
              ← 로그인 페이지로 돌아가기
            </button>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-3">소셜 로그인으로 가입하셨나요?</p>
              <div className="text-xs text-gray-600">
                카카오, 네이버, Google 계정은 해당 서비스에서 비밀번호를 관리합니다.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PasswordResetRequestPage;