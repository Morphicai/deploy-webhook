import { useEffect, useState } from 'react'

const STORAGE_KEY = 'authToken'

export function useAuthToken() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))

  useEffect(() => {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [token])

  return { token, setToken }
}

export function useAuthEmail() {
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem('authEmail'))

  useEffect(() => {
    if (email) {
      localStorage.setItem('authEmail', email)
    } else {
      localStorage.removeItem('authEmail')
    }
  }, [email])

  return { email, setEmail }
}
