import { Navigate } from "react-router-dom"

export default function NotificationSettings() {
  return <Navigate to="/settings/user?section=notifications" replace />
}
