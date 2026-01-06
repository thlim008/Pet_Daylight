import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function CommunityCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    category: 'tips',
    title: '',
    content: '',
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    if (files.length > 5) {
      setError('이미지는 최대 5장까지 업로드 가능합니다.');
      return;
    }

    setImages(files);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
    setError('');
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.title) {
        setError('제목을 입력해주세요.');
        setLoading(false);
        return;
      }

      if (!formData.content) {
        setError('내용을 입력해주세요.');
        setLoading(false);
        return;
      }

      const data = new FormData();
      data.append('category', formData.category);
      data.append('title', formData.title);
      data.append('content', formData.content);

      images.forEach((image) => {
        data.append('uploaded_images', image);
      });

      console.log('📤 전송 데이터:', {
        ...formData,
        images_count: images.length,
      });

      const response = await API.post('/communities/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ 게시글 등록 성공:', response.data);
      alert('게시글이 등록되었습니다!');
      navigate(`/communities/${response.data.id}`);
    } catch (err) {
      console.error('⛔ 게시글 등록 실패:', err);
      console.error('⛔ 에러 응답:', err.response?.data);

      if (err.response?.data) {
        const errors = err.response.data;
        const errorMessages = Object.entries(errors)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        setError(`등록 실패:\n${errorMessages}`);
      } else {
        setError('게시글 등록에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = () => {
    const categories = {
      'free': { emoji: '📍', label: '자유게시판', desc: '자유롭게 이야기를 나눠보세요' },
      'found_story': { emoji: '✅', label: '발견 후기', desc: '반려동물을 발견한 이야기를 들려주세요' },
      'rescue_story': { emoji: '🏥', label: '구조 경험담', desc: '반려동물 구조 경험을 나눠주세요' },
      'tips': { emoji: '💡', label: '꿀팁 공유', desc: '유용한 정보와 팁을 공유해주세요' },
      'lifecycle': { emoji: '🐾', label: '생애주기', desc: '반려동물의 성장 과정을 기록해주세요' },
    };
    return categories[formData.category] || categories['tips'];
  };

  const categoryInfo = getCategoryInfo();

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
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
                  console.error('헤더 로고 로드 실패');
                  e.target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md';
                  fallback.innerHTML = '<span class="text-white text-2xl font-bold">🌞</span>';
                  e.target.parentElement.appendChild(fallback);
                }}
              />
              <div>
                <span className="text-xl font-bold text-gray-900">Pet Daylight</span>
                <p className="text-xs text-gray-500">글쓰기</p>
              </div>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>취소</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl">
            <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">커뮤니티 글쓰기</h2>
              <p className="text-gray-600">소중한 경험과 정보를 공유해주세요.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { value: 'free', emoji: '📍', label: '자유게시판' },
                  { value: 'found_story', emoji: '✅', label: '발견 후기' },
                  { value: 'rescue_story', emoji: '🏥', label: '구조 경험담' },
                  { value: 'tips', emoji: '💡', label: '꿀팁 공유' },
                  { value: 'lifecycle', emoji: '🐾', label: '생애주기' },
                ].map((cat) => (
                  <label key={cat.value} className="flex-1">
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      checked={formData.category === cat.value}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-center font-medium text-gray-700 cursor-pointer peer-checked:border-amber-400 peer-checked:bg-amber-50 peer-checked:text-amber-700 transition-all hover:bg-gray-100">
                      <div className="text-2xl mb-1">{cat.emoji}</div>
                      <div className="text-xs">{cat.label}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-3 p-3 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-800">
                  <span className="text-lg mr-2">{categoryInfo.emoji}</span>
                  {categoryInfo.desc}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="제목을 입력하세요"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
                rows="10"
                placeholder="내용을 입력하세요"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사진 (최대 5장) - 선택사항
              </label>
              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`미리보기 ${index + 1}`}
                          className="w-full h-40 object-cover rounded-xl border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          ✕
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-amber-500 text-white text-xs rounded-lg font-medium">
                            썸네일
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-8 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '등록 중...' : '게시글 등록'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CommunityCreatePage;
