import { useEffect, useRef, useCallback, useState } from 'react'

export interface SSEIntervention {
  type: string
  priority: string
  message: string
  suggestedAction?: string
}

interface SSEEvent {
  type: string
  data?: {
    intervention?: SSEIntervention
    scores?: Record<string, number>
    timestamp?: string
  }
}

interface UseSSEInterventionsOptions {
  userId: string | undefined
  enabled: boolean
  onIntervention?: (intervention: SSEIntervention) => void
}

/**
 * Hook that connects to the AI service's Server-Sent Events stream
 * to receive real-time push interventions.
 */
export function useSSEInterventions({ userId, enabled, onIntervention }: UseSSEInterventionsOptions) {
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const onInterventionRef = useRef(onIntervention)
  onInterventionRef.current = onIntervention

  const connect = useCallback(() => {
    if (!userId || !enabled) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const url = `/api/ai/events/${userId}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onopen = () => {
      setConnected(true)
    }

    es.onmessage = (event) => {
      try {
        const parsed: SSEEvent = JSON.parse(event.data)

        if (parsed.type === 'connected') {
          setConnected(true)
          return
        }

        if (parsed.type === 'intervention' && parsed.data?.intervention) {
          onInterventionRef.current?.(parsed.data.intervention)
        }
      } catch {
        // Ignore unparseable events (keepalives, etc.)
      }
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
      // Reconnect after 5 seconds
      setTimeout(() => {
        if (enabled) connect()
      }, 5000)
    }
  }, [userId, enabled])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      setConnected(false)
    }
  }, [connect])

  return { connected }
}
