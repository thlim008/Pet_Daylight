import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../services/api';
import BackButton from '../components/BackButton';

function PetHealthPage() {
  const { petId } = useParams();
  const [pet, setPet] = useState(null);
  const [records, setRecords] = useState([]);
  const [weightHistory, setWeightHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    record_date: new Date().toISOString().split('T')[0],
    weight: '',
    condition: 'normal',
    notes: ''
  });
  const [editingId, setEditingId] = useState(null);

  const conditionOptions = [
    { value: 'excellent', label: '매우 좋음', emoji: '😊' },
    { value: 'good', label: '좋음', emoji: '🙂' },
    { value: 'normal', label: '보통', emoji: '😐' },
    { value: 'poor', label: '안좋음', emoji: '😟' },
    { value: 'sick', label: '아픔', emoji: '🤒' },
  ];

  useEffect(() => {
    loadData();
  }, [petId]);

  const loadData = async () => {
    try {
      const [petRes, recordsRes, weightRes] = await Promise.all([
        API.get(`/lifecycles/pets/${petId}/`),
        API.get(`/lifecycles/health-records/?pet=${petId}`),
        API.get(`/lifecycles/health-records/weight_history/?pet=${petId}`)
      ]);
      setPet(petRes.data);
      setRecords(recordsRes.data.results || recordsRes.data);
      setWeightHistory(weightRes.data);
    } catch (err) {
      console.error('데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { 
        ...formData, 
        pet: petId,
        weight: formData.weight ? parseFloat(formData.weight) : null
      };
      if (editingId) {
        await API.put(`/lifecycles/health-records/${editingId}/`, data);
        alert('수정되었습니다!');
      } else {
        await API.post('/lifecycles/health-records/', data);
        alert('등록되었습니다!');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        record_date: new Date().toISOString().split('T')[0],
        weight: '',
        condition: 'normal',
        notes: ''
      });
      loadData();
    } catch (err) {
      console.error('저장 실패:', err);
      alert('저장에 실패했습니다.');
    }
  };

  const handleEdit = (record) => {
    setFormData({
      record_date: record.record_date,
      weight: record.weight || '',
      condition: record.condition,
      notes: record.notes || ''
    });
    setEditingId(record.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    try {
      await API.delete(`/lifecycles/health-records/${id}/`);
      loadData();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  const getConditionEmoji = (condition) => {
    const found = conditionOptions.find(c => c.value === condition);
    return found ? found.emoji : '😐';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
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
                <span className="text-lg font-bold text-gray-900">📊 건강기록</span>
                {pet && <p className="text-xs text-gray-500">{pet.name}</p>}
              </div>
            </div>
            <BackButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">건강 기록</h2>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); }}
            className="px-4 py-2 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600"
          >
            + 기록 추가
          </button>
        </div>

        {weightHistory.length > 1 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">📈 체중 변화</h3>
            <div className="h-48 flex items-end gap-2">
              {weightHistory.slice(-12).map((item, idx) => {
                const maxWeight = Math.max(...weightHistory.map(w => parseFloat(w.weight)));
                const height = (parseFloat(item.weight) / maxWeight) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <span className="text-xs text-gray-600 mb-1">{item.weight}kg</span>
                    <div 
                      className="w-full bg-purple-400 rounded-t"
                      style={{ height: `${height}%`, minHeight: '20px' }}
                    />
                    <span className="text-xs text-gray-400 mt-1">
                      {item.record_date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
            <h3 className="text-lg font-bold mb-4">{editingId ? '기록 수정' : '기록 추가'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">기록일 *</label>
                <input
                  type="date"
                  value={formData.record_date}
                  onChange={(e) => setFormData({...formData, record_date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">체중 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  placeholder="예: 5.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">건강 상태</label>
                <div className="grid grid-cols-5 gap-2">
                  {conditionOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({...formData, condition: opt.value})}
                      className={`p-3 rounded-xl border text-center ${
                        formData.condition === opt.value 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200'
                      }`}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <p className="text-xs mt-1">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">특이사항</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  rows={3}
                  placeholder="오늘의 상태, 특이사항 등"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 bg-gray-100 rounded-xl">
                  취소
                </button>
                <button type="submit" className="flex-1 py-3 bg-purple-500 text-white rounded-xl">
                  {editingId ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        )}

        {records.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-600">아직 등록된 건강기록이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div key={record.id} className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getConditionEmoji(record.condition)}</span>
                    <div>
                      <p className="font-bold text-gray-900">{record.record_date}</p>
                      <p className="text-sm text-gray-600">{record.condition_display}</p>
                    </div>
                  </div>
                  {record.weight && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {record.weight}kg
                    </span>
                  )}
                </div>
                {record.notes && (
                  <p className="text-sm text-gray-600 mt-2">📝 {record.notes}</p>
                )}
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button onClick={() => handleEdit(record)} className="text-sm text-blue-600 hover:underline">
                    수정
                  </button>
                  <button onClick={() => handleDelete(record.id)} className="text-sm text-red-600 hover:underline">
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

export default PetHealthPage;
