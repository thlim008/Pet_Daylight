import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function NotificationPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filter === 'unread') {
        params.is_read = 'false';
      } else if (filter === 'read') {
        params.is_read = 'true';
      }
      
      const response = await API.get('/notifications/', { params });
      
      if (response.data.results) {
        setNotifications(response.data.results);
      } else if (Array.isArray(response.data)) {
        setNotifications(response.data);
      }
    } catch (err) {
      console.error('⛔ 알림 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) {
        await API.patch(`/notifications/${notification.id}/mark_as_read/`);
        setNotifications(notifications.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
      }

      if (notification.missing_pet) {
        navigate(`/missing-pets/${notification.missing_pet}`);
      } else if (notification.community) {
        navigate(`/communities/${notification.community}`);
      }
    } catch (err) {
      console.error('⛔ 알림 처리 실패:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.post('/notifications/mark_all_as_read/');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      alert('모든 알림을 읽음 처리했습니다.');
    } catch (err) {
      console.error('⛔ 모두 읽음 처리 실패:', err);
      alert('읽음 처리에 실패했습니다.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('모든 알림을 삭제하시겠습니까?')) return;

    try {
      await API.delete('/notifications/clear_all/');
      setNotifications([]);
      alert('모든 알림이 삭제되었습니다.');
    } catch (err) {
      console.error('⛔ 알림 삭제 실패:', err);
      alert('알림 삭제에 실패했습니다.');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'new_report': '📢',
      'comment': '💬',
      'resolved': '✅',
      'community': '�',
    };
    return icons[type] || '🔔';
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return '방금 전';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* 헤더 */}
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
                <p className="text-xs text-gray-500">알림</p>
              </div>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>뒤로</span>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* 타이틀 & 액션 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">알림</h1>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-all"
            >
              모두 읽음
            </button>
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
            >
              전체 삭제
            </button>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              filter === 'unread'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            읽지 않음
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              filter === 'read'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            읽음
          </button>
        </div>

        {/* 알림 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">알림이 없습니다</h3>
            <p className="text-gray-600">새로운 알림이 오면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-white rounded-2xl border-2 transition-all cursor-pointer ${
                  notification.is_read
                    ? 'border-gray-200 hover:border-gray-300'
                    : 'border-blue-200 bg-blue-50 hover:border-blue-300'
                }`}
              >
                <div className="p-6 flex items-start space-x-4">
                  <div className="flex-shrink-0 text-4xl">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <span className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full ml-3 mt-1"></span>
                      )}
                    </div>
                    
                    <p className="text-gray-700 mb-3 leading-relaxed">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        {getTimeAgo(notification.created_at)}
                      </p>
                      
                      {!notification.is_read && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          새 알림
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default NotificationPage;