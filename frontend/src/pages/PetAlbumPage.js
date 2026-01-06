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

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      await API.delete(`/lifecycles/photos/${id}/`);
      setSelectedPhoto(null);
      loadData();
    } catch (err) {
      alert('삭제 실패');
    }
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
          <h2 className="text-xl font-bold text-gray-900">{pet?.name}의 앨범 ({photos.length}장)</h2>
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
                onClick={() => setSelectedPhoto(photo)}
                className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              >
                <img
                  src={photo.image}
                  alt={photo.caption || '펫 사진'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {selectedPhoto && (
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
                  onClick={() => handleDelete(selectedPhoto.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm"
                >
                  삭제
                </button>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 text-white text-3xl"
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
