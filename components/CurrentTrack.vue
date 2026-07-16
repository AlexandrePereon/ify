<template>
  <div class="flex flex-col items-center text-center py-4 w-full">
    <!-- Track Image Component -->
    <div class="mb-6">
      <TrackImage
        :image-url="track?.album?.images?.[0]?.url"
        :alt="track?.name"
        :size="size"
        :loading="loading"
        :is-playing="isPlaying"
        placeholder-text="Aucune lecture en cours"
      />
    </div>

    <!-- Track Info Component -->
    <TrackInfo
      :track="track"
      :size="size"
      :show-details="showDetails"
      fallback-title="Aucun titre sélectionné"
      fallback-artist="Choisissez un titre pour commencer"
    />

    <!-- Progress Bar -->
    <TrackProgress
      v-if="track"
      :progress-ms="progressMs"
      :duration-ms="track?.duration_ms"
      :is-playing="isPlaying"
    />
  </div>
</template>

<script setup lang="ts">
interface Track {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    images: Array<{ url: string }>
  }
  duration_ms?: number
  uri: string
}

interface Props {
  track?: Track | null
  loading?: boolean
  size?: 'small' | 'medium' | 'large'
  showDetails?: boolean
  isPlaying?: boolean
  progressMs?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  track: null,
  loading: false,
  size: 'large',
  showDetails: true,
  isPlaying: false,
  progressMs: null
})
</script>

