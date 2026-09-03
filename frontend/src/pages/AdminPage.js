import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { authAPI } from '../services/api';
import KakaoMap from '../components/KakaoMap';
import { formatBusinessPhone, formatPhoneInput } from '../utils/phone';
import { getPasswordError } from '../utils/password';
import PasswordInput from '../components/PasswordInput';

const TABS = [
  { key: 'users', label: '회원', endpoint: 'accounts' },
  { key: 'missing-pets', label: '실종/발견/구조 제보', endpoint: 'missing-pets' },
  { key: 'missing-pet-comments', label: '제보 댓글', endpoint: 'missing-pets/comments' },
  { key: 'communities', label: '커뮤니티 게시글', endpoint: 'communities' },
  { key: 'community-comments', label: '커뮤니티 댓글', endpoint: 'communities/comments' },
  { key: 'hospitals', label: '병원', endpoint: 'hospitals', shape: 'hospitals', hospitalType: 'hospital' },
  { key: 'groomings', label: '미용실', endpoint: 'hospitals', shape: 'hospitals', hospitalType: 'grooming' },
  { key: 'hospital-reviews', label: '병원 리뷰', endpoint: 'hospitals/reviews', shape: 'hospital-reviews', hospitalType: 'hospital' },
  { key: 'grooming-reviews', label: '미용실 리뷰', endpoint: 'hospitals/reviews', shape: 'hospital-reviews', hospitalType: 'grooming' },
  { key: 'guides', label: '생애주기 가이드', endpoint: 'lifecycles/guides' },
];

const PROVIDER_LABELS = { kakao: '카카오', naver: '네이버', google: '구글' };

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const emptyOpeningHours = () =>
  WEEKDAYS.reduce((acc, day) => ({ ...acc, [day]: { closed: false, open: '09:00', close: '18:00' } }), {});

const emptyHospital = {
  type: 'hospital',
  name: '',
  address: '',
  phone: '',
  latitude: 37.5665,
  longitude: 126.978,
  price_range: 'medium',
  website: '',
  description: '',
  is_24_hours: false,
  managers: [],
};

const STAGE_OPTIONS = [
  { value: 'adoption', label: '입양 준비' },
  { value: 'puppy', label: '육아' },
  { value: 'health', label: '건강관리' },
  { value: 'senior', label: '노령 케어' },
  { value: 'farewell', label: '이별/장례' },
];

const FILTER_CONFIG = {
  users: [
    {
      key: 'social',
      label: '가입방식',
      options: [
        { value: '', label: '전체' },
        { value: 'normal', label: '일반' },
        { value: 'social', label: '소셜' },
      ],
      match: (item, value) => !value || (value === 'social' ? !!item.is_social_account : !item.is_social_account),
    },
    {
      key: 'role',
      label: '권한',
      options: [
        { value: '', label: '전체' },
        { value: 'normal', label: '일반' },
        { value: 'hospital_manager', label: '병원 관리자' },
        { value: 'admin', label: '관리자' },
      ],
      match: (item, value) => {
        if (!value) return true;
        if (value === 'admin') return !!item.is_staff;
        if (value === 'hospital_manager') return !item.is_staff && !!item.is_hospital_manager;
        return !item.is_staff && !item.is_hospital_manager;
      },
    },
  ],
  'missing-pets': [
    {
      key: 'status',
      label: '상태',
      options: [
        { value: '', label: '전체' },
        { value: 'active', label: '진행중' },
        { value: 'resolved', label: '해결' },
        { value: 'closed', label: '종료' },
      ],
      match: (item, value) => !value || item.status === value,
    },
  ],
  guides: [
    {
      key: 'species',
      label: '종류',
      options: [
        { value: '', label: '전체' },
        { value: 'dog', label: '강아지' },
        { value: 'cat', label: '고양이' },
        { value: 'other', label: '기타' },
      ],
      match: (item, value) => !value || item.species === value,
    },
    {
      key: 'stage',
      label: '단계',
      options: [{ value: '', label: '전체' }, ...STAGE_OPTIONS],
      match: (item, value) => !value || item.stage === value,
    },
  ],
};

const emptyGuide = {
  species: 'dog',
  custom_species_name: '',
  emoji: '🐾',
  stage: 'adoption',
  title: '',
  description: '',
  content: '',
  checklistText: '',
  order: 1,
  image: '',
};

function parseOpeningHoursToState(openingHours) {
  const state = emptyOpeningHours();
  if (!openingHours) return state;
  WEEKDAYS.forEach((day) => {
    const val = openingHours[day];
    if (!val || val === '휴무' || val.toLowerCase?.() === 'closed') {
      state[day] = { closed: true, open: '09:00', close: '18:00' };
    } else if (val.includes('-')) {
      const [open, close] = val.split('-').map((s) => s.trim());
      state[day] = { closed: false, open, close };
    }
  });
  return state;
}

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFullAdmin, setIsFullAdmin] = useState(false);
  const [hospitalManagers, setHospitalManagers] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const PAGE_SIZE = 20;

  // 병원 추가/수정 폼 상태
  const [showHospitalForm, setShowHospitalForm] = useState(false);
  const [editingHospitalId, setEditingHospitalId] = useState(null);
  const [hospitalForm, setHospitalForm] = useState(emptyHospital);
  const [openingHours, setOpeningHours] = useState(emptyOpeningHours());
  const [hospitalExistingImages, setHospitalExistingImages] = useState([]);
  const [hospitalNewImages, setHospitalNewImages] = useState([]);
  const [hospitalNewImagePreviews, setHospitalNewImagePreviews] = useState([]);
  const MAX_HOSPITAL_IMAGES = 5;

  // 회원 수정 폼 상태
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserIsSocial, setEditingUserIsSocial] = useState(false);
  const [userForm, setUserForm] = useState({ nickname: '', email: '', phone_number: '', is_staff: false, is_hospital_manager: false });
  const [newPassword, setNewPassword] = useState('');

  // 생애주기 가이드 추가/수정 폼 상태
  const [showGuideForm, setShowGuideForm] = useState(false);
  const [editingGuideId, setEditingGuideId] = useState(null);
  const [guideForm, setGuideForm] = useState(emptyGuide);

  const currentTab = TABS.find((t) => t.key === activeTab);
  const dataShape = currentTab?.shape || activeTab;
  const HOSPITAL_MANAGER_TAB_KEYS = ['hospitals', 'groomings', 'hospital-reviews', 'grooming-reviews'];
  const visibleTabs = isFullAdmin ? TABS : TABS.filter((t) => HOSPITAL_MANAGER_TAB_KEYS.includes(t.key));

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await authAPI.getMe();
        if (!res.data.is_staff && !res.data.is_hospital_manager) {
          alert('관리자만 접근할 수 있습니다.');
          navigate('/');
          return;
        }
        setIsAdmin(true);
        setIsFullAdmin(!!res.data.is_staff);
        if (!res.data.is_staff && res.data.is_hospital_manager) {
          setActiveTab('hospitals');
        }
      } catch (err) {
        navigate('/login');
      } finally {
        setChecking(false);
      }
    };
    checkAdmin();
  }, [navigate]);

  const closeAllForms = () => {
    setShowHospitalForm(false);
    setEditingHospitalId(null);
    setHospitalExistingImages([]);
    setHospitalNewImages([]);
    setHospitalNewImagePreviews([]);
    setEditingUserId(null);
    setEditingUserIsSocial(false);
    setNewPassword('');
    setShowGuideForm(false);
    setEditingGuideId(null);
  };

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (currentTab.hospitalType) {
        if (currentTab.shape === 'hospitals') params.type = currentTab.hospitalType;
        else if (currentTab.shape === 'hospital-reviews') params.hospital_type = currentTab.hospitalType;
      }
      const res = await API.get(`/${currentTab.endpoint}/`, { params });
      const data = res.data.results || res.data;
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => a.id - b.id) : [];
      setItems(sorted);
      setCurrentPage(1);
    } catch (err) {
      console.error('목록 로드 실패:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentTab.endpoint, currentTab.hospitalType, currentTab.shape]);

  useEffect(() => {
    if (isAdmin) loadItems();
  }, [isAdmin, loadItems]);

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
    try {
      await API.delete(`/${currentTab.endpoint}/${id}/`);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert('삭제에 실패했습니다: ' + (err.response?.data?.error || err.message));
    }
  };

  // ===== 회원 수정 =====
  const startEditUser = (user) => {
    closeAllForms();
    setEditingUserId(user.id);
    setEditingUserIsSocial(!!user.is_social_account);
    setUserForm({
      nickname: user.nickname || user.username || '',
      email: user.email || '',
      phone_number: user.phone_number || '',
      is_staff: user.is_staff,
      is_hospital_manager: !!user.is_hospital_manager,
    });
    setNewPassword('');
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 빈 칸으로 둔 필드는 변경하지 않고 기존 값 유지 (비밀번호와 동일한 방식)
      const payload = { is_staff: userForm.is_staff, is_hospital_manager: userForm.is_hospital_manager };
      if (userForm.nickname) payload.nickname = userForm.nickname;
      if (userForm.email) payload.email = userForm.email;
      if (userForm.phone_number) payload.phone_number = userForm.phone_number;

      const res = await API.patch(`/accounts/${editingUserId}/`, payload);
      if (newPassword && !editingUserIsSocial) {
        const passwordError = getPasswordError(newPassword);
        if (passwordError) {
          alert(passwordError);
          setSaving(false);
          return;
        }
        await API.post(`/accounts/${editingUserId}/set_password/`, { password: newPassword });
      }
      setItems((prev) => prev.map((u) => (u.id === editingUserId ? { ...u, ...res.data } : u)));
      setEditingUserId(null);
      setNewPassword('');
    } catch (err) {
      alert('저장에 실패했습니다: ' + JSON.stringify(err.response?.data || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ===== 병원/미용실 추가·수정 =====
  const loadHospitalManagers = useCallback(async () => {
    if (!isFullAdmin) return;
    try {
      const res = await API.get('/accounts/');
      const data = res.data.results || res.data;
      setHospitalManagers((Array.isArray(data) ? data : []).filter((u) => u.is_hospital_manager));
    } catch (err) {
      console.error('병원 관리자 목록 로드 실패:', err);
    }
  }, [isFullAdmin]);

  const startAddHospital = () => {
    closeAllForms();
    setHospitalForm({ ...emptyHospital, type: currentTab.hospitalType || 'hospital' });
    setOpeningHours(emptyOpeningHours());
    setHospitalExistingImages([]);
    setShowHospitalForm(true);
    loadHospitalManagers();
  };

  const startEditHospital = (hospital) => {
    closeAllForms();
    setEditingHospitalId(hospital.id);
    setHospitalForm({
      type: hospital.type,
      name: hospital.name,
      address: hospital.address,
      phone: hospital.phone,
      latitude: Number(hospital.latitude),
      longitude: Number(hospital.longitude),
      price_range: hospital.price_range,
      website: hospital.website || '',
      description: hospital.description || '',
      is_24_hours: hospital.is_24_hours,
      managers: hospital.managers || [],
    });
    setOpeningHours(parseOpeningHoursToState(hospital.opening_hours));
    setHospitalExistingImages(hospital.images_full_url || []);
    setShowHospitalForm(true);
    loadHospitalManagers();
  };

  const handleHospitalImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = MAX_HOSPITAL_IMAGES - hospitalExistingImages.length - hospitalNewImages.length;
    if (remainingSlots <= 0) {
      alert(`최대 ${MAX_HOSPITAL_IMAGES}장까지 업로드 가능합니다.`);
      e.target.value = '';
      return;
    }
    const filesToAdd = files.slice(0, remainingSlots);
    setHospitalNewImages((prev) => [...prev, ...filesToAdd]);
    setHospitalNewImagePreviews((prev) => [...prev, ...filesToAdd.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeHospitalExistingImage = (index) => {
    setHospitalExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeHospitalNewImage = (index) => {
    setHospitalNewImages((prev) => prev.filter((_, i) => i !== index));
    setHospitalNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const makeHospitalExistingImageThumbnail = (index) => {
    setHospitalExistingImages((prev) => [prev[index], ...prev.filter((_, i) => i !== index)]);
  };

  const handleSaveHospital = async (e) => {
    e.preventDefault();

    if (!hospitalForm.address) {
      alert('지도에서 주소를 검색하거나 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const hours = {};
      if (!hospitalForm.is_24_hours) {
        WEEKDAYS.forEach((day) => {
          const d = openingHours[day];
          hours[day] = d.closed ? '휴무' : `${d.open}-${d.close}`;
        });
      }
      const website = hospitalForm.website.trim();
      const normalizedWebsite = website && !/^https?:\/\//i.test(website)
        ? `https://${website}`
        : website;

      const data = new FormData();
      data.append('type', hospitalForm.type);
      data.append('name', hospitalForm.name);
      data.append('address', hospitalForm.address);
      data.append('phone', hospitalForm.phone || '');
      data.append('latitude', Number(hospitalForm.latitude).toFixed(6));
      data.append('longitude', Number(hospitalForm.longitude).toFixed(6));
      data.append('price_range', hospitalForm.price_range);
      data.append('website', normalizedWebsite);
      data.append('description', hospitalForm.description || '');
      data.append('is_24_hours', hospitalForm.is_24_hours);
      data.append('opening_hours', JSON.stringify(hours));
      hospitalForm.managers.forEach((id) => data.append('managers', id));
      hospitalNewImages.forEach((file) => data.append('uploaded_images', file));
      if (editingHospitalId) {
        data.append('existing_images', JSON.stringify(hospitalExistingImages));
        await API.patch(`/hospitals/${editingHospitalId}/`, data);
      } else {
        await API.post('/hospitals/', data);
      }
      closeAllForms();
      loadItems();
    } catch (err) {
      alert('저장에 실패했습니다: ' + JSON.stringify(err.response?.data || err.message));
    } finally {
      setSaving(false);
    }
  };

  // ===== 생애주기 가이드 추가·수정 =====
  const startAddGuide = () => {
    closeAllForms();
    setGuideForm(emptyGuide);
    setShowGuideForm(true);
  };

  const startEditGuide = (guide) => {
    closeAllForms();
    setEditingGuideId(guide.id);
    setGuideForm({
      species: guide.species,
      custom_species_name: guide.custom_species_name || '',
      emoji: guide.emoji || '🐾',
      stage: guide.stage,
      title: guide.title,
      description: guide.description || '',
      content: guide.content || '',
      checklistText: (guide.checklist || []).join('\n'),
      order: guide.order,
      image: guide.image || '',
    });
    setShowGuideForm(true);
  };

  const handleSaveGuide = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        species: guideForm.species,
        custom_species_name: guideForm.species === 'other' ? guideForm.custom_species_name : '',
        emoji: guideForm.emoji || '🐾',
        stage: guideForm.stage,
        title: guideForm.title,
        description: guideForm.description,
        content: guideForm.content,
        checklist: guideForm.checklistText.split('\n').map((s) => s.trim()).filter(Boolean),
        order: Math.max(1, Number(guideForm.order) || 1),
      };
      if (editingGuideId) {
        await API.patch(`/lifecycles/guides/${editingGuideId}/`, payload);
      } else {
        await API.post('/lifecycles/guides/', payload);
      }
      closeAllForms();
      loadItems();
    } catch (err) {
      alert('저장에 실패했습니다: ' + JSON.stringify(err.response?.data || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-900 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const renderRow = (item) => {
    switch (dataShape) {
      case 'users':
        return (
          <>
            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.nickname || item.username}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.username}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.email || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.phone_number || '-'}</td>
            <td className="px-4 py-3 text-sm whitespace-nowrap">
              {item.is_social_account ? (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium whitespace-nowrap">
                  🔗 {(item.social_providers || []).map((p) => PROVIDER_LABELS[p] || p).join(', ') || '소셜'}
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap">일반</span>
              )}
            </td>
            <td className="px-4 py-3 text-sm whitespace-nowrap">
              {item.is_staff && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium whitespace-nowrap mr-1">관리자</span>}
              {item.is_hospital_manager && <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-medium whitespace-nowrap">병원 관리자</span>}
            </td>
          </>
        );
      case 'missing-pets':
        return (
          <>
            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.category_display}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.user?.nickname || item.user?.username}</td>
            <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">{item.address}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.status_display}</td>
          </>
        );
      case 'missing-pet-comments':
        return (
          <>
            <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-md">{item.content}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.user?.nickname || item.user?.username}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">제보 #{item.missing_pet}</td>
          </>
        );
      case 'communities':
        return (
          <>
            <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate max-w-xs">{item.title}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.user?.nickname || item.user?.username}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.category}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">조회 {item.views || 0}</td>
          </>
        );
      case 'community-comments':
        return (
          <>
            <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-md">{item.content}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.user?.nickname || item.user?.username}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">글 #{item.community}</td>
          </>
        );
      case 'hospitals':
        return (
          <>
            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.name}</td>
            <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">{item.address}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">⭐ {item.rating || 0}</td>
            {isFullAdmin && (
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {item.manager_names && item.manager_names.length > 0 ? item.manager_names.join(', ') : '-'}
              </td>
            )}
          </>
        );
      case 'hospital-reviews':
        return (
          <>
            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.hospital_name || '-'}</td>
            <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-md">{item.content}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.user_name || item.user?.nickname}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">⭐ {item.rating}</td>
          </>
        );
      case 'guides':
        return (
          <>
            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.title}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
              {item.species === 'dog' ? '강아지' : item.species === 'cat' ? '고양이' : `기타${item.custom_species_name ? ` (${item.custom_species_name})` : ''}`}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{STAGE_OPTIONS.find((s) => s.value === item.stage)?.label || item.stage}</td>
            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.order}</td>
          </>
        );
      default:
        return null;
    }
  };

  const headers = {
    users: ['ID', '닉네임', '아이디', '이메일', '전화번호', '가입방식', '권한'],
    'missing-pets': ['ID', '이름', '분류', '작성자', '위치', '상태'],
    'missing-pet-comments': ['ID', '내용', '작성자', '제보'],
    communities: ['ID', '제목', '작성자', '카테고리', '조회수'],
    'community-comments': ['ID', '내용', '작성자', '게시글'],
    hospitals: isFullAdmin ? ['ID', '이름', '주소', '평점', '담당자'] : ['ID', '이름', '주소', '평점'],
    groomings: isFullAdmin ? ['ID', '이름', '주소', '평점', '담당자'] : ['ID', '이름', '주소', '평점'],
    'hospital-reviews': ['ID', '병원', '내용', '작성자', '평점'],
    'grooming-reviews': ['ID', '미용실', '내용', '작성자', '평점'],
    guides: ['ID', '제목', '종류', '단계', '순서'],
  };

  const getSearchableText = (item) => {
    switch (dataShape) {
      case 'users':
        return [item.nickname, item.username, item.email, item.phone_number];
      case 'missing-pets':
        return [item.name, item.category_display, item.user?.nickname, item.user?.username, item.address, item.status_display];
      case 'missing-pet-comments':
        return [item.content, item.user?.nickname, item.user?.username];
      case 'communities':
        return [item.title, item.user?.nickname, item.user?.username, item.category];
      case 'community-comments':
        return [item.content, item.user?.nickname, item.user?.username];
      case 'hospitals':
        return [item.name, item.address, ...(item.manager_names || [])];
      case 'hospital-reviews':
        return [item.hospital_name, item.content, item.user_name, item.user?.nickname];
      case 'guides':
        return [item.title, item.custom_species_name];
      default:
        return [];
    }
  };

  const activeFilters = FILTER_CONFIG[activeTab] || [];

  const filteredItems = items.filter((item) => {
    const matchesFilters = activeFilters.every((f) => f.match(item, filterValues[f.key] || ''));
    if (!matchesFilters) return false;
    if (!searchQuery.trim()) return true;
    return getSearchableText(item)
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());
  });

  const editableRow = (item) => {
    if (activeTab === 'users') {
      return (
        <button onClick={() => startEditUser(item)} className="text-xs font-medium text-blue-500 hover:text-blue-700 hover:underline mr-3">수정</button>
      );
    }
    if (dataShape === 'hospitals') {
      return (
        <button onClick={() => startEditHospital(item)} className="text-xs font-medium text-blue-500 hover:text-blue-700 hover:underline mr-3">수정</button>
      );
    }
    if (activeTab === 'guides') {
      return (
        <button onClick={() => startEditGuide(item)} className="text-xs font-medium text-blue-500 hover:text-blue-700 hover:underline mr-3">수정</button>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">🛠 관리자 페이지</h1>
          <button onClick={() => navigate('/')} className="text-sm text-gray-600 hover:text-gray-900">홈으로</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); closeAllForms(); setSearchQuery(''); setFilterValues({}); }}
                className={`px-4 py-3 font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'text-amber-600 border-b-2 border-amber-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="검색어를 입력하세요"
              className="w-full sm:w-80 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            {activeFilters.map((f) => (
              <select
                key={f.key}
                value={filterValues[f.key] || ''}
                onChange={(e) => { setFilterValues({ ...filterValues, [f.key]: e.target.value }); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{f.label}: {o.label}</option>
                ))}
              </select>
            ))}
          </div>
          {dataShape === 'hospitals' && (
            <button
              onClick={() => (showHospitalForm ? closeAllForms() : startAddHospital())}
              className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all whitespace-nowrap"
            >
              {showHospitalForm ? '닫기' : `+ ${currentTab.label} 추가`}
            </button>
          )}
          {activeTab === 'guides' && (
            <button
              onClick={() => (showGuideForm ? closeAllForms() : startAddGuide())}
              className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all whitespace-nowrap"
            >
              {showGuideForm ? '닫기' : '+ 가이드 추가'}
            </button>
          )}
        </div>

        {/* 회원 수정 폼 */}
        {editingUserId && (
          <form onSubmit={handleSaveUser} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">닉네임</label>
              <input
                value={userForm.nickname}
                onChange={(e) => setUserForm({ ...userForm, nickname: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">전화번호</label>
              <input
                value={userForm.phone_number}
                onChange={(e) => setUserForm({ ...userForm, phone_number: formatPhoneInput(e.target.value) })}
                maxLength={13}
                placeholder="010-1234-5678"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">이메일</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            {editingUserIsSocial ? (
              <div className="sm:col-span-2 px-4 py-3 bg-gray-50 rounded-lg text-sm text-gray-500">
                🔗 소셜 로그인 계정이라 비밀번호를 설정할 수 없습니다.
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">새 비밀번호 (선택, 비워두면 유지)</label>
                <PasswordInput
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8자 이상, 영문+특수문자 포함"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            )}
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                id="isStaff"
                type="checkbox"
                checked={userForm.is_staff}
                onChange={(e) => setUserForm({ ...userForm, is_staff: e.target.checked })}
              />
              <label htmlFor="isStaff" className="text-sm text-gray-700">관리자 권한 부여</label>
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                id="isHospitalManager"
                type="checkbox"
                checked={userForm.is_hospital_manager}
                onChange={(e) => setUserForm({ ...userForm, is_hospital_manager: e.target.checked })}
              />
              <label htmlFor="isHospitalManager" className="text-sm text-gray-700">병원 관리자 권한 부여 (담당 병원/미용실만 관리)</label>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={closeAllForms} className="px-6 py-2 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">취소</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}

        {/* 병원/미용실 추가·수정 폼 */}
        {dataShape === 'hospitals' && showHospitalForm && (
          <form onSubmit={handleSaveHospital} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 text-xs text-gray-500">
              유형: <span className="font-medium text-gray-700">{hospitalForm.type === 'hospital' ? '동물병원' : '미용실'}</span> ({currentTab.label} 탭에서 등록/수정 중)
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">이름 *</label>
              <input
                required
                value={hospitalForm.name}
                onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">전화번호 *</label>
              <input
                required
                value={hospitalForm.phone}
                onChange={(e) => setHospitalForm({ ...hospitalForm, phone: formatBusinessPhone(e.target.value) })}
                placeholder="02-1234-5678"
                maxLength={13}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">가격대</label>
              <select
                value={hospitalForm.price_range}
                onChange={(e) => setHospitalForm({ ...hospitalForm, price_range: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="free">무료</option>
                <option value="low">저가</option>
                <option value="medium">일반</option>
                <option value="high">고가</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">주소 * (검색하거나 지도를 클릭/드래그해서 선택)</label>
              <KakaoMap
                latitude={hospitalForm.latitude}
                longitude={hospitalForm.longitude}
                address={hospitalForm.address}
                markerTitle={hospitalForm.name || '병원 위치'}
                height="350px"
                draggable={true}
                showSearch={true}
                onLocationSelect={(loc) =>
                  setHospitalForm((prev) => ({
                    ...prev,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    address: loc.address,
                  }))
                }
              />
              {hospitalForm.address && (
                <p className="mt-2 text-xs text-gray-500">선택된 주소: {hospitalForm.address}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">웹사이트</label>
              <input
                value={hospitalForm.website}
                onChange={(e) => setHospitalForm({ ...hospitalForm, website: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">설명</label>
              <textarea
                value={hospitalForm.description}
                onChange={(e) => setHospitalForm({ ...hospitalForm, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-2">
                사진 (최대 {MAX_HOSPITAL_IMAGES}장, 1번째가 대표/썸네일 이미지)
              </label>
              {(hospitalExistingImages.length > 0 || hospitalNewImagePreviews.length > 0) && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
                  {hospitalExistingImages.map((url, index) => (
                    <div key={`existing-${url}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img src={url} alt={`병원 사진 ${index + 1}`} className="w-full h-full object-cover" />
                      {index === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded">대표</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeHospitalExistingImage(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none flex items-center justify-center"
                      >
                        ✕
                      </button>
                      {index !== 0 && (
                        <button
                          type="button"
                          onClick={() => makeHospitalExistingImageThumbnail(index)}
                          className="absolute bottom-1 left-1 right-1 px-1 py-0.5 bg-black/60 text-white text-[10px] rounded"
                        >
                          대표로 설정
                        </button>
                      )}
                    </div>
                  ))}
                  {hospitalNewImagePreviews.map((preview, index) => (
                    <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                      <img src={preview} alt={`새 사진 ${index + 1}`} className="w-full h-full object-cover" />
                      {hospitalExistingImages.length === 0 && index === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded">대표</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeHospitalNewImage(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {hospitalExistingImages.length + hospitalNewImages.length < MAX_HOSPITAL_IMAGES && (
                <input type="file" accept="image/*" multiple onChange={handleHospitalImageChange} className="text-sm" />
              )}
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                id="is24"
                type="checkbox"
                checked={hospitalForm.is_24_hours}
                onChange={(e) => setHospitalForm({ ...hospitalForm, is_24_hours: e.target.checked })}
              />
              <label htmlFor="is24" className="text-sm text-gray-700">24시간 운영</label>
            </div>

            {!hospitalForm.is_24_hours && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-2">요일별 영업시간</label>
                <div className="space-y-2">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="flex items-center gap-2">
                      <span className="w-6 text-sm text-gray-700">{day}</span>
                      <label className="flex items-center gap-1 text-xs text-gray-500">
                        <input
                          type="checkbox"
                          checked={openingHours[day].closed}
                          onChange={(e) =>
                            setOpeningHours({
                              ...openingHours,
                              [day]: { ...openingHours[day], closed: e.target.checked },
                            })
                          }
                        />
                        휴무
                      </label>
                      {!openingHours[day].closed && (
                        <>
                          <input
                            type="time"
                            value={openingHours[day].open}
                            onChange={(e) =>
                              setOpeningHours({
                                ...openingHours,
                                [day]: { ...openingHours[day], open: e.target.value },
                              })
                            }
                            className="px-2 py-1 border border-gray-200 rounded text-sm"
                          />
                          <span className="text-gray-400">~</span>
                          <input
                            type="time"
                            value={openingHours[day].close}
                            onChange={(e) =>
                              setOpeningHours({
                                ...openingHours,
                                [day]: { ...openingHours[day], close: e.target.value },
                              })
                            }
                            className="px-2 py-1 border border-gray-200 rounded text-sm"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isFullAdmin && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-2">담당 병원 관리자</label>
                {hospitalManagers.length === 0 ? (
                  <p className="text-xs text-gray-400">병원 관리자 권한을 가진 회원이 없습니다. (회원 탭에서 먼저 지정하세요)</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {hospitalManagers.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={hospitalForm.managers.includes(m.id)}
                          onChange={(e) => {
                            const managers = e.target.checked
                              ? [...hospitalForm.managers, m.id]
                              : hospitalForm.managers.filter((id) => id !== m.id);
                            setHospitalForm({ ...hospitalForm, managers });
                          }}
                        />
                        {m.nickname || m.username}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={closeAllForms} className="px-6 py-2 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">취소</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}

        {/* 생애주기 가이드 추가·수정 폼 */}
        {activeTab === 'guides' && showGuideForm && (
          <form onSubmit={handleSaveGuide} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">종류 *</label>
              <select
                value={guideForm.species}
                onChange={(e) => setGuideForm({ ...guideForm, species: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="dog">강아지</option>
                <option value="cat">고양이</option>
                <option value="other">기타</option>
              </select>
            </div>
            {guideForm.species === 'other' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">구체적인 종류 (선택)</label>
                  <input
                    value={guideForm.custom_species_name}
                    onChange={(e) => setGuideForm({ ...guideForm, custom_species_name: e.target.value })}
                    placeholder="예: 도마뱀, 햄스터, 앵무새"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">탭에 표시할 이모지</label>
                  <input
                    value={guideForm.emoji}
                    onChange={(e) => setGuideForm({ ...guideForm, emoji: e.target.value })}
                    placeholder="🦜"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">단계 *</label>
              <select
                value={guideForm.stage}
                onChange={(e) => setGuideForm({ ...guideForm, stage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                {STAGE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">제목 *</label>
              <input
                required
                value={guideForm.title}
                onChange={(e) => setGuideForm({ ...guideForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">정렬 순서</label>
              <p className="text-xs text-gray-400 mb-1">
                같은 종류+단계 안에 가이드가 여러 개일 때만 의미 있음
                <br />
                (작을수록 먼저 표시, 강아지/고양이는 무시해도 됨)
              </p>
              <input
                type="number"
                min={1}
                value={guideForm.order}
                onChange={(e) => setGuideForm({ ...guideForm, order: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">한 줄 설명</label>
              <input
                value={guideForm.description}
                onChange={(e) => setGuideForm({ ...guideForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">본문 내용 (마크다운 가능)</label>
              <textarea
                value={guideForm.content}
                onChange={(e) => setGuideForm({ ...guideForm, content: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">체크리스트 (한 줄에 하나씩)</label>
              <textarea
                value={guideForm.checklistText}
                onChange={(e) => setGuideForm({ ...guideForm, checklistText: e.target.value })}
                rows={4}
                placeholder={'예방접종 확인하기\n목줄/이동장 준비하기'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={closeAllForms} className="px-6 py-2 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">취소</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-900 border-t-transparent mx-auto"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              {searchQuery.trim() ? '검색 결과가 없습니다.' : '데이터가 없습니다.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {headers[activeTab].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                      {renderRow(item)}
                      <td className="px-4 py-3 text-left whitespace-nowrap">
                        {editableRow(item)}
                        {!(activeTab === 'users' && item.is_staff) && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline"
                          >
                            삭제
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {filteredItems.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              이전
            </button>
            <span className="text-sm text-gray-600 px-2">
              {currentPage} / {Math.ceil(filteredItems.length / PAGE_SIZE)} 페이지 ({filteredItems.length}개)
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredItems.length / PAGE_SIZE), p + 1))}
              disabled={currentPage >= Math.ceil(filteredItems.length / PAGE_SIZE)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">페이지당 {PAGE_SIZE}개씩 표시됩니다.</p>
      </main>
    </div>
  );
}

export default AdminPage;
