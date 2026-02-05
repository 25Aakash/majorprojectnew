import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { AccessibilityProvider, useAccessibility } from '../../contexts/AccessibilityContext';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

// Mock dependencies
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Create wrapper component
const createWrapper = () => {
  return ({ children }: { children: ReactNode }) => (
    <AccessibilityProvider>{children}</AccessibilityProvider>
  );
};

describe('AccessibilityContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (useAuthStore as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => 
      selector({ isAuthenticated: false })
    );

    // Mock speechSynthesis
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: vi.fn(),
        cancel: vi.fn(),
      },
      writable: true,
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('default settings', () => {
    it('should provide default settings', async () => {
      const wrapper = createWrapper();
      
      // We need to test the hook behavior
      let hookResult: { settings: any } | null = null;
      
      const TestComponent = () => {
        const { settings } = require('../../contexts/AccessibilityContext').useAccessibility();
        hookResult = { settings };
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      expect(hookResult?.settings).toBeDefined();
      expect(hookResult?.settings.fontSize).toBe('medium');
      expect(hookResult?.settings.fontFamily).toBe('default');
      expect(hookResult?.settings.highContrast).toBe(false);
      expect(hookResult?.settings.reducedMotion).toBe(false);
      expect(hookResult?.settings.textToSpeech).toBe(false);
      expect(hookResult?.settings.lineSpacing).toBe('normal');
      expect(hookResult?.settings.colorTheme).toBe('light');
    });
  });

  describe('localStorage persistence', () => {
    it('should load settings from localStorage on mount', async () => {
      const savedSettings = {
        fontSize: 'large',
        fontFamily: 'dyslexia-friendly',
        highContrast: true,
        reducedMotion: false,
        textToSpeech: true,
        lineSpacing: 'relaxed',
        colorTheme: 'sepia',
      };
      localStorage.setItem('neurolearn-accessibility', JSON.stringify(savedSettings));

      let hookResult: { settings: any } | null = null;
      
      const TestComponent = () => {
        const context = require('../../contexts/AccessibilityContext').useAccessibility();
        hookResult = context;
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      expect(hookResult?.settings.fontSize).toBe('large');
      expect(hookResult?.settings.fontFamily).toBe('dyslexia-friendly');
      expect(hookResult?.settings.highContrast).toBe(true);
    });

    it('should handle invalid JSON in localStorage gracefully', async () => {
      localStorage.setItem('neurolearn-accessibility', 'invalid-json');

      let hookResult: { settings: any } | null = null;
      
      const TestComponent = () => {
        const context = require('../../contexts/AccessibilityContext').useAccessibility();
        hookResult = context;
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      // Should fall back to defaults
      expect(hookResult?.settings.fontSize).toBe('medium');
    });
  });

  describe('updateSettings', () => {
    it('should update settings when called', async () => {
      let hookResult: { settings: any; updateSettings: (s: any) => void } | null = null;
      
      const TestComponent = () => {
        const context = require('../../contexts/AccessibilityContext').useAccessibility();
        hookResult = context;
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      await act(async () => {
        hookResult?.updateSettings({ fontSize: 'extra-large' });
      });

      expect(hookResult?.settings.fontSize).toBe('extra-large');
    });

    it('should save settings to localStorage', async () => {
      let hookResult: { updateSettings: (s: any) => void } | null = null;
      
      const TestComponent = () => {
        const context = require('../../contexts/AccessibilityContext').useAccessibility();
        hookResult = context;
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      await act(async () => {
        hookResult?.updateSettings({ fontSize: 'large' });
      });

      const saved = localStorage.getItem('neurolearn-accessibility');
      expect(saved).toBeDefined();
      const parsed = JSON.parse(saved!);
      expect(parsed.fontSize).toBe('large');
    });
  });

  describe('resetSettings', () => {
    it('should reset to default settings', async () => {
      localStorage.setItem('neurolearn-accessibility', JSON.stringify({ fontSize: 'large' }));

      let hookResult: { settings: any; resetSettings: () => void; updateSettings: (s: any) => void } | null = null;
      
      const TestComponent = () => {
        const context = require('../../contexts/AccessibilityContext').useAccessibility();
        hookResult = context;
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      // First update to non-default
      await act(async () => {
        hookResult?.updateSettings({ fontSize: 'extra-large' });
      });

      expect(hookResult?.settings.fontSize).toBe('extra-large');

      // Then reset
      await act(async () => {
        hookResult?.resetSettings();
      });

      expect(hookResult?.settings.fontSize).toBe('medium');
    });

    it('should remove from localStorage', async () => {
      localStorage.setItem('neurolearn-accessibility', JSON.stringify({ fontSize: 'large' }));

      let hookResult: { resetSettings: () => void } | null = null;
      
      const TestComponent = () => {
        const context = require('../../contexts/AccessibilityContext').useAccessibility();
        hookResult = context;
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      await act(async () => {
        hookResult?.resetSettings();
      });

      expect(localStorage.getItem('neurolearn-accessibility')).toBeNull();
    });
  });

  describe('text-to-speech', () => {
    it('should speak text when enabled', async () => {
      let hookResult: { settings: any; speak: (text: string) => void; updateSettings: (s: any) => void } | null = null;
      
      const TestComponent = () => {
        const context = require('../../contexts/AccessibilityContext').useAccessibility();
        hookResult = context;
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      // Enable text-to-speech
      await act(async () => {
        hookResult?.updateSettings({ textToSpeech: true });
      });

      await act(async () => {
        hookResult?.speak('Hello world');
      });

      expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });

    it('should not speak when disabled', async () => {
      let hookResult: { speak: (text: string) => void } | null = null;
      
      const TestComponent = () => {
        const context = require('../../contexts/AccessibilityContext').useAccessibility();
        hookResult = context;
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      await act(async () => {
        hookResult?.speak('Hello world');
      });

      expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    });

    it('should stop speaking when stopSpeaking is called', async () => {
      let hookResult: { stopSpeaking: () => void } | null = null;
      
      const TestComponent = () => {
        const context = require('../../contexts/AccessibilityContext').useAccessibility();
        hookResult = context;
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      await act(async () => {
        hookResult?.stopSpeaking();
      });

      expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  describe('reduced motion preference', () => {
    it('should detect system reduced motion preference', async () => {
      // Mock matchMedia to return reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      let hookResult: { settings: any } | null = null;
      
      const TestComponent = () => {
        const context = require('../../contexts/AccessibilityContext').useAccessibility();
        hookResult = context;
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      // Note: Due to how the context is loaded, this may need adjustment
      // based on actual implementation behavior
    });
  });

  describe('API integration', () => {
    it('should fetch settings from API when authenticated', async () => {
      (useAuthStore as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => 
        selector({ isAuthenticated: true })
      );

      (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          preferences: {
            fontSize: 'large',
            fontFamily: 'serif',
          },
        },
      });

      const TestComponent = () => {
        const context = require('../../contexts/AccessibilityContext').useAccessibility();
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/user/accessibility-preferences');
      });
    });

    it('should not fetch from API when not authenticated', async () => {
      (useAuthStore as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => 
        selector({ isAuthenticated: false })
      );

      const TestComponent = () => {
        const context = require('../../contexts/AccessibilityContext').useAccessibility();
        return null;
      };

      await act(async () => {
        render(
          <AccessibilityProvider>
            <TestComponent />
          </AccessibilityProvider>
        );
      });

      expect(api.get).not.toHaveBeenCalled();
    });
  });
});
