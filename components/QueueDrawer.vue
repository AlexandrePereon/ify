<template>
  <div>
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
        class="fixed inset-0 bg-black/60 z-30"
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
        class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-40 h-[70vh] bg-spotify-elevated rounded-t-2xl shadow-2xl shadow-black/80 flex flex-col"
      >
        <!-- Drag Handle -->
        <div class="w-full flex justify-center pt-3 pb-2 flex-shrink-0">
          <div class="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <h3 class="text-xl font-extrabold tracking-tight text-white">File d'attente</h3>
          <button
            @click="closeDrawer"
            class="text-spotify-subdued hover:text-white transition-colors"
          >
            <Icon name="heroicons:x-mark" class="w-6 h-6" />
          </button>
        </div>

        <!-- Queue List -->
        <div class="flex-1 overflow-y-auto px-4 py-4">
          <div v-if="queue.length === 0" class="text-center py-12">
            <Icon name="heroicons:queue-list" class="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p class="text-spotify-subdued text-lg">La file est vide</p>
            <p class="text-spotify-subdued/60 text-sm mt-2">Ajoutez des titres via la recherche</p>
          </div>

          <div v-else class="space-y-1">
            <!-- Queue Track Items -->
            <div
              v-for="(track, index) in queue"
              :key="track.id || index"
              :class="[
                'flex items-center gap-3 p-2.5 rounded-lg transition-colors',
                index === 0 ? 'bg-spotify-green/10' : 'hover:bg-spotify-highlight'
              ]"
            >
              <!-- Track Image -->
              <img
                v-if="track.image"
                :src="track.image"
                :alt="track.name"
                class="w-12 h-12 rounded object-cover flex-shrink-0"
              />
              <div v-else class="w-12 h-12 bg-spotify-highlight rounded flex items-center justify-center flex-shrink-0">
                <Icon name="heroicons:musical-note" class="w-6 h-6 text-spotify-subdued" />
              </div>

              <!-- Track Info -->
              <div class="flex-1 min-w-0">
                <p v-if="index === 0" class="text-spotify-green text-[10px] font-bold uppercase tracking-widest">
                  À suivre
                </p>
                <p
                  :class="['font-medium truncate', index === 0 ? 'text-spotify-green' : 'text-white']"
                >
                  {{ track.name }}
                </p>
                <p class="text-spotify-subdued text-sm truncate">
                  {{ track.artists?.join(', ') || 'Artiste inconnu' }}
                </p>
                <p v-if="track.addedBy" class="text-spotify-subdued/60 text-xs mt-0.5">
                  Ajouté par {{ track.addedBy }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Queue Actions -->
        <div class="px-6 py-4 border-t border-white/5 flex-shrink-0">
          <div class="flex justify-between items-center">
            <button
              v-if="queue.length > 0"
              @click="clearQueue"
              class="text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              Vider la file
            </button>
            <span v-else></span>
            <button
              @click="refreshQueue"
              :disabled="refreshing"
              class="text-spotify-subdued hover:text-white text-sm transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Icon
                name="heroicons:arrow-path"
                :class="['w-4 h-4', refreshing ? 'animate-spin' : '']"
              />
              Actualiser
            </button>
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
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  queue: () => [],
  groupId: undefined,
  isOpen: false
})

const emit = defineEmits<{
  close: []
  refresh: []
  clear: []
}>()

// State
const refreshing = ref(false)

// Methods
const closeDrawer = () => {
  emit('close')
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
    if (e.key === 'Escape' && props.isOpen) {
      closeDrawer()
    }
  }
  document.addEventListener('keydown', handleEscape)

  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape)
  })
})
</script>
