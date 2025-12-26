import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';

const API_BASE_URL = 'http://localhost:8000';

function CommunityEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    category: 'tips',
    title: '',
    content: '',
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    try {
      setInitialLoading(true);
      const response = await API.get(`/communities/${id}/`);
      const post = response.data;
      
      console.log('✅ 게시글 데이터 로드:', post);

      setFormData({
        category: post.category,
        title: post.title,
        content: post.content,
      });

      if (post.images && Array.isArray(post.images)) {
        const formattedImages = post.images.map(img => {
          if (typeof img === 'string' && img.startsWith('http')) {
            return img;
          }
          return `${API_BASE_URL}${img}`;
        });
        setExistingImages(formattedImages);
      }
    } catch (err) {
      console.error('⛔ 게시글 로드 실패:', err);
      alert('게시글을 찾을 수 없습니다.');
      navigate('/communities');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (existingImages.length + files.length > 5) {
      setError('이미지는 최대 5장까지 업로드 가능합니다.');
      return;
    }

    setImages(files);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
    setError('');
  };

  const removeNewImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const removeExistingImage = (index) => {
    const newExisting = existingImages.filter((_, i) => i !== index);
    setExistingImages(newExisting);
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

      data.append('existing_images', JSON.stringify(existingImages));

      console.log('📤 전송 데이터:', {
        ...formData,
        new_images_count: images.length,
        existing_images_count: existingImages.length,
      });

      const response = await API.patch(`/communities/${id}/`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ 게시글 수정 성공:', response.data);
      alert('게시글이 수정되었습니다!');
      navigate(`/communities/${id}`);
    } catch (err) {
      console.error('⛔ 게시글 수정 실패:', err);
      console.error('⛔ 에러 응답:', err.response?.data);
      
      if (err.response?.data) {
        const errors = err.response.data;
        const errorMessages = Object.entries(errors)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        setError(`수정 실패:\n${errorMessages}`);
      } else {
        setError('게시글 수정에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

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
                  e.target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md';
                  fallback.innerHTML = '<span class="text-white text-2xl font-bold">🌞</span>';
                  e.target.parentElement.appendChild(fallback);
                }}
              />
              <div>
                <span className="text-xl font-bold text-gray-900">Pet Daylight</span>
                <p className="text-xs text-gray-500">게시글 수정</p>
              </div>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
            >
              취소
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">게시글 수정</h2>
              <p className="text-gray-600">수정할 내용을 입력해주세요.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { value: 'missing_story', emoji: '📍', label: '실종 후기' },
                  { value: 'found_story', emoji: '✅', label: '발견 후기' },
                  { value: 'rescue_story', emoji: '🏥', label: '구조 경험담' },
                  { value: 'tips', emoji: '💡', label: '꿀팁 공유' },
                  { value: 'lifecycle', emoji: '�', label: '생애주기' },
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

            {existingImages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기존 이미지
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {existingImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`기존 이미지 ${index + 1}`}
                        className="w-full h-40 object-cover rounded-xl border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 사진 추가 (최대 {5 - existingImages.length}장)
              </label>
              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={existingImages.length >= 5}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-50 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`새 이미지 ${index + 1}`}
                          className="w-full h-40 object-cover rounded-xl border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          ✕
                        </button>
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
              {loading ? '수정 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CommunityEditPage;