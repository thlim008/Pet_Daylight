import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';

function PetAlbumPage() {
  const { petId } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);

  useEffect(() => {
    loadData();
  }, [petId]);

  const loadData = async () => {
    try {
      const [petRes, photosRes] = await Promise.all([
        API.get(`/lifecycles/pets/${petId}/`),
        API.get(`/lifecycles/photos/?pet=${petId}`)
      ]);
      setPet(petRes.data);
      setPhotos(photosRes.data.results || photosRes.data);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('pet', petId);
        formData.append('image', file);
        formData.append('taken_date', new Date().toISOString().split('T')[0]);
        await API.post('/lifecycles/photos/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      alert(`${files.length}장 업로드 완료!`);
      loadData();
    } catch (err) {
      console.error('업로드 실패:', err);
      alert('업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSingle = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      await API.delete(`/lifecycles/photos/${id}/`);
      setSelectedPhoto(null);
      loadData();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPhotoIds.length === 0) {
      alert('삭제할 사진을 선택해주세요.');
      return;
    }

    if (!window.confirm(`선택한 ${selectedPhotoIds.length}장의 사진을 삭제하시겠습니까?`)) return;

    try {
      await Promise.all(
        selectedPhotoIds.map(id => API.delete(`/lifecycles/photos/${id}/`))
      );
      alert(`${selectedPhotoIds.length}장 삭제 완료!`);
      setSelectedPhotoIds([]);
      setSelectMode(false);
      loadData();
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  const toggleSelectPhoto = (photoId) => {
    setSelectedPhotoIds(prev => {
      if (prev.includes(photoId)) {
        return prev.filter(id => id !== photoId);
      } else {
        return [...prev, photoId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedPhotoIds.length === photos.length) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(photos.map(p => p.id));
    }
  };

  const cancelSelectMode = () => {
    setSelectMode(false);
    setSelectedPhotoIds([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="Pet Daylight" className="w-10 h-10 object-contain" />
              <div>
                <span className="text-lg font-bold text-gray-900">📷 앨범</span>
                {pet && <p className="text-xs text-gray-500">{pet.name}</p>}
              </div>
            </div>
            <button onClick={() => navigate(-1)} className="px-4 py-2 text-gray-600 hover:text-gray-900">
              뒤로
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {pet?.name}의 앨범 ({photos.length}장)
            {selectMode && selectedPhotoIds.length > 0 && (
              <span className="ml-2 text-pink-600">({selectedPhotoIds.length}장 선택됨)</span>
            )}
          </h2>
          
          <div className="flex gap-2">
            {selectMode ? (
              <>
                {photos.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                  >
                    {selectedPhotoIds.length === photos.length ? '전체 해제' : '전체 선택'}
                  </button>
                )}
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedPhotoIds.length === 0}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  삭제 ({selectedPhotoIds.length})
                </button>
                <button
                  onClick={cancelSelectMode}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                {photos.length > 0 && (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                  >
                    선택
                  </button>
                )}
                <label className="px-4 py-2 bg-pink-500 text-white rounded-xl font-medium hover:bg-pink-600 cursor-pointer">
                  {uploading ? '업로드 중...' : '+ 사진 추가'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <p className="text-4xl mb-3">📷</p>
            <p className="text-gray-600">아직 등록된 사진이 없습니다</p>
            <p className="text-sm text-gray-400 mt-2">추억을 기록해보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => {
                  if (selectMode) {
                    toggleSelectPhoto(photo.id);
                  } else {
                    setSelectedPhoto(photo);
                  }
                }}
                className={`aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-all relative ${
                  selectMode && selectedPhotoIds.includes(photo.id) 
                    ? 'ring-4 ring-pink-500' 
                    : ''
                }`}
              >
                <img
                  src={photo.image}
                  alt={photo.caption || '펫 사진'}
                  className="w-full h-full object-cover"
                />
                
                {/* 선택 모드일 때 체크박스 표시 */}
                {selectMode && (
                  <div className="absolute top-2 right-2">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedPhotoIds.includes(photo.id)
                        ? 'bg-pink-500 border-pink-500'
                        : 'bg-white border-gray-300'
                    }`}>
                      {selectedPhotoIds.includes(photo.id) && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 사진 상세 보기 모달 (선택 모드가 아닐 때만) */}
        {selectedPhoto && !selectMode && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="max-w-2xl w-full relative" onClick={e => e.stopPropagation()}>
              <img
                src={selectedPhoto.image}
                alt={selectedPhoto.caption || '펫 사진'}
                className="w-full rounded-xl"
              />
              <div className="mt-4 flex justify-between items-center">
                <div className="text-white">
                  {selectedPhoto.taken_date && (
                    <p className="text-sm">📅 {selectedPhoto.taken_date}</p>
                  )}
                  {selectedPhoto.caption && (
                    <p className="text-sm mt-1">📝 {selectedPhoto.caption}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteSingle(selectedPhoto.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600"
                >
                  삭제
                </button>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 text-white text-3xl hover:opacity-80"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PetAlbumPage;
