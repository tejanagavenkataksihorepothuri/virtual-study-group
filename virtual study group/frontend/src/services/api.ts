import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-storage');
    if (token) {
      try {
        const parsedToken = JSON.parse(token);
        if (parsedToken.state?.token) {
          config.headers.Authorization = `Bearer ${parsedToken.state.token}`;
        }
      } catch (error) {
        console.error('Error parsing token from localStorage:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid, clear auth state
      localStorage.removeItem('auth-storage');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: { 
    firstName: string; 
    lastName: string; 
    username: string; 
    email: string; 
    password: string 
  }) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => 
    api.post('/auth/reset-password', { token, password }),
};

// Groups API
export const groupsAPI = {
  createGroup: (groupData: {
    name: string;
    description?: string;
    subject: string;
    category?: string;
    privacy?: string;
    maxMembers?: number;
  }) => api.post('/groups', groupData),
  
  getPublicGroups: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    subject?: string;
  }) => api.get('/groups/public', { params }),
  
  getUserGroups: () => api.get('/groups/my-groups'),
  
  getGroupById: (groupId: string) => api.get(`/groups/${groupId}`),
  
  joinGroup: (groupId: string) => api.post(`/groups/${groupId}/join`),
  
  leaveGroup: (groupId: string) => api.post(`/groups/${groupId}/leave`),
  
  updateGroup: (groupId: string, updates: any) => api.put(`/groups/${groupId}`, updates),
  
  deleteGroup: (groupId: string) => api.delete(`/groups/${groupId}`),
};

// Messages API
export const messagesAPI = {
  getGroupMessages: (groupId: string, params?: {
    page?: number;
    limit?: number;
  }) => api.get(`/chat/group/${groupId}`, { params }),
  
  sendMessage: (messageData: {
    content: string;
    groupId: string;
    type?: string;
    replyTo?: string;
  }) => api.post('/chat/send', messageData),
  
  editMessage: (messageId: string, content: string) => 
    api.put(`/chat/${messageId}`, { content }),
  
  deleteMessage: (messageId: string) => api.delete(`/chat/${messageId}`),
  
  addReaction: (messageId: string, emoji: string) => 
    api.post(`/chat/${messageId}/react`, { emoji }),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (userData: any) => api.put('/users/profile', userData),
  uploadAvatar: (formData: FormData) => api.post('/users/upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  searchUsers: (query: string) => api.get(`/users/search?q=${query}`),
  getDashboard: () => api.get('/users/dashboard'),
  getStats: () => api.get('/users/stats'),
};

// Study Sessions API
export const sessionsAPI = {
  createSession: (sessionData: any) => api.post('/sessions', sessionData),
  getSessions: (params?: any) => api.get('/sessions', { params }),
  getSessionById: (sessionId: string) => api.get(`/sessions/${sessionId}`),
  updateSession: (sessionId: string, updates: any) => api.put(`/sessions/${sessionId}`, updates),
  deleteSession: (sessionId: string) => api.delete(`/sessions/${sessionId}`),
  joinSession: (sessionId: string) => api.post(`/sessions/${sessionId}/join`),
  leaveSession: (sessionId: string) => api.post(`/sessions/${sessionId}/leave`),
};

// AI API
export const aiAPI = {
  sendMessage: (message: string, context?: any) => 
    api.post('/ai/chat', { message, context }),
  getStudyHelp: (topic: string, difficulty: string) => 
    api.post('/ai/study-help', { topic, difficulty }),
  generateQuiz: (topic: string, questionCount: number) => 
    api.post('/ai/generate-quiz', { topic, questionCount }),
};

export default api;
