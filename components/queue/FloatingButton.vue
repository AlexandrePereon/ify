<template>
  <button
    :class="[
      'fixed bottom-6 right-6 z-40',
      'w-14 h-14 bg-green-500 hover:bg-green-400',
      'rounded-full shadow-lg hover:shadow-xl',
      'flex items-center justify-center',
      'transition-all duration-200 transform',
      'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-black',
      isOpen ? 'rotate-180 bg-gray-600 hover:bg-gray-500' : 'hover:scale-110'
    ]"
    @click="toggle"
  >
    <Icon 
      :name="isOpen ? 'heroicons:x-mark' : 'heroicons:queue-list'" 
      class="w-6 h-6 text-black transition-transform duration-200"
    />
  </button>
</template>

<script setup lang="ts">
interface Props {
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false
})

const emit = defineEmits<{
  toggle: []
}>()

const toggle = () => {
  emit('toggle')
}
</script>