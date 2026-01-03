// src/components/ShareButtons.js
import React, { useState } from 'react';

function ShareButtons({ 
  title = 'Pet Daylight', 
  description = '반려동물을 함께 지켜주세요',
  url = window.location.href,
  imageUrl = null
}) {
  const [showToast, setShowToast] = useState(false);

  // URL 복사
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      showToastMessage();
    } catch (err) {
      console.error('링크 복사 실패:', err);
      alert('링크 복사에 실패했습니다.');
    }
  };

  // 인스타그램 공유 (링크 복사 후 안내)
  const handleInstagramShare = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert('링크가 복사되었습니다!\n인스타그램 앱에서 스토리나 게시물에 붙여넣기 해주세요.');
    } catch (err) {
      console.error('링크 복사 실패:', err);
      alert('링크 복사에 실패했습니다.');
    }
  };

  // 페이스북 공유
  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  // 트위터 공유
  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  // 네이버 블로그 공유
  const handleNaverShare = () => {
    const naverUrl = `https://share.naver.com/web/shareView?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    window.open(naverUrl, '_blank', 'width=600,height=400');
  };

  // 토스트 메시지 표시
  const showToastMessage = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="relative">
      <h4 className="text-sm font-medium text-gray-700 mb-3">공유하기</h4>
      
      <div className="grid grid-cols-2 gap-2">
        {/* 인스타그램 */}
        <button
          onClick={handleInstagramShare}
          className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F56040] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          <span>인스타그램</span>
        </button>

        {/* 페이스북 */}
        <button
          onClick={handleFacebookShare}
          className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-[#1877F2] text-white rounded-lg text-sm font-medium hover:bg-[#166FE5] transition-all"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span>페이스북</span>
        </button>

        {/* 트위터 */}
        <button
          onClick={handleTwitterShare}
          className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-[#1DA1F2] text-white rounded-lg text-sm font-medium hover:bg-[#1A94DA] transition-all"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
          <span>트위터</span>
        </button>

        {/* 네이버 */}
        <button
          onClick={handleNaverShare}
          className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-[#03C75A] text-white rounded-lg text-sm font-medium hover:bg-[#02B350] transition-all"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"/>
          </svg>
          <span>네이버</span>
        </button>
      </div>

      {/* URL 복사 버튼 */}
      <button
        onClick={handleCopyLink}
        className="w-full mt-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all flex items-center justify-center space-x-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span>링크 복사</span>
      </button>

      {/* 토스트 메시지 */}
      {showToast && (
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg animate-fade-in whitespace-nowrap">
          ✅ 링크가 복사되었습니다!
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, 10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default ShareButtons;