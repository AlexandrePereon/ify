<template>
  <div :class="[
    'text-gray-500 space-y-1',
    sizeClasses
  ]">
    <!-- Album Name -->
    <p v-if="album" class="truncate">
      {{ album }}
    </p>
    
    <!-- Duration -->
    <div v-if="duration" class="flex items-center justify-center space-x-2">
      <Icon name="heroicons:clock" :class="iconClasses" />
      <span>{{ formattedDuration }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  album?: string
  duration?: number
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  album: undefined,
  duration: undefined,
  size: 'large'
})

// Computed
const formattedDuration = computed(() => {
  if (!props.duration) return ''
  
  const seconds = Math.floor(props.duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'text-xs'
    case 'medium':
      return 'text-sm'
    case 'large':
      return 'text-sm'
    default:
      return 'text-sm'
  }
})

const iconClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'w-3 h-3'
    case 'medium':
      return 'w-4 h-4'
    case 'large':
      return 'w-4 h-4'
    default:
      return 'w-4 h-4'
  }
})
</script>