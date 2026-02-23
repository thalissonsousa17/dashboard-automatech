import React, { useState, useRef, useEffect } from "react";
import { Bell, Ticket, Monitor, CheckCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications, AppNotification } from "../../contexts/NotificationContext";

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const prevUnread = useRef(unreadCount);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Shake animation when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotificationClick = (n: AppNotification) => {
    markAsRead(n.id);
    setOpen(false);
    if (n.type === "ticket" && n.ticketId) {
      navigate("/dashboard/suporte", { state: { openTicketId: n.ticketId } });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`p-2 rounded-full hover:bg-gray-100 relative transition-colors ${shake ? "animate-bell-shake" : ""}`}
        title="Notificações"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Notificações</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                >
                  <CheckCheck className="w-3 h-3" />
                  Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 items-start ${
                    !n.read ? "bg-blue-50/40" : ""
                  }`}
                >
                  <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    n.type === "ticket" ? "bg-blue-100" : "bg-purple-100"
                  }`}>
                    {n.type === "ticket" ? (
                      <Ticket className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Monitor className="w-3.5 h-3.5 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${!n.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{n.createdAt}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => { setOpen(false); navigate("/dashboard/suporte"); }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center"
            >
              Ver página de Suporte →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
