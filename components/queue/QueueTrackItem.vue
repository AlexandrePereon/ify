<template>
  <div class="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
    <!-- Track Position -->
    <span class="text-gray-400 text-sm w-6 text-center font-mono">
      {{ position }}
    </span>
    
    <!-- Track Image -->
    <TrackImage
      :image-url="track.image"
      :alt="track.name"
      size="small"
      :is-playing="isCurrentTrack"
    />
    
    <!-- Track Info -->
    <div class="flex-1 min-w-0">
      <TrackInfo
        :track="track"
        size="small"
        :show-details="false"
        :fallback-title="track.name"
        :fallback-artist="track.artists?.join(', ') || 'Unknown Artist'"
      />
    </div>
    
    <!-- Added By -->
    <div v-if="track.addedBy" class="text-xs text-gray-500 text-right">
      <p>Added by</p>
      <p class="font-medium">{{ track.addedBy }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface QueueTrack {
  id: string
  name: string
  artists?: string[]
  image?: string
  addedBy?: string
  uri: string
}

interface Props {
  track: QueueTrack
  position: number
  isCurrentTrack?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isCurrentTrack: false
})
</script>