import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// We need to mock EventSource since jsdom doesn't have it
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    // Simulate open after microtask
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  close() {
    this.readyState = 2;
  }

  // Helper to simulate a message
  simulateMessage(data: string) {
    const event = new MessageEvent('message', { data });
    this.onmessage?.(event);
  }

  // Helper to simulate an error
  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

// Install mock
Object.defineProperty(globalThis, 'EventSource', {
  writable: true,
  value: MockEventSource,
});

// Must import AFTER mock is installed
import { useSSEInterventions } from '../../hooks/useSSEInterventions';

describe('useSSEInterventions', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    MockEventSource.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not connect when userId is undefined', () => {
    renderHook(() =>
      useSSEInterventions({ userId: undefined, enabled: true })
    );
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('should not connect when disabled', () => {
    renderHook(() =>
      useSSEInterventions({ userId: 'user1', enabled: false })
    );
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('should connect when userId is provided and enabled', () => {
    renderHook(() =>
      useSSEInterventions({ userId: 'user1', enabled: true })
    );
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/ai/events/user1');
  });

  it('should call onIntervention when an intervention event arrives', async () => {
    const onIntervention = vi.fn();
    renderHook(() =>
      useSSEInterventions({ userId: 'user1', enabled: true, onIntervention })
    );

    const es = MockEventSource.instances[0];

    act(() => {
      es.simulateMessage(
        JSON.stringify({
          type: 'intervention',
          data: {
            intervention: {
              type: 'calming',
              priority: 'high',
              message: 'Take a break',
              suggestedAction: 'breathe',
            },
          },
        })
      );
    });

    expect(onIntervention).toHaveBeenCalledWith({
      type: 'calming',
      priority: 'high',
      message: 'Take a break',
      suggestedAction: 'breathe',
    });
  });

  it('should not call onIntervention for connection events', () => {
    const onIntervention = vi.fn();
    renderHook(() =>
      useSSEInterventions({ userId: 'user1', enabled: true, onIntervention })
    );

    const es = MockEventSource.instances[0];

    act(() => {
      es.simulateMessage(JSON.stringify({ type: 'connected', userId: 'user1' }));
    });

    expect(onIntervention).not.toHaveBeenCalled();
  });

  it('should ignore unparseable messages', () => {
    const onIntervention = vi.fn();
    renderHook(() =>
      useSSEInterventions({ userId: 'user1', enabled: true, onIntervention })
    );

    const es = MockEventSource.instances[0];

    act(() => {
      es.simulateMessage('not valid json');
    });

    expect(onIntervention).not.toHaveBeenCalled();
  });

  it('should close connection on unmount', () => {
    const { unmount } = renderHook(() =>
      useSSEInterventions({ userId: 'user1', enabled: true })
    );

    const es = MockEventSource.instances[0];
    unmount();
    expect(es.readyState).toBe(2); // CLOSED
  });

  it('should reconnect after error', () => {
    renderHook(() =>
      useSSEInterventions({ userId: 'user1', enabled: true })
    );

    expect(MockEventSource.instances).toHaveLength(1);
    const es = MockEventSource.instances[0];

    act(() => {
      es.simulateError();
    });

    // Advance timer to trigger reconnect (5s)
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Should have created a new EventSource
    expect(MockEventSource.instances).toHaveLength(2);
  });
});
