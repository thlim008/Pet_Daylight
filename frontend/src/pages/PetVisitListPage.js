import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';

function PetVisitListPage() {
  const navigate = useNavigate();
  const { petId } = useParams();
  const [pet, setPet] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPet();
    loadVisits();
  }, [petId]);

  const loadPet = async () => {
    try {
      const response = await API.get(`/lifecycles/pets/${petId}/`);
      setPet(response.data);
    } catch (err) {
      console.error('펫 로드 실패:', err);
    }
  };

  const loadVisits = async () => {
    try {
      setLoading(true);
      const response = await API.get('/hospitals/visits/', {
        params: { pet: petId }
      });
      setVisits(response.data.results || response.data);
    } catch (err) {
      console.error('진료 기록 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatCost = (cost) => {
    if (!cost) return '-';
    return new Intl.NumberFormat('ko-KR').format(cost) + '원';
  };

  const handleDelete = async (visitId) => {
    if (!window.confirm('진료 기록을 삭제하시겠습니까?')) return;
    try {
      await API.delete(`/hospitals/visits/${visitId}/`);
      alert('삭제되었습니다.');
      loadVisits();
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="flex items-center space-x-2">
              <img src="/logo.png" alt="Pet Daylight" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
              <div>
                <span className="text-lg sm:text-xl font-bold text-gray-900">진료 기록</span>
                {pet && <p className="text-xs text-gray-500">{pet.name}</p>}
              </div>
            </button>
            <button
              onClick={() => navigate(`/pets/${petId}/visits/new`)}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all text-sm"
            >
              + 기록 추가
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {visits.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <p className="text-5xl mb-4">🏥</p>
            <h3 className="text-xl font-bold text-gray-900 mb-2">진료 기록이 없어요</h3>
            <p className="text-gray-600 mb-6">첫 번째 진료 기록을 추가해보세요</p>
            <button
              onClick={() => navigate(`/pets/${petId}/visits/new`)}
              className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600"
            >
              진료 기록 추가하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {visits.map((visit) => (
              <div
                key={visit.id}
                onClick={() => {}}
                className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">{formatDate(visit.visit_date)}</p>
                    <h3 className="text-lg font-bold text-gray-900">{visit.hospital_name || '병원'}</h3>
                    
                    {/* 주소 표시 */}
                    {visit.hospital_address && (
                      <p className="text-xs text-gray-500 mt-1 flex items-start">
                        <span className="mr-1">📍</span>
                        <span>{visit.hospital_address}</span>
                      </p>
                    )}
                    
                    {/* 전화번호 표시 */}
                    {visit.hospital_phone && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center">
                        <span className="mr-1">📞</span>
                        <span>{visit.hospital_phone}</span>
                      </p>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {visit.purpose}
                  </span>
                </div>
                {visit.notes && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{visit.notes}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">비용</span>
                  <span className="font-bold text-gray-900">{formatCost(visit.cost)}</span>
                </div>
                {visit.next_visit_date && (
                  <div className="mt-2 px-3 py-2 bg-amber-50 rounded-lg">
                    <p className="text-xs text-amber-700">
                      📅 다음 방문 예정: {formatDate(visit.next_visit_date)}
                    </p>
                  </div>
                )}
                <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/pets/${petId}/visits/${visit.id}/edit`); }}
                    className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    수정
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(visit.id); }}
                    className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default PetVisitListPage;
