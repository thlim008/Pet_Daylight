import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../services/api';
import BackButton from '../components/BackButton';

function PetVaccinationPage() {
  const { petId } = useParams();
  const [pet, setPet] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [noNextDueDate, setNoNextDueDate] = useState(false);
  const [formData, setFormData] = useState({
    vaccine_type: 'dhppl',
    vaccine_name: '',
    vaccination_date: new Date().toISOString().split('T')[0],
    next_due_date: '',
    hospital_name: '',
    notes: ''
  });
  const [editingId, setEditingId] = useState(null);

  const vaccineTypes = [
    { value: 'dhppl', label: 'DHPPL (종합백신)' },
    { value: 'rabies', label: '광견병' },
    { value: 'corona', label: '코로나장염' },
    { value: 'kennel_cough', label: '켄넬코프' },
    { value: 'fvrcp', label: 'FVRCP (고양이 종합)' },
    { value: 'felv', label: '고양이 백혈병' },
    { value: 'other', label: '기타' },
  ];

  useEffect(() => {
    loadData();
  }, [petId]);

  const loadData = async () => {
    try {
      const [petRes, vaccRes] = await Promise.all([
        API.get(`/lifecycles/pets/${petId}/`),
        API.get(`/lifecycles/vaccinations/?pet=${petId}`)
      ]);
      setPet(petRes.data);
      setVaccinations(vaccRes.data.results || vaccRes.data);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!noNextDueDate && !formData.next_due_date) {
          alert('다음 접종 예정일을 입력하거나, "예정일 없음"을 체크해주세요.');
          return;
      }
      const data = { 
        ...formData, 
        pet: petId,
        next_due_date: noNextDueDate ? null : formData.next_due_date || null
      };
      if (editingId) {
        await API.put(`/lifecycles/vaccinations/${editingId}/`, data);
        alert('수정되었습니다!');
      } else {
        await API.post('/lifecycles/vaccinations/', data);
        alert('등록되었습니다!');
      }
      setShowForm(false);
      setEditingId(null);
      setNoNextDueDate(false);
      setFormData({
        vaccine_type: 'dhppl',
        vaccine_name: '',
        vaccination_date: new Date().toISOString().split('T')[0],
        next_due_date: '',
        hospital_name: '',
        notes: ''
      });
      loadData();
    } catch (err) {
      console.error('저장 실패:', err);
      alert('저장에 실패했습니다.');
    }
  };

  const handleEdit = (vacc) => {
    setFormData({
      vaccine_type: vacc.vaccine_type,
      vaccine_name: vacc.vaccine_name || '',
      vaccination_date: vacc.vaccination_date,
      next_due_date: vacc.next_due_date || '',
      hospital_name: vacc.hospital_name || '',
      notes: vacc.notes || ''
    });
    setNoNextDueDate(!vacc.next_due_date);
    setEditingId(vacc.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      await API.delete(`/lifecycles/vaccinations/${id}/`);
      loadData();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
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
                <span className="text-lg font-bold text-gray-900">💉 예방접종</span>
                {pet && <p className="text-xs text-gray-500">{pet.name}</p>}
              </div>
            </div>
            <BackButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">예방접종 기록</h2>
          <button
            onClick={() => { 
              setShowForm(true); 
              setEditingId(null); 
              setNoNextDueDate(false);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600"
          >
            + 접종 추가
          </button>
        </div>

        {/* 다가오는 접종 알림 */}
        {vaccinations.some(v => {
          const days = getDaysUntilDue(v.next_due_date);
          return days !== null && days <= 30 && days >= 0;
        }) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-amber-800 mb-2">⏰ 다가오는 예방접종</h3>
            {vaccinations.filter(v => {
              const days = getDaysUntilDue(v.next_due_date);
              return days !== null && days <= 30 && days >= 0;
            }).map(v => (
              <div key={v.id} className="text-sm text-amber-700">
                {v.vaccine_type_display}: {v.next_due_date} ({getDaysUntilDue(v.next_due_date)}일 후)
              </div>
            ))}
          </div>
        )}

        {/* 폼 */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-bold mb-4">{editingId ? '접종 수정' : '접종 추가'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">백신 종류 *</label>
                <select
                  value={formData.vaccine_type}
                  onChange={(e) => setFormData({...formData, vaccine_type: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  required
                >
                  {vaccineTypes.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">백신명 (상세)</label>
                <input
                  type="text"
                  value={formData.vaccine_name}
                  onChange={(e) => setFormData({...formData, vaccine_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  placeholder="예: 노비박 DHPPL"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">접종일 *</label>
                  <input
                    type="date"
                    value={formData.vaccination_date}
                    onChange={(e) => setFormData({...formData, vaccination_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">다음 접종 예정일</label>
                  <input
                    type="date"
                    value={formData.next_due_date}
                    onChange={(e) => setFormData({...formData, next_due_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl disabled:bg-gray-100 disabled:text-gray-400"
                    disabled={noNextDueDate}
                  />
                  {/* 예정일 없음 체크박스 */}
                  <label className="flex items-center mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noNextDueDate}
                      onChange={(e) => {
                        setNoNextDueDate(e.target.checked);
                        if (e.target.checked) {
                          setFormData({...formData, next_due_date: ''});
                        }
                      }}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">예정일 없음</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">접종 병원</label>
                <input
                  type="text"
                  value={formData.hospital_name}
                  onChange={(e) => setFormData({...formData, hospital_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  placeholder="병원명"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">메모</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowForm(false);
                    setNoNextDueDate(false);
                  }} 
                  className="flex-1 py-3 bg-gray-100 rounded-xl"
                >
                  취소
                </button>
                <button type="submit" className="flex-1 py-3 bg-green-500 text-white rounded-xl">
                  {editingId ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 목록 */}
        {vaccinations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <p className="text-4xl mb-3">💉</p>
            <p className="text-gray-600">아직 등록된 예방접종이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vaccinations.map((vacc) => {
              const daysUntil = getDaysUntilDue(vacc.next_due_date);
              return (
                <div key={vacc.id} className="bg-white rounded-xl p-5 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-lg font-bold text-gray-900">{vacc.vaccine_type_display}</span>
                      {vacc.vaccine_name && (
                        <span className="text-sm text-gray-500 ml-2">({vacc.vaccine_name})</span>
                      )}
                    </div>
                    {daysUntil !== null && daysUntil <= 7 && daysUntil >= 0 && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        ⚠️ {daysUntil}일 후 접종
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>📅 접종일: {vacc.vaccination_date}</p>
                    {vacc.next_due_date ? (
                      <p>⏰ 다음 접종: {vacc.next_due_date}</p>
                    ) : (
                      <p className="text-gray-400">⏰ 다음 접종: 없음</p>
                    )}
                    {vacc.hospital_name && <p>🏥 병원: {vacc.hospital_name}</p>}
                    {vacc.notes && <p>📝 메모: {vacc.notes}</p>}
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button onClick={() => handleEdit(vacc)} className="text-sm text-blue-600 hover:underline">
                      수정
                    </button>
                    <button onClick={() => handleDelete(vacc.id)} className="text-sm text-red-600 hover:underline">
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default PetVaccinationPage;
