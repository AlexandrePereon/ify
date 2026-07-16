import type { Ref } from 'vue'

// Extracts the average color of an image (album art) to build
// Spotify-like ambient gradients behind the now-playing view.
export function useDominantColor(imageUrl: Ref<string | null | undefined>) {
  const color = ref<string | null>(null)

  watch(imageUrl, (url) => {
    if (!url || !import.meta.client) {
      color.value = null
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const size = 16
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)

        let r = 0
        let g = 0
        let b = 0
        const pixels = data.length / 4
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
        }

        color.value = `rgb(${Math.round(r / pixels)}, ${Math.round(g / pixels)}, ${Math.round(b / pixels)})`
      } catch {
        // Canvas tainted or unreadable — keep the fallback tint
        color.value = null
      }
    }

    img.onerror = () => {
      color.value = null
    }

    img.src = url
  }, { immediate: true })

  return { color }
}
