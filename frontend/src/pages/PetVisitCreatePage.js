import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';

function PetVisitCreatePage() {
  const navigate = useNavigate();
  const { petId, visitId } = useParams();
  const isEditMode = !!visitId;
  const [pet, setPet] = useState(null);
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState('');
  const [hospitalResults, setHospitalResults] = useState([]);
  const [searchingHospitals, setSearchingHospitals] = useState(false);
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hospitalInputMode, setHospitalInputMode] = useState('select');
  const [formData, setFormData] = useState({
    hospital: '',
    hospital_name: '',
    hospital_address: '',
    hospital_phone: '',
    visit_date: new Date().toISOString().split('T')[0],
    purpose: '',
    notes: '',
    cost: '',
    next_visit_date: '',
  });

  const purposes = [
    '정기 검진', '예방 접종', '건강 검진', '질병 치료',
    '수술', '미용', '스케일링', '기타'
  ];

  useEffect(() => {
    loadPet();
    searchHospitals('');
    if (visitId) loadVisit();
  }, [petId, visitId]);

  // 검색어 입력 시 디바운스해서 재검색
  useEffect(() => {
    if (hospitalInputMode !== 'select') return;
    const timer = setTimeout(() => searchHospitals(hospitalSearchQuery), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalSearchQuery, hospitalInputMode]);

  const loadPet = async () => {
    try {
      const response = await API.get(`/lifecycles/pets/${petId}/`);
      setPet(response.data);
    } catch (err) {
      console.error('펫 로드 실패:', err);
    }
  };

  const searchHospitals = async (query) => {
    try {
      setSearchingHospitals(true);
      const response = await API.get('/hospitals/', { params: { search: query, limit: 20 } });
      setHospitalResults(response.data.results || response.data);
    } catch (err) {
      console.error('병원 검색 실패:', err);
    } finally {
      setSearchingHospitals(false);
    }
  };

  const handleSelectHospital = (hospital) => {
    setFormData((prev) => ({ ...prev, hospital: hospital.id }));
    setHospitalSearchQuery(hospital.name);
    setShowHospitalDropdown(false);
  };

  const loadVisit = async () => {
    try {
      const response = await API.get(`/hospitals/visits/${visitId}/`);
      const visit = response.data;
      setFormData({
        hospital: visit.hospital || '',
        hospital_name: visit.hospital_name || '',
        hospital_address: visit.hospital_address || '',
        hospital_phone: visit.hospital_phone || '',
        visit_date: visit.visit_date,
        purpose: visit.purpose,
        notes: visit.notes || '',
        cost: visit.cost || '',
        next_visit_date: visit.next_visit_date || '',
      });
      if (visit.hospital) {
        setHospitalInputMode('select');
        // 검색창에 이미 선택된 병원 이름을 표시
        try {
          const hospitalRes = await API.get(`/hospitals/${visit.hospital}/`);
          setHospitalSearchQuery(hospitalRes.data.name);
        } catch (err) {
          console.error('병원 정보 로드 실패:', err);
        }
      } else {
        setHospitalInputMode('manual');
      }
    } catch (err) {
      console.error('진료 기록 로드 실패:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (hospitalInputMode === 'select' && !formData.hospital) {
      setError('병원을 선택해주세요.');
      return;
    }
    if (hospitalInputMode === 'manual' && !formData.hospital_name) {
      setError('병원 이름을 입력해주세요.');
      return;
    }
    if (!formData.purpose) {
      setError('방문 목적을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const data = {
        pet: petId,
        visit_date: formData.visit_date,
        purpose: formData.purpose,
        notes: formData.notes,
        cost: formData.cost || null,
        next_visit_date: formData.next_visit_date || null,
      };

      // 병원 정보 추가
      if (hospitalInputMode === 'manual') {
        data.hospital_name = formData.hospital_name;
        data.hospital_address = formData.hospital_address;
        data.hospital_phone = formData.hospital_phone;
        data.hospital = null; // hospital FK는 null로 설정
      } else {
        data.hospital = formData.hospital;
      }

      if (isEditMode) {
        await API.put(`/hospitals/visits/${visitId}/`, data);
        alert('진료 기록이 수정되었습니다!');
      } else {
        await API.post('/hospitals/visits/', data);
        alert('진료 기록이 추가되었습니다!');
      }
      navigate(`/pets/${petId}/visits`);
    } catch (err) {
      console.error('진료 기록 저장 실패:', err);
      setError('진료 기록 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="Pet Daylight" className="w-10 h-10 object-contain" />
              <div>
                <span className="text-lg font-bold text-gray-900">
                  {isEditMode ? '진료 기록 수정' : '진료 기록 추가'}
                </span>
                {pet && <p className="text-xs text-gray-500">{pet.name}</p>}
              </div>
            </div>
            <button onClick={() => navigate(-1)} className="px-4 py-2 text-gray-600 hover:text-gray-900">
              취소
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-gray-200 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              병원 정보 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setHospitalInputMode('select')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  hospitalInputMode === 'select'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                주변 병원
              </button>
              <button
                type="button"
                onClick={() => setHospitalInputMode('manual')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  hospitalInputMode === 'manual'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                직접 입력
              </button>
            </div>

            {hospitalInputMode === 'select' && (
              <div className="relative">
                <input
                  type="text"
                  value={hospitalSearchQuery}
                  onChange={(e) => {
                    setHospitalSearchQuery(e.target.value);
                    setFormData((prev) => ({ ...prev, hospital: '' }));
                    setShowHospitalDropdown(true);
                  }}
                  onFocus={() => setShowHospitalDropdown(true)}
                  onBlur={() => setTimeout(() => setShowHospitalDropdown(false), 150)}
                  placeholder="병원 이름으로 검색하세요"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
                {showHospitalDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {searchingHospitals ? (
                      <p className="px-4 py-3 text-sm text-gray-400">검색 중...</p>
                    ) : hospitalResults.length > 0 ? (
                      hospitalResults.map((h) => (
                        <button
                          type="button"
                          key={h.id}
                          onClick={() => handleSelectHospital(h)}
                          className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="font-medium text-gray-900 text-sm">{h.name}</p>
                          {h.address && <p className="text-xs text-gray-500">{h.address}</p>}
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-400">검색 결과가 없습니다</p>
                    )}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  목록에 없으면{' '}
                  <button type="button" onClick={() => navigate('/hospitals')} className="text-amber-600 underline">
                    병원 검색
                  </button>
                  에서 추가하거나 직접 입력하세요
                </p>
              </div>
            )}

            {hospitalInputMode === 'manual' && (
              <div className="space-y-3">
                <input
                  type="text"
                  name="hospital_name"
                  value={formData.hospital_name}
                  onChange={handleChange}
                  placeholder="병원 이름 (예: 서울동물병원)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
                <input
                  type="text"
                  name="hospital_address"
                  value={formData.hospital_address}
                  onChange={handleChange}
                  placeholder="주소 (선택)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
                <input
                  type="tel"
                  name="hospital_phone"
                  value={formData.hospital_phone}
                  onChange={handleChange}
                  placeholder="전화번호 (선택)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
                <p className="text-xs text-gray-500">
                  💡 직접 입력한 병원 정보는 이 진료 기록에만 저장됩니다
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              방문일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="visit_date"
              value={formData.visit_date}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              방문 목적 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {purposes.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({ ...formData, purpose: p })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    formData.purpose === p
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">메모</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="진료 내용, 처방약, 주의사항 등을 기록하세요"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비용</label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">다음 방문 예정일</label>
              <input
                type="date"
                name="next_visit_date"
                value={formData.next_visit_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 disabled:opacity-50 transition-all"
          >
            {loading ? '저장 중...' : isEditMode ? '수정 완료' : '진료 기록 저장'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default PetVisitCreatePage;
