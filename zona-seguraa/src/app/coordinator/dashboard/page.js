'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CoordinatorDashboardRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/coordinator') }, [router])
  return null
}
