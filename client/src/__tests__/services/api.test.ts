import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// We need to test the interceptors behavior, not the mock
describe('API Service', () => {
  describe('axios instance configuration', () => {
    it('should have correct baseURL', async () => {
      // Dynamic import to test actual configuration
      const { default: api } = await import('../../services/api');
      expect(api.defaults.baseURL).toBe('/api');
    });

    it('should have correct Content-Type header', async () => {
      const { default: api } = await import('../../services/api');
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('request interceptor', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should add Authorization header when token exists in localStorage', async () => {
      const mockStorageValue = JSON.stringify({
        state: { token: 'test-token-123' },
      });

      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(mockStorageValue);

      // Create a fresh import
      vi.resetModules();
      const { default: api } = await import('../../services/api');

      // Create a mock config object
      const config: any = {
        headers: {},
      };

      // Get the request interceptor
      const interceptors = (api.interceptors.request as any).handlers;
      if (interceptors.length > 0) {
        const result = interceptors[0].fulfilled(config);
        expect(result.headers.Authorization).toBe('Bearer test-token-123');
      }
    });

    it('should not add Authorization header when no token in localStorage', async () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

      vi.resetModules();
      const { default: api } = await import('../../services/api');

      const config: any = {
        headers: {},
      };

      const interceptors = (api.interceptors.request as any).handlers;
      if (interceptors.length > 0) {
        const result = interceptors[0].fulfilled(config);
        expect(result.headers.Authorization).toBeUndefined();
      }
    });

    it('should handle invalid JSON in localStorage gracefully', async () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('invalid-json');

      vi.resetModules();
      const { default: api } = await import('../../services/api');

      const config: any = {
        headers: {},
      };

      const interceptors = (api.interceptors.request as any).handlers;
      if (interceptors.length > 0) {
        // Should not throw
        expect(() => interceptors[0].fulfilled(config)).not.toThrow();
      }
    });
  });

  describe('response interceptor', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      });

      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should pass through successful responses', async () => {
      vi.resetModules();
      const { default: api } = await import('../../services/api');

      const mockResponse = { data: { success: true } };
      const interceptors = (api.interceptors.response as any).handlers;
      
      if (interceptors.length > 0) {
        const result = interceptors[0].fulfilled(mockResponse);
        expect(result).toEqual(mockResponse);
      }
    });

    it('should remove token and redirect on 401 error', async () => {
      vi.resetModules();
      const { default: api } = await import('../../services/api');

      const error = {
        response: { status: 401 },
      };

      const interceptors = (api.interceptors.response as any).handlers;
      
      if (interceptors.length > 0) {
        try {
          await interceptors[0].rejected(error);
        } catch (e) {
          // Expected to reject
        }

        expect(localStorage.removeItem).toHaveBeenCalledWith('neurolearn-auth');
        expect(window.location.href).toBe('/login');
      }
    });

    it('should not redirect on non-401 errors', async () => {
      vi.resetModules();
      const { default: api } = await import('../../services/api');

      const error = {
        response: { status: 500 },
      };

      const interceptors = (api.interceptors.response as any).handlers;
      
      if (interceptors.length > 0) {
        try {
          await interceptors[0].rejected(error);
        } catch (e) {
          // Expected to reject
        }

        expect(localStorage.removeItem).not.toHaveBeenCalled();
      }
    });
  });
});
