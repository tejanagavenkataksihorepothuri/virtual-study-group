import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, token } = response.data;
          
          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          toast.success('Login successful!');
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Login failed');
          throw error;
        }
      },

      register: async (userData: RegisterData) => {
        try {
          const response = await api.post('/auth/register', userData);
          const { user, token } = response.data;
          
          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          toast.success('Registration successful!');
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Registration failed');
          throw error;
        }
      },

      logout: () => {
        // Remove token from API headers
        delete api.defaults.headers.common['Authorization'];
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        toast.success('Logged out successfully');
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      updateProfile: async (userData: Partial<User>) => {
        try {
          const response = await api.put('/auth/profile', userData);
          const updatedUser = response.data;
          
          set({
            user: updatedUser,
          });
          
          toast.success('Profile updated successfully!');
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to update profile');
          throw error;
        }
      },

      checkAuth: async () => {
        try {
          const token = get().token;
          if (!token) {
            set({ isLoading: false });
            return;
          }

          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          const response = await api.get('/auth/me');
          const user = response.data;
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Token is invalid, clear auth state
          delete api.defaults.headers.common['Authorization'];
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
      }),
    }
  )
);

// Initialize auth check on app start
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkAuth();
}
