<template>
  <button
    :disabled="disabled || loading"
    :class="[
      'flex items-center justify-center space-x-2 font-semibold rounded-full transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-black',
      variantClasses,
      sizeClasses,
      disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
    ]"
    @click="handleClick"
  >
    <!-- Loading Spinner -->
    <Icon 
      v-if="loading" 
      name="heroicons:arrow-path" 
      :class="iconClasses"
      class="animate-spin" 
    />
    
    <!-- Icon -->
    <Icon 
      v-else-if="icon" 
      :name="icon" 
      :class="iconClasses"
    />
    
    <!-- Text -->
    <span v-if="$slots.default || text">
      <slot>{{ text }}</slot>
    </span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  icon?: string
  text?: string
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  icon: undefined,
  text: undefined,
  loading: false,
  disabled: false
})

const emit = defineEmits<{
  click: []
}>()

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-green-500 hover:bg-green-400 text-black'
    case 'secondary':
      return 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
    case 'danger':
      return 'bg-red-600 hover:bg-red-500 text-white'
    default:
      return 'bg-green-500 hover:bg-green-400 text-black'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'px-4 py-2 text-sm'
    case 'medium':
      return 'px-6 py-3 text-base'
    case 'large':
      return 'px-8 py-4 text-lg'
    default:
      return 'px-6 py-3 text-base'
  }
})

const iconClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'w-4 h-4'
    case 'medium':
      return 'w-5 h-5'
    case 'large':
      return 'w-6 h-6'
    default:
      return 'w-5 h-5'
  }
})

const handleClick = () => {
  if (!props.disabled && !props.loading) {
    emit('click')
  }
}
</script>