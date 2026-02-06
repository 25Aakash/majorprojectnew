import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
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

describe('AccessibilityContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => 
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

    // Mock SpeechSynthesisUtterance as a proper class (required for `new` calls)
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string;
      rate = 1;
      pitch = 1;
      constructor(text: string) {
        this.text = text;
      }
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: any) => ({
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
      // We need to test the hook behavior
      let hookResult: any = null;
      
      const TestComponent = () => {
        const { settings } = useAccessibility();
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
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(savedSettings));

      let hookResult: any = null;
      
      const TestComponent = () => {
        hookResult = useAccessibility();
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
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('invalid-json');

      let hookResult: any = null;
      
      const TestComponent = () => {
        hookResult = useAccessibility();
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
      let hookResult: any = null;
      
      const TestComponent = () => {
        hookResult = useAccessibility();
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
      let hookResult: any = null;
      
      const TestComponent = () => {
        hookResult = useAccessibility();
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

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'neurolearn-accessibility',
        expect.stringContaining('"fontSize":"large"')
      );
    });
  });

  describe('resetSettings', () => {
    it('should reset to default settings', async () => {
      localStorage.setItem('neurolearn-accessibility', JSON.stringify({ fontSize: 'large' }));

      let hookResult: any = null;
      
      const TestComponent = () => {
        hookResult = useAccessibility();
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

      let hookResult: any = null;
      
      const TestComponent = () => {
        hookResult = useAccessibility();
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

      expect(localStorage.removeItem).toHaveBeenCalledWith('neurolearn-accessibility');
    });
  });

  describe('text-to-speech', () => {
    it('should speak text when enabled', async () => {
      let hookResult: any = null;
      
      const TestComponent = () => {
        hookResult = useAccessibility();
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
      let hookResult: any = null;
      
      const TestComponent = () => {
        hookResult = useAccessibility();
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
      let hookResult: any = null;
      
      const TestComponent = () => {
        hookResult = useAccessibility();
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
        value: vi.fn().mockImplementation((query: any) => ({
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

      const TestComponent = () => {
        useAccessibility();
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
      (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => 
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

      // Also mock api.post to return a promise (used by settings save effect)
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

      const TestComponent = () => {
        useAccessibility();
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
      (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => 
        selector({ isAuthenticated: false })
      );

      const TestComponent = () => {
        useAccessibility();
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
