<template>
  <div :class="[
    'absolute bg-green-500 rounded-full shadow-lg flex items-center justify-center',
    positionClasses,
    sizeClasses
  ]">
    <Icon name="heroicons:play" :class="iconClasses" class="text-black" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'small' | 'medium' | 'large'
  position?: 'bottom-right' | 'center' | 'top-right'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'large',
  position: 'bottom-right'
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'w-6 h-6'
    case 'medium':
      return 'w-8 h-8'
    case 'large':
      return 'w-12 h-12'
    default:
      return 'w-12 h-12'
  }
})

const iconClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'w-3 h-3'
    case 'medium':
      return 'w-4 h-4'
    case 'large':
      return 'w-6 h-6'
    default:
      return 'w-6 h-6'
  }
})

const positionClasses = computed(() => {
  switch (props.position) {
    case 'bottom-right':
      return 'bottom-4 right-4'
    case 'center':
      return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
    case 'top-right':
      return 'top-4 right-4'
    default:
      return 'bottom-4 right-4'
  }
})
</script>