import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { useFileStore } from '../stores/fileStore'

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info
}

const COLORS = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  error: 'border-red-500/30 bg-red-500/10 text-red-400',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-400'
}

export default function Notifications() {
  const notifications = useFileStore((s) => s.notifications)
  const removeNotification = useFileStore((s) => s.removeNotification)

  if (notifications.length === 0) return null

  return (
    <div className="fixed bottom-10 right-4 z-50 flex flex-col gap-2 max-w-[340px]">
      {notifications.map((notification) => {
        const Icon = ICONS[notification.type]
        return (
          <div
            key={notification.id}
            className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border shadow-lg shadow-black/30 animate-slide-in-up ${COLORS[notification.type]}`}
          >
            <Icon size={14} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] leading-snug">{notification.message}</p>
              {notification.actionLabel && notification.onAction && (
                <button
                  onClick={() => {
                    notification.onAction?.()
                    removeNotification(notification.id)
                  }}
                  className="mt-1.5 text-[11px] font-medium underline underline-offset-1 hover:no-underline"
                >
                  {notification.actionLabel}
                </button>
              )}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
