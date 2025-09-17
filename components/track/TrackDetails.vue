<template>
  <div :class="[
    'text-gray-500 space-y-1',
    sizeClasses
  ]">
    <!-- Album Name -->
    <p v-if="album" class="truncate">
      {{ album }}
    </p>
    
  </div>
</template>

<script setup lang="ts">
interface Props {
  album?: string
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  album: undefined,
  size: 'large'
})

// Computed
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
</script>