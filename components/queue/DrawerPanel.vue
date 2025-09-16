<template>
  <Transition
    name="drawer"
    enter-active-class="transition-transform duration-300 ease-out"
    leave-active-class="transition-transform duration-200 ease-in"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="show"
      class="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 rounded-t-2xl shadow-2xl"
      :style="{ height: `${height}%` }"
    >
      <!-- Drag Handle -->
      <div class="w-full flex justify-center pt-3 pb-2">
        <div class="w-12 h-1 bg-gray-600 rounded-full" />
      </div>
      
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <h3 class="text-xl font-semibold text-white">
          {{ title }}
        </h3>
        <button
          @click="close"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <Icon name="heroicons:x-mark" class="w-6 h-6" />
        </button>
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-hidden">
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  show: boolean
  height?: number
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  height: 70,
  title: 'Queue'
})

const emit = defineEmits<{
  close: []
}>()

const close = () => {
  emit('close')
}
</script>