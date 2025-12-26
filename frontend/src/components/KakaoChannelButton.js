import React, { useState } from 'react';

function KakaoChannelButton() {
  const [isHovered, setIsHovered] = useState(false);
  
  // ⚠️ 여기에 본인의 카카오톡 채널 URL을 넣으세요!
  const kakaoChannelUrl = 'http://pf.kakao.com/_GMTyn/chat'; // ← 변경 필요!
  
  const handleClick = () => {
    window.open(kakaoChannelUrl, '_blank', 'width=400,height=600');
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="카카오톡 상담"
      >
        {/* 말풍선 (호버 시) */}
        {isHovered && (
          <div className="absolute bottom-full right-0 mb-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap shadow-lg animate-fade-in">
            카카오톡으로 문의하기 💬
            <div className="absolute top-full right-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-900"></div>
          </div>
        )}
        
        {/* 버튼 본체 */}
        <div className="w-16 h-16 bg-[#FEE500] rounded-full shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl">
          {/* 카카오톡 로고 */}
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 32 32" 
            fill="none"
            className="transition-transform duration-300 group-hover:scale-110"
          >
            <path 
              d="M16 4C9.373 4 4 8.373 4 13.714c0 3.419 2.197 6.42 5.518 8.126-.214.785-.78 2.883-.891 3.344-.136.568.208.56.438.407.183-.122 2.962-1.958 4.118-2.722.597.083 1.208.126 1.817.126 6.627 0 12-4.373 12-9.714S22.627 4 16 4z" 
              fill="#3C1E1E"
            />
          </svg>
        </div>

        {/* 뱃지 (새 메시지 알림 - 선택사항) */}
        {/* <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">1</span>
        </div> */}
      </button>

      {/* 애니메이션 CSS */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

export default KakaoChannelButton;