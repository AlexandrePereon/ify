<template>
  <div class="relative w-full">
    <!-- Search Input -->
    <div class="relative">
      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Icon name="heroicons:magnifying-glass" class="h-5 w-5 text-spotify-subdued" />
      </div>

      <input
        v-model="searchQuery"
        type="text"
        :placeholder="placeholder"
        class="spotify-input w-full pl-11 pr-11"
        @focus="showResults = true"
        @blur="handleBlur"
      />

      <!-- Clear Button -->
      <button
        v-if="searchQuery"
        @click="clearSearch"
        class="absolute inset-y-0 right-0 pr-4 flex items-center"
      >
        <Icon name="heroicons:x-mark" class="h-5 w-5 text-spotify-subdued hover:text-white transition-colors" />
      </button>
    </div>

    <!-- Loading Indicator -->
    <div
      v-if="loading"
      class="absolute top-full left-0 right-0 mt-2 bg-spotify-elevated border border-white/5 rounded-xl shadow-2xl shadow-black/60 p-4 z-50"
    >
      <div class="flex items-center justify-center">
        <Icon name="heroicons:arrow-path" class="w-5 h-5 animate-spin text-spotify-green mr-2" />
        <span class="text-spotify-subdued">Recherche...</span>
      </div>
    </div>

    <!-- Search Results Dropdown -->
    <div
      v-if="showResults && searchResults.length > 0"
      class="absolute top-full left-0 right-0 mt-2 bg-spotify-elevated border border-white/5 rounded-xl shadow-2xl shadow-black/60 max-h-80 overflow-y-auto z-50 p-1"
    >
      <div
        v-for="track in searchResults"
        :key="track.id"
        @click="selectTrack(track)"
        class="flex items-center p-2.5 rounded-lg hover:bg-spotify-press cursor-pointer transition-colors group"
      >
        <!-- Track Image -->
        <img
          v-if="track.album?.images?.[2]?.url"
          :src="track.album.images[2].url"
          :alt="track.name"
          class="w-12 h-12 rounded object-cover mr-3"
        />
        <div v-else class="w-12 h-12 bg-spotify-highlight rounded mr-3 flex items-center justify-center">
          <Icon name="heroicons:musical-note" class="w-6 h-6 text-spotify-subdued" />
        </div>

        <!-- Track Info -->
        <div class="flex-1 min-w-0">
          <h4 class="text-white font-medium truncate">{{ track.name }}</h4>
          <p class="text-spotify-subdued text-sm truncate">
            {{ track.artists?.map(a => a.name).join(', ') }}
          </p>
        </div>

        <!-- Add Button -->
        <button
          class="ml-3 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-spotify-subdued hover:bg-spotify-green hover:text-black transition-colors"
          title="Ajouter à la file"
          @click.stop="addToQueue(track)"
        >
          <Icon name="heroicons:plus" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- No Results -->
    <div
      v-if="showResults && searchQuery && !loading && searchResults.length === 0 && !errorMessage"
      class="absolute top-full left-0 right-0 mt-2 bg-spotify-elevated border border-white/5 rounded-xl shadow-2xl shadow-black/60 p-4 z-50"
    >
      <p class="text-spotify-subdued text-center">Aucun titre trouvé</p>
    </div>

    <!-- Error / rate-limit feedback -->
    <div
      v-if="errorMessage"
      class="absolute top-full left-0 right-0 mt-2 bg-spotify-elevated border border-red-500/50 rounded-xl shadow-2xl shadow-black/60 p-3 z-50"
    >
      <p class="text-red-400 text-sm text-center">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Track {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    images: Array<{ url: string }>
  }
  uri: string
}

interface Props {
  groupId: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search for tracks...'
})

const emit = defineEmits<{
  trackAdded: [track: Track]
}>()

// State
const searchQuery = ref('')
const searchResults = ref<Track[]>([])
const showResults = ref(false)
const loading = ref(false)
const searchTimeout = ref<NodeJS.Timeout>()
const errorMessage = ref('')
const errorTimeout = ref<NodeJS.Timeout>()

// Show a transient error/info message (auto-clears).
const flashError = (message: string) => {
  errorMessage.value = message
  showResults.value = true
  if (errorTimeout.value) clearTimeout(errorTimeout.value)
  errorTimeout.value = setTimeout(() => {
    errorMessage.value = ''
  }, 3000)
}

// Turn an API failure into a user-facing message (429 = rate limited).
const messageForError = (error: any, fallback: string) => {
  if (error?.statusCode === 429 || error?.data?.statusCode === 429) {
    return 'Trop de requêtes, réessaie dans un instant.'
  }
  return fallback
}

// Debounced search
watch(searchQuery, (newQuery) => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  if (!newQuery.trim()) {
    searchResults.value = []
    showResults.value = false
    return
  }

  searchTimeout.value = setTimeout(async () => {
    await performSearch(newQuery.trim())
  }, 300) // 300ms debounce
})

// Methods
const performSearch = async (query: string) => {
  if (!query) return

  loading.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch(`/api/groups/${props.groupId}/search`, {
      query: { q: query }
    })

    if (response.success) {
      searchResults.value = response.tracks
      showResults.value = true
    }
  } catch (error) {
    console.error('Search failed:', error)
    searchResults.value = []
    flashError(messageForError(error, 'La recherche a échoué. Réessaie.'))
  } finally {
    loading.value = false
  }
}

const selectTrack = (track: Track) => {
  // Optional: Auto-add track when clicked
  addToQueue(track)
}

const addToQueue = async (track: Track) => {
  try {
    const response = await $fetch(`/api/groups/${props.groupId}/add-to-queue`, {
      method: 'POST',
      body: { trackUri: track.uri }
    })

    if (response.success) {
      emit('trackAdded', track)
      // Clear search after successful add
      clearSearch()
    }
  } catch (error) {
    console.error('Failed to add track:', error)
    flashError(messageForError(error, "Impossible d'ajouter ce titre."))
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  showResults.value = false
  errorMessage.value = ''
}

const handleBlur = () => {
  // Delay hiding results to allow clicks
  setTimeout(() => {
    showResults.value = false
  }, 200)
}

// Cleanup on unmount
onUnmounted(() => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  if (errorTimeout.value) {
    clearTimeout(errorTimeout.value)
  }
})
</script>