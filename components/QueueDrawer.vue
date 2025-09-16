<template>
  <div>
    <!-- Floating Queue Button -->
    <FloatingButton
      :is-open="isOpen"
      @toggle="toggleDrawer"
    />
    
    <!-- Overlay -->
    <DrawerOverlay
      :show="isOpen"
      @close="closeDrawer"
    />
    
    <!-- Drawer Panel -->
    <DrawerPanel
      :show="isOpen"
      :height="70"
      title="Queue"
      @close="closeDrawer"
    >
      <!-- Queue Content -->
      <div class="h-full flex flex-col">
        <!-- Queue Stats -->
        <div class="px-6 py-3 bg-gray-800 border-b border-gray-700">
          <p class="text-sm text-gray-400">
            {{ queueStats }}
          </p>
        </div>
        
        <!-- Queue List -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <div v-if="queue.length === 0" class="text-center py-12">
            <Icon name="heroicons:queue-list" class="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p class="text-gray-500 text-lg">Queue is empty</p>
            <p class="text-gray-600 text-sm mt-2">Add tracks using the search above</p>
          </div>
          
          <div v-else class="space-y-3">
            <QueueTrackItem
              v-for="(track, index) in queue"
              :key="track.id || index"
              :track="track"
              :position="index + 1"
              :is-current-track="index === 0"
            />
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
    </DrawerPanel>
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
}>()

// State
const isOpen = ref(false)
const refreshing = ref(false)

// Computed
const queueStats = computed(() => {
  const count = props.queue.length
  if (count === 0) return 'No tracks in queue'
  if (count === 1) return '1 track in queue'
  return `${count} tracks in queue`
})

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