import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

function NotificationDropdown() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadUnreadCount();
    
    // 5분마다 자동으로 읽지 않은 알림 개수 갱신
    const interval = setInterval(loadUnreadCount, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 드롭다운 열릴 때 알림 로드
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    // 외부 클릭 시 드롭다운 닫기
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response = await API.get('/notifications/unread_count/');
      setUnreadCount(response.data.unread_count);
    } catch (err) {
      console.error('❌ 읽지 않은 알림 개수 로드 실패:', err);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await API.get('/notifications/', {
        params: { limit: 10 }
      });
      
      if (response.data.results) {
        setNotifications(response.data.results);
      } else if (Array.isArray(response.data)) {
        setNotifications(response.data);
      }
    } catch (err) {
      console.error('❌ 알림 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      // 읽지 않은 알림이면 읽음 처리
      if (!notification.is_read) {
        await API.patch(`/notifications/${notification.id}/mark_as_read/`);
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // 로컬 상태 업데이트
        setNotifications(notifications.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
      }

      // 관련 페이지로 이동
      if (notification.link) {
        navigate(notification.link);
      } else if (notification.missing_pet) {
        navigate(`/missing-pets/${notification.missing_pet}`);
      } else if (notification.community) {
        navigate(`/communities/${notification.community}`);
      }

      setIsOpen(false);
    } catch (err) {
      console.error('❌ 알림 처리 실패:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.post('/notifications/mark_all_as_read/');
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('❌ 모두 읽음 처리 실패:', err);
      alert('알림 읽음 처리에 실패했습니다.');
    }
  };

  const handleDeleteOne = async (e, notification) => {
    e.stopPropagation(); // 알림 클릭(이동/읽음처리)로 안 번지게
    try {
      await API.delete(`/notifications/${notification.id}/`);
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      if (!notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('❌ 알림 삭제 실패:', err);
      alert('알림 삭제에 실패했습니다.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('모든 알림을 삭제하시겠습니까?')) return;

    try {
      await API.delete('/notifications/clear_all/');
      setNotifications([]);
      setUnreadCount(0);
      alert('모든 알림이 삭제되었습니다.');
    } catch (err) {
      console.error('❌ 알림 삭제 실패:', err);
      alert('알림 삭제에 실패했습니다.');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'new_report': '📢',
      'comment': '💬',
      'resolved': '✅',
      'community': '🐾',
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
    <div className="relative" ref={dropdownRef}>
      {/* 알림 벨 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* 읽지 않은 알림 배지 */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* 헤더 */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h3 className="font-bold text-gray-900 text-lg">알림</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  모두 읽음
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  전체 삭제
                </button>
              )}
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-3">🔔</div>
                <p className="text-gray-500 text-sm">알림이 없습니다</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-all ${
                    notification.is_read
                      ? 'bg-white hover:bg-gray-50'
                      : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 text-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <p className={`text-sm font-medium ${
                          notification.is_read ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center flex-shrink-0 ml-2">
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          )}
                          <button
                            onClick={(e) => handleDeleteOne(e, notification)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {notification.message}
                      </p>

                      <p className="text-xs text-gray-400">
                        {getTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 푸터 */}
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="text-sm text-gray-700 hover:text-gray-900 font-medium"
              >
                모든 알림 보기 →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;