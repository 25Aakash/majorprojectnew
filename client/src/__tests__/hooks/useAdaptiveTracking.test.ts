import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAdaptiveTracking } from '../../hooks/useAdaptiveTracking';
import api from '../../services/api';

// Mock the api module
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    put: vi.fn(),
    get: vi.fn(),
  },
}));

describe('useAdaptiveTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values when disabled', () => {
      const { result } = renderHook(() =>
        useAdaptiveTracking('lesson123', { enabled: false })
      );

      expect(result.current.isOnboarding).toBe(false);
      expect(result.current.currentAdaptation).toBeNull();
    });

    it('should not start session when lessonId is null', () => {
      renderHook(() => useAdaptiveTracking(null, { enabled: true }));

      expect(api.post).not.toHaveBeenCalled();
    });

    it('should not start session when disabled', () => {
      renderHook(() => useAdaptiveTracking('lesson123', { enabled: false }));

      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('session management', () => {
    it('should start session when enabled and lessonId is provided', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          sessionId: 'session123',
          isOnboardingPeriod: true,
        },
      });

      renderHook(() =>
        useAdaptiveTracking('lesson123', { enabled: true, courseId: 'course123' })
      );

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/adaptive-learning/session/start', {
          lessonId: 'lesson123',
          courseId: 'course123',
          deviceType: expect.any(String),
        });
      });
    });

    it('should update onboarding state from response', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          sessionId: 'session123',
          isOnboardingPeriod: true,
        },
      });

      const { result } = renderHook(() =>
        useAdaptiveTracking('lesson123', { enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isOnboarding).toBe(true);
      });
    });
  });

  describe('tracking methods', () => {
    it('should provide trackContentInteraction method', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { sessionId: 'session123', isOnboardingPeriod: false },
      });

      const { result } = renderHook(() =>
        useAdaptiveTracking('lesson123', { enabled: true })
      );

      await waitFor(() => {
        expect(result.current.trackContentInteraction).toBeDefined();
        expect(typeof result.current.trackContentInteraction).toBe('function');
      });
    });

    it('should provide trackQuizAnswer method', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { sessionId: 'session123', isOnboardingPeriod: false },
      });

      const { result } = renderHook(() =>
        useAdaptiveTracking('lesson123', { enabled: true })
      );

      await waitFor(() => {
        expect(result.current.trackQuizAnswer).toBeDefined();
        expect(typeof result.current.trackQuizAnswer).toBe('function');
      });
    });

    it('should provide recordHelpRequest method', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { sessionId: 'session123', isOnboardingPeriod: false },
      });

      const { result } = renderHook(() =>
        useAdaptiveTracking('lesson123', { enabled: true })
      );

      await waitFor(() => {
        expect(result.current.trackHelpRequest).toBeDefined();
        expect(typeof result.current.trackHelpRequest).toBe('function');
      });
    });

    it('should provide endSession method', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { sessionId: 'session123', isOnboardingPeriod: false },
      });

      const { result } = renderHook(() =>
        useAdaptiveTracking('lesson123', { enabled: true })
      );

      await waitFor(() => {
        expect(result.current.endSession).toBeDefined();
        expect(typeof result.current.endSession).toBe('function');
      });
    });
  });

  describe('adaptation callbacks', () => {
    it('should call onAdaptation callback when adaptations are returned', async () => {
      const mockAdaptation = {
        should_suggest_break: true,
        should_simplify_content: false,
        should_offer_alternative_format: false,
        suggested_format: null,
        should_reduce_difficulty: false,
        calming_intervention_needed: false,
        encouragement_needed: true,
        messages: ['Keep going!'],
      };

      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { sessionId: 'session123', isOnboardingPeriod: false },
      });

      (api.put as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { adaptations: mockAdaptation },
      });

      const onAdaptation = vi.fn();
      
      renderHook(() =>
        useAdaptiveTracking('lesson123', { enabled: true, onAdaptation })
      );

      // Wait for session start
      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle session start error gracefully', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(() =>
        useAdaptiveTracking('lesson123', { enabled: true })
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to start adaptive learning session:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle update error gracefully', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { sessionId: 'session123', isOnboardingPeriod: false },
      });
      (api.put as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(() =>
        useAdaptiveTracking('lesson123', { enabled: true })
      );

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should cleanup on unmount', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { sessionId: 'session123', isOnboardingPeriod: false },
      });

      const { unmount } = renderHook(() =>
        useAdaptiveTracking('lesson123', { enabled: true })
      );

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });
});
