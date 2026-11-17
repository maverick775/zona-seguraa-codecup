import { redirect } from 'next/navigation'

export default function CoordinatorDashboardRedirect() {
  redirect('/coordinator/reports')
}
