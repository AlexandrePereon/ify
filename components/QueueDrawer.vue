<template>
  <div>
    <!-- Floating Share Button -->
    <button
      :class="[
        'fixed bottom-24 left-6 z-40',
        'w-12 h-12',
        'rounded-full',
        'flex items-center justify-center',
        'transition-all duration-200 transform',
        'hover:scale-110'
      ]"
      @click="$emit('showShare')"
    >
      <Icon name="heroicons:qr-code" class="w-6 h-6 text-[#1DB954]" />
    </button>

    <!-- Floating Queue Button -->
    <button
      :class="[
        'fixed bottom-6 left-6 z-40',
        'w-12 h-12',
        'rounded-full',
        'flex items-center justify-center',
        'transition-all duration-200 transform',
        isOpen ? 'rotate-180' : 'hover:scale-110'
      ]"
      @click="toggleDrawer"
    >
      <Icon 
        :name="isOpen ? 'heroicons:x-mark' : 'heroicons:queue-list'" 
        class="w-6 h-6 text-[#1DB954] transition-transform duration-200"
      />
    </button>
    
    <!-- Overlay -->
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
        class="fixed inset-0 bg-black bg-opacity-50 z-30"
        @click="closeDrawer"
      />
    </Transition>
    
    <!-- Drawer Panel -->
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
        v-if="isOpen"
        class="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 rounded-t-2xl shadow-2xl"
        style="height: 70%"
      >
        <!-- Drag Handle -->
        <div class="w-full flex justify-center pt-3 pb-2">
          <div class="w-12 h-1 bg-gray-600 rounded-full" />
        </div>
        
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 class="text-xl font-semibold text-white">Queue</h3>
          <button
            @click="closeDrawer"
            class="text-gray-400 hover:text-white transition-colors"
          >
            <Icon name="heroicons:x-mark" class="w-6 h-6" />
          </button>
        </div>
      <!-- Queue Content -->
      <div class="h-full flex flex-col">
        
        <!-- Queue List -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <div v-if="queue.length === 0" class="text-center py-12">
            <Icon name="heroicons:queue-list" class="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p class="text-gray-500 text-lg">Queue is empty</p>
            <p class="text-gray-600 text-sm mt-2">Add tracks using the search above</p>
          </div>
          
          <div v-else class="space-y-3">
            <!-- Queue Track Items -->
            <div
              v-for="(track, index) in queue"
              :key="track.id || index"
              :class="[
                'flex items-center gap-3 p-3 rounded-lg transition-colors',
                index === 0 ? 'bg-green-900/20 border border-green-500/30' : 'bg-gray-800/50 hover:bg-gray-700/50'
              ]"
            >
              <!-- Track Image -->
              <div class="relative">
                <img
                  v-if="track.image"
                  :src="track.image"
                  :alt="track.name"
                  class="w-12 h-12 rounded-lg object-cover"
                />
                <div v-else class="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                  <Icon name="heroicons:musical-note" class="w-6 h-6 text-gray-500" />
                </div>
                
                <!-- Playing Indicator -->
                <div
                  v-if="index === 0"
                  class="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <Icon name="heroicons:play" class="w-2.5 h-2.5 text-black" />
                </div>
              </div>
              
              <!-- Track Info -->
              <div class="flex-1 min-w-0">
                <p class="text-white font-medium truncate">{{ track.name }}</p>
                <p class="text-gray-400 text-sm truncate">
                  {{ track.artists?.join(', ') || 'Unknown Artist' }}
                </p>
                <p v-if="track.addedBy" class="text-green-400 text-xs mt-1">
                  Added by {{ track.addedBy }}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Queue Actions -->
        <div class="px-6 py-4 bg-gray-800 border-t border-gray-700">
          <div class="flex justify-between items-center">
            <button
              v-if="queue.length > 0"
              @click="clearQueue"
              class="text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              Clear Queue
            </button>
            <button
              @click="refreshQueue"
              :disabled="refreshing"
              class="text-green-400 hover:text-green-300 text-sm transition-colors disabled:opacity-50"
            >
              <Icon 
                name="heroicons:arrow-path" 
                :class="['w-4 h-4 inline mr-1', refreshing ? 'animate-spin' : '']"
              />
              Refresh
            </button>
          </div>
        </div>
      </div>
      </div>
    </Transition>
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
  queue?: QueueTrack[]
  groupId?: string
}

const props = withDefaults(defineProps<Props>(), {
  queue: () => [],
  groupId: undefined
})

const emit = defineEmits<{
  refresh: []
  clear: []
  showShare: []
}>()

// State
const isOpen = ref(false)
const refreshing = ref(false)


// Methods
const toggleDrawer = () => {
  isOpen.value = !isOpen.value
}

const closeDrawer = () => {
  isOpen.value = false
}

const refreshQueue = async () => {
  refreshing.value = true
  emit('refresh')
  
  // Simulate API call delay
  setTimeout(() => {
    refreshing.value = false
  }, 1000)
}

const clearQueue = () => {
  emit('clear')
}


// Close drawer on escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen.value) {
      closeDrawer()
    }
  }
  document.addEventListener('keydown', handleEscape)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape)
  })
})
</script>