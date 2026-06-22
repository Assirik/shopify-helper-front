import axios from 'axios'

export interface ApiFailure {
  code: string
  status?: number
}

export const toApiFailure = (error: unknown): ApiFailure => {
  if (!axios.isAxiosError(error)) return { code: 'UnknownError' }

  return {
    code: typeof error.response?.data?.error === 'string' ? error.response.data.error : 'NetworkError',
    status: error.response?.status,
  }
}
