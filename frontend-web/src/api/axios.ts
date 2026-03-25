import axios from 'axios';
import toast from 'react-hot-toast';

const isLocalDev = false;
const djangoBaseURL = isLocalDev ? 'http://localhost:8000' : 'http://135.235.193.71:8000';
const fastapiBaseURL = isLocalDev ? 'http://localhost:8001' : 'http://135.235.193.71:8001';
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
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    localStorage.removeItem('selected_portfolio_id');
    window.location.href = '/login';
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

const fastapi = axios.create({
  baseURL: fastapiBaseURL,
  timeout: 30000,
});

fastapi.interceptors.request.use(attachToken);
fastapi.interceptors.response.use((response) => response, handleError);

const chatbot = axios.create({
  baseURL: chatbotBaseURL,
  timeout: 30000,
});

chatbot.interceptors.request.use(attachToken);
chatbot.interceptors.response.use((response) => response, handleError);

export { fastapi, chatbot };
export default api;
