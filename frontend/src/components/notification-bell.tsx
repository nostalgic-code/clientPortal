'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Trash2, X, FileText, Upload, Receipt, ClipboardCheck, FolderKanban, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notificationsApi, Notification, NotificationType } from '@/lib/api';
import { getAccessToken } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  proposal_sent: ClipboardCheck,
  proposal_accepted: ClipboardCheck,
  proposal_rejected: AlertCircle,
  document_sent: FileText,
  document_signed: FileText,
  document_viewed: FileText,
  file_uploaded: Upload,
  invoice_created: Receipt,
  milestone_completed: CheckCheck,
  milestone_auto_completed: CheckCheck,
  phase_activated: FolderKanban,
  project_completed: FolderKanban,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  proposal_accepted: 'text-green-600 bg-green-50',
  proposal_rejected: 'text-red-600 bg-red-50',
  document_signed: 'text-green-600 bg-green-50',
  file_uploaded: 'text-blue-600 bg-blue-50',
  invoice_created: 'text-orange-600 bg-orange-50',
  milestone_completed: 'text-purple-600 bg-purple-50',
  milestone_auto_completed: 'text-purple-600 bg-purple-50',
  phase_activated: 'text-indigo-600 bg-indigo-50',
  project_completed: 'text-green-600 bg-green-50',
  proposal_sent: 'text-blue-600 bg-blue-50',
  document_sent: 'text-blue-600 bg-blue-50',
  document_viewed: 'text-slate-600 bg-slate-50',
};

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

interface NotificationBellProps {
  /** Polling interval in ms. Default 30000 (30s) */
  pollInterval?: number;
}

export function NotificationBell({ pollInterval = 30000 }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getAccessToken() || undefined;
      const data = await notificationsApi.list(token, false, 30);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (e) {
      // Silently fail — don't break the app for notification issues
      console.error('[Notifications] Fetch error:', e);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = await getAccessToken() || undefined;
      const data = await notificationsApi.getUnreadCount(token);
      setUnreadCount(data.unread_count);
    } catch {
      // silent
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll for unread count
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, pollInterval);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, pollInterval]);

  // Refresh full list when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = await getAccessToken() || undefined;
      await notificationsApi.markAsRead(id, token);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('[Notifications] Mark read error:', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = await getAccessToken() || undefined;
      await notificationsApi.markAllAsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('[Notifications] Mark all read error:', e);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = await getAccessToken() || undefined;
      await notificationsApi.delete(id, token);
      const wasUnread = notifications.find(n => n.id === id && !n.is_read);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('[Notifications] Delete error:', e);
    }
  };

  const handleClearAll = async () => {
    try {
      setIsLoading(true);
      const token = await getAccessToken() || undefined;
      await notificationsApi.clearAll(token);
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) {
      console.error('[Notifications] Clear all error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        const token = await getAccessToken() || undefined;
        await notificationsApi.markAsRead(notification.id, token);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        // silent
      }
    }

    // Navigate
    if (notification.link) {
      setIsOpen(false);
      router.push(notification.link);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0 max-h-[500px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleClearAll}
                disabled={isLoading}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
              const colorClass = NOTIFICATION_COLORS[notification.type] || 'text-slate-600 bg-slate-50';

              return (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-colors hover:bg-slate-50',
                    !notification.is_read && 'bg-blue-50/40'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Icon */}
                  <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm leading-tight', !notification.is_read ? 'font-semibold' : 'font-medium text-slate-700')}>
                        {notification.title}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(notification.id, e)}
                          className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"
                          title="Delete"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(notification.created_at)}</p>
                  </div>

                  {/* Unread dot */}
                  {!notification.is_read && (
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
