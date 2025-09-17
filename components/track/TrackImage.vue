<template>
  <div class="relative">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="alt"
      :class="[
        'rounded-2xl shadow-2xl object-cover transition-all duration-300',
        sizeClasses
      ]"
    />
    
    <!-- Placeholder when no image -->
    <div
      v-else
      :class="[
        'bg-gray-800 rounded-2xl shadow-2xl flex items-center justify-center',
        sizeClasses
      ]"
    >
      <div class="text-center">
        <Icon name="heroicons:musical-note" :class="iconSizeClasses" class="text-gray-600 mx-auto mb-4" />
        <p class="text-gray-500 text-lg">{{ placeholderText }}</p>
      </div>
    </div>

    <!-- Playing indicator overlay -->
    <div
      v-if="isPlaying && imageUrl"
      :class="[
        'absolute bg-green-500 rounded-full shadow-lg flex items-center justify-center',
        'bottom-4 right-4',
        indicatorSize === 'small' ? 'w-6 h-6' : indicatorSize === 'medium' ? 'w-8 h-8' : 'w-12 h-12'
      ]"
    >
      <Icon 
        name="heroicons:play" 
        :class="indicatorSize === 'small' ? 'w-3 h-3' : indicatorSize === 'medium' ? 'w-4 h-4' : 'w-6 h-6'"
        class="text-black" 
      />
    </div>

    <!-- Loading overlay -->
    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-2xl"
    >
      <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-green-500" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  imageUrl?: string | null
  alt?: string
  size?: 'small' | 'medium' | 'large'
  isPlaying?: boolean
  loading?: boolean
  placeholderText?: string
}

const props = withDefaults(defineProps<Props>(), {
  imageUrl: null,
  alt: 'Track artwork',
  size: 'large',
  isPlaying: false,
  loading: false,
  placeholderText: 'No track playing'
})

// Computed classes based on size
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'w-16 h-16'
    case 'medium':
      return 'w-32 h-32 md:w-40 md:h-40'
    case 'large':
      return 'w-64 h-64 md:w-80 md:h-80'
    default:
      return 'w-64 h-64 md:w-80 md:h-80'
  }
})

const iconSizeClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'w-6 h-6'
    case 'medium':
      return 'w-12 h-12'
    case 'large':
      return 'w-20 h-20'
    default:
      return 'w-20 h-20'
  }
})

const indicatorSize = computed(() => {
  switch (props.size) {
    case 'small':
      return 'small'
    case 'medium':
      return 'medium'
    case 'large':
      return 'large'
    default:
      return 'large'
  }
})
</script>