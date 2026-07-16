<template>
  <div v-if="durationMs" class="w-full max-w-xs md:max-w-sm mx-auto mt-4 group">
    <div class="h-1 bg-white/20 rounded-full overflow-hidden">
      <div
        class="h-full bg-white group-hover:bg-spotify-green rounded-full transition-colors"
        :style="{ width: percent + '%' }"
      />
    </div>
    <div class="flex justify-between mt-1.5 text-[11px] font-medium text-spotify-subdued tabular-nums">
      <span>{{ formatTime(displayMs) }}</span>
      <span>{{ formatTime(durationMs) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  progressMs?: number | null
  durationMs?: number | null
  isPlaying?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  progressMs: null,
  durationMs: null,
  isPlaying: false
})

const displayMs = ref(props.progressMs || 0)
let ticker: ReturnType<typeof setInterval> | null = null

// Re-sync whenever the server sends a fresh position
watch(() => props.progressMs, (value) => {
  displayMs.value = value || 0
})

// Advance locally between server updates while playing
watch(() => props.isPlaying, (playing) => {
  if (ticker) {
    clearInterval(ticker)
    ticker = null
  }
  if (playing) {
    ticker = setInterval(() => {
      if (props.durationMs && displayMs.value < props.durationMs) {
        displayMs.value += 1000
      }
    }, 1000)
  }
}, { immediate: true })

onUnmounted(() => {
  if (ticker) clearInterval(ticker)
})

const percent = computed(() => {
  if (!props.durationMs) return 0
  return Math.min(100, (displayMs.value / props.durationMs) * 100)
})

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
</script>
