const DEV_SERVER_ORIGIN = 'http://localhost:3000'

export const API_BASE_URL = import.meta.env.DEV
  ? `${DEV_SERVER_ORIGIN}/api`
  : '/api'

export const SOCKET_URL = import.meta.env.DEV ? DEV_SERVER_ORIGIN : '/'
