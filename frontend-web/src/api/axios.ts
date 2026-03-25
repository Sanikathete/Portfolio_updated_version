import axios from 'axios';
import toast from 'react-hot-toast';

const isLocalDev = false;
const djangoBaseURL = isLocalDev ? 'http://localhost:8000' : 'http://135.235.193.71:8000';
const chatbotBaseURL = isLocalDev ? 'http://localhost:8000' : 'http://135.235.193.71:8000';

const attachToken = (config: any) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

const handleError = (err: any) => {
  const status = err?.response?.status;

  if (status === 401) {
    return Promise.reject(err);
  } else if (status === 500) {
    toast.error('Server error. Please try again.');
  } else if (!err?.response) {
    toast.error('Cannot connect to server');
  }

  return Promise.reject(err);
};

const api = axios.create({
  baseURL: djangoBaseURL,
  timeout: 30000,
});

api.interceptors.request.use(attachToken);
api.interceptors.response.use((response) => response, handleError);

const chatbot = axios.create({
  baseURL: chatbotBaseURL,
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
