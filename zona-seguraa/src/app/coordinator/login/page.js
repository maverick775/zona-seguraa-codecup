import { redirect } from 'next/navigation'

// El acceso de coordinación usa el login común.
export default function CoordinatorLoginRedirect() {
  redirect('/login?next=/coordinator/reports')
}
