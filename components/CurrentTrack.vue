<template>
  <div class="flex flex-col items-center text-center py-8">
    <!-- Track Image Component -->
    <div class="mb-6">
      <TrackImage
        :image-url="track?.album?.images?.[0]?.url"
        :alt="track?.name"
        :size="size"
        :is-playing="isPlaying"
        :loading="loading"
        placeholder-text="No track playing"
      />
    </div>

    <!-- Track Info Component -->
    <TrackInfo
      :track="track"
      :size="size"
      :show-details="showDetails"
      fallback-title="No track selected"
      fallback-artist="Choose a track to get started"
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
  isPlaying?: boolean
  loading?: boolean
  size?: 'small' | 'medium' | 'large'
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  track: null,
  isPlaying: false,
  loading: false,
  size: 'large',
  showDetails: true
})
</script>

