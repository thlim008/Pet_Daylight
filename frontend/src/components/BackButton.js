import React from 'react';
import { useNavigate } from 'react-router-dom';

// 앱 전체에서 통일된 뒤로가기 버튼 (기본은 브라우저 히스토리를 한 단계 뒤로, to가 있으면 그 경로로 이동)
function BackButton({ label = '뒤로', className = '', to }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className={`inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all ${className}`}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span>{label}</span>
    </button>
  );
}

export default BackButton;
