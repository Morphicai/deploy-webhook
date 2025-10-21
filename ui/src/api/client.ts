import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000',
  headers: {
    'content-type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const jwtToken = localStorage.getItem('authToken')
  if (jwtToken) {
    config.headers.authorization = `Bearer ${jwtToken}`
  }
  const webhookSecret = localStorage.getItem('webhookSecret')
  if (webhookSecret) {
    config.headers['x-webhook-secret'] = webhookSecret
  }
  return config
})

export default api
