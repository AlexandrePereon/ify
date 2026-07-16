export interface SSEMessage<T = any> {
  type: string
  data: T
  timestamp?: string
}

export interface SSEOptions {
  url: string
  params?: Record<string, string>
  onMessage?: (message: SSEMessage) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  onClose?: () => void
  autoReconnect?: boolean
  reconnectDelay?: number
}

export function useSSE(options: SSEOptions) {
  const eventSource = ref<EventSource | null>(null)
  const isConnected = ref(false)
  const error = ref<string | null>(null)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5

  // Build URL with query parameters
  const buildUrl = () => {
    if (!options.params) return options.url
    const params = new URLSearchParams(options.params)
    return `${options.url}?${params.toString()}`
  }

  // Connect to SSE
  const connect = () => {
    if (eventSource.value?.readyState === EventSource.OPEN) {
      return // Already connected
    }

    try {
      const url = buildUrl()
      eventSource.value = new EventSource(url)
      
      eventSource.value.onopen = () => {
        isConnected.value = true
        error.value = null
        reconnectAttempts.value = 0
        options.onOpen?.()
      }

      eventSource.value.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data)
          options.onMessage?.(message)
        } catch (parseError) {
          options.onMessage?.({
            type: 'raw',
            data: event.data
          })
        }
      }

      eventSource.value.onerror = (event) => {
        isConnected.value = false
        error.value = 'Connection error'
        options.onError?.(event)

        if (options.autoReconnect && reconnectAttempts.value < maxReconnectAttempts) {
          const delay = options.reconnectDelay || 3000
          setTimeout(() => {
            reconnectAttempts.value++
            connect()
          }, delay)
        }
      }

    } catch (err) {
      error.value = 'Failed to create connection'
    }
  }

  // Disconnect from SSE
  const disconnect = () => {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
      isConnected.value = false
      options.onClose?.()
    }
  }

  // Reconnect manually
  const reconnect = () => {
    disconnect()
    setTimeout(connect, 100)
  }

  return {
    eventSource: readonly(eventSource),
    isConnected: readonly(isConnected),
    error: readonly(error),
    reconnectAttempts: readonly(reconnectAttempts),
    connect,
    disconnect,
    reconnect
  }
}