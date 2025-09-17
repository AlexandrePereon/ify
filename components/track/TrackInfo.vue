<template>
  <div class="text-center space-y-2">
    <!-- Track Title -->
    <h2 :class="[
      'font-bold text-white',
      titleSizeClasses
    ]">
      {{ track?.name || fallbackTitle }}
    </h2>

    <!-- Artist Names -->
    <p :class="[
      'text-gray-400',
      artistSizeClasses
    ]">
      {{ artistNames || fallbackArtist }}
    </p>

    <!-- Additional Track Details -->
    <TrackDetails 
      v-if="track && showDetails"
      :album="track.album?.name"
      :size="size"
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
  size?: 'small' | 'medium' | 'large'
  showDetails?: boolean
  fallbackTitle?: string
  fallbackArtist?: string
}

const props = withDefaults(defineProps<Props>(), {
  track: null,
  size: 'large',
  showDetails: true,
  fallbackTitle: 'No track selected',
  fallbackArtist: 'Choose a track to get started'
})

// Computed
const artistNames = computed(() => {
  if (!props.track?.artists?.length) return null
  return props.track.artists.map(artist => artist.name).join(', ')
})

const titleSizeClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'text-sm'
    case 'medium':
      return 'text-lg md:text-xl'
    case 'large':
      return 'text-2xl md:text-3xl max-w-sm md:max-w-md'
    default:
      return 'text-2xl md:text-3xl max-w-sm md:max-w-md'
  }
})

const artistSizeClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'text-xs'
    case 'medium':
      return 'text-sm md:text-base'
    case 'large':
      return 'text-lg md:text-xl max-w-sm md:max-w-md'
    default:
      return 'text-lg md:text-xl max-w-sm md:max-w-md'
  }
})
</script>