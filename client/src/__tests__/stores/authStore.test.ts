import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

// Mock the api module
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    defaults: {
      headers: {
        common: {},
      },
    },
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.logout();
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should set isLoading to true during login', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'student',
      };

      let resolveLogin: (value: unknown) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      (api.post as ReturnType<typeof vi.fn>).mockReturnValue(loginPromise);

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login('test@example.com', 'password123');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveLogin!({ data: { token: 'token123', user: mockUser } });
      });
    });

    it('should update state on successful login', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'student',
      };

      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { token: 'token123', user: mockUser },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('token123');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should call api.post with correct arguments', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { token: 'token123', user: {} },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should set error on failed login', async () => {
      const errorMessage = 'Invalid credentials';
      (api.post as ReturnType<typeof vi.fn>).mockRejectedValue({
        response: { data: { message: errorMessage } },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword');
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should set Authorization header on successful login', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { token: 'token123', user: {} },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(api.defaults.headers.common['Authorization']).toBe('Bearer token123');
    });
  });

  describe('register', () => {
    it('should update state on successful registration', async () => {
      const mockUser = {
        id: 'user123',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'student',
      };

      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { token: 'token123', user: mockUser },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register({
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
        });
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should call api.post with registration data', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { token: 'token123', user: {} },
      });

      const { result } = renderHook(() => useAuthStore());

      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'educator',
        conditions: ['adhd'],
        learningStyles: ['visual'],
      };

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(api.post).toHaveBeenCalledWith('/auth/register', registerData);
    });

    it('should set error on failed registration', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockRejectedValue({
        response: { data: { message: 'Email already exists' } },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.register({
            email: 'existing@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
          });
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Email already exists');
    });
  });

  describe('logout', () => {
    it('should clear user state on logout', async () => {
      // First login
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { token: 'token123', user: { id: 'user123' } },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should remove Authorization header on logout', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { token: 'token123', user: {} },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      act(() => {
        result.current.logout();
      });

      expect(api.defaults.headers.common['Authorization']).toBeUndefined();
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          token: 'token123',
          user: { id: 'user123', firstName: 'Original', lastName: 'User' },
        },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      act(() => {
        result.current.updateUser({ firstName: 'Updated' });
      });

      expect(result.current.user?.firstName).toBe('Updated');
      expect(result.current.user?.lastName).toBe('User');
    });

    it('should not update if user is null', () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.updateUser({ firstName: 'Test' });
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockRejectedValue({
        response: { data: { message: 'Some error' } },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrong');
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
