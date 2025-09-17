<template>
  <div>
    <!-- Modal Overlay -->
    <Transition
      name="overlay"
      enter-active-class="transition-opacity duration-300 ease-out"
      leave-active-class="transition-opacity duration-200 ease-in"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black bg-opacity-50 z-50"
        @click="close"
      />
    </Transition>
    
    <!-- Modal Content -->
    <Transition
      name="modal"
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0 scale-95 translate-y-4"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-4"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click="close"
      >
        <div 
          class="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 p-4 sm:p-6 w-full max-w-xs sm:max-w-sm"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between mb-4 sm:mb-6">
            <h3 class="text-lg sm:text-xl font-semibold text-white">Share Group</h3>
            <button
              @click="close"
              class="text-gray-400 hover:text-white transition-colors p-1"
            >
              <Icon name="heroicons:x-mark" class="w-5 h-5" />
            </button>
          </div>
          
          <!-- Group Code -->
          <div class="mb-4 sm:mb-6">
            <div class="flex items-center gap-2">
              <div class="flex-1 bg-gray-800 rounded-lg px-3 py-2 sm:px-4 sm:py-3 font-mono text-base sm:text-lg text-center text-green-400 font-semibold border border-gray-600">
                {{ groupCode }}
              </div>
              <button
                @click="copyCode"
                :class="[
                  'px-2 py-2 sm:px-3 sm:py-3 rounded-lg transition-colors flex-shrink-0',
                  copied ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                ]"
              >
                <Icon 
                  :name="copied ? 'heroicons:check' : 'heroicons:clipboard-document'" 
                  class="w-4 h-4 sm:w-5 sm:h-5" 
                />
              </button>
            </div>
          </div>
          
          <!-- QR Code -->
          <div class="text-center">
            <div class="bg-white rounded-xl p-3 sm:p-4 inline-block mb-3 mx-auto w-56 h-56 flex items-center justify-center overflow-hidden">
              <Qrcode 
                :value="joinUrl" 
                class="w-48 h-48 max-w-none"
              />
            </div>
            <p class="text-xs text-gray-500">Scan to join group</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  groupCode: string
  groupId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

// State
const copied = ref(false)

// Computed
const joinUrl = computed(() => {
  if (!props.groupCode) return ''
  if (process.client) {
    const baseUrl = window.location.origin
    return `${baseUrl}/join/${props.groupCode}`
  }
  return `http://localhost:3000/join/${props.groupCode}`
})

// Methods
const close = () => {
  emit('close')
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.groupCode)
    copied.value = true
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = props.groupCode
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

// Close on escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.isOpen) {
      close()
    }
  }
  document.addEventListener('keydown', handleEscape)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape)
  })
})
</script>