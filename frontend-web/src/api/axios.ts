import axios from 'axios';
import toast from 'react-hot-toast';
import {
  clearStoredAuth,
  getValidStoredRefreshToken,
  getValidStoredToken,
  storeAuthSession,
} from '../utils/auth';

const normalizeApiPath = (url?: string) => {
  if (!url) return url;
  return url.replace(/^\/api\/api\//, '/api/');
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getValidStoredRefreshToken();
  if (!refreshToken) return null;

  refreshPromise = axios.post('/api/users/token/refresh/', { refresh: refreshToken }, {
    baseURL: '',
    timeout: 30000,
  }).then((response) => {
    const nextToken = response.data?.access;
    if (!nextToken) {
      clearStoredAuth();
      return null;
    }

    storeAuthSession({ token: nextToken });
    return nextToken;
  }).catch(() => {
    clearStoredAuth();
    return null;
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

const attachToken = async (config: any) => {
  let token = getValidStoredToken();
  config.url = normalizeApiPath(config.url);

  if (!token && getValidStoredRefreshToken()) {
    token = await refreshAccessToken();
  }

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

const handleError = (err: any) => {
  const status = err?.response?.status;
  const hadAuthHeader = Boolean(err?.config?.headers?.Authorization);
  const originalRequest = err?.config;

  if (status === 401) {
    if (hadAuthHeader && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      return refreshAccessToken().then((token) => {
        if (!token) {
          return Promise.reject(err);
        }

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axios(originalRequest);
      });
    }

    if (hadAuthHeader && localStorage.getItem('token')) {
      clearStoredAuth();
    }
    return Promise.reject(err);
  } else if (status === 500) {
    toast.error('Server error. Please try again.');
  } else if (!err?.response) {
    toast.error('Cannot connect to server');
  }

  return Promise.reject(err);
};

const api = axios.create({
  baseURL: '',
  timeout: 30000,
});

api.interceptors.request.use(attachToken);
api.interceptors.response.use((response) => response, handleError);

const chatbot = axios.create({
  baseURL: '',
  timeout: 30000,
});

chatbot.interceptors.request.use(attachToken);
chatbot.interceptors.response.use((response) => response, handleError);

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  telegram_username?: string;
  telegram_phone?: string;
  telegram_chat_id?: string;
  use_telegram_recovery: boolean;
  security_question?: string;
  security_answer?: string;
}

export interface SecurityQuestionResponse {
  security_question: string | null;
  use_telegram_recovery: boolean;
}

export const registerUser = async (payload: RegisterPayload) => {
  const response = await api.post('/api/users/register/', payload);
  return response.data;
};

export const forgotPasswordTelegram = async (username: string) => {
  const response = await api.post('/api/users/forgot-password/telegram/', { username });
  return response.data;
};

export const forgotPasswordSecurity = async (username: string, security_answer: string) => {
  const response = await api.post('/api/users/forgot-password/security/', { username, security_answer });
  return response.data as { token: string };
};

export const resetPassword = async (token: string, new_password: string) => {
  const response = await api.post('/api/users/reset-password/', { token, new_password });
  return response.data;
};

export const getSecurityQuestion = async (username: string) => {
  const response = await api.get<SecurityQuestionResponse>('/api/users/security-question/', {
    params: { username },
  });
  return response.data;
};

export default api;
