import { useEffect, useState } from 'react'

export function useAdminToken() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('adminToken'))

  useEffect(() => {
    if (token) {
      localStorage.setItem('adminToken', token)
    } else {
      localStorage.removeItem('adminToken')
    }
  }, [token])

  return { token, setToken }
}
