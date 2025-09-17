<template>
  <div class="flex flex-col items-center text-center py-4">
    <!-- Track Image Component -->
    <div class="mb-4">
      <TrackImage
        :image-url="track?.album?.images?.[0]?.url"
        :alt="track?.name"
        :size="size"
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
  loading?: boolean
  size?: 'small' | 'medium' | 'large'
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  track: null,
  loading: false,
  size: 'large',
  showDetails: true
})
</script>

