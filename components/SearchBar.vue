<template>
  <div class="relative w-full">
    <!-- Search Input -->
    <div class="relative">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon name="heroicons:magnifying-glass" class="h-5 w-5 text-gray-400" />
      </div>
      
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="placeholder"
        class="spotify-input w-full pl-10 pr-10"
        @focus="showResults = true"
        @blur="handleBlur"
      />
      
      <!-- Clear Button -->
      <button
        v-if="searchQuery"
        @click="clearSearch"
        class="absolute inset-y-0 right-0 pr-3 flex items-center"
      >
        <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
      </button>
    </div>

    <!-- Loading Indicator -->
    <div
      v-if="loading"
      class="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-b-md p-4 z-50"
    >
      <div class="flex items-center justify-center">
        <Icon name="heroicons:arrow-path" class="w-5 h-5 animate-spin text-green-500 mr-2" />
        <span class="text-gray-400">Searching...</span>
      </div>
    </div>

    <!-- Search Results Dropdown -->
    <div
      v-if="showResults && searchResults.length > 0"
      class="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-b-md max-h-80 overflow-y-auto z-50"
    >
      <div
        v-for="track in searchResults"
        :key="track.id"
        @click="selectTrack(track)"
        class="flex items-center p-3 hover:bg-gray-700 cursor-pointer transition-colors"
      >
        <!-- Track Image -->
        <img
          v-if="track.album?.images?.[2]?.url"
          :src="track.album.images[2].url"
          :alt="track.name"
          class="w-12 h-12 rounded object-cover mr-3"
        />
        <div v-else class="w-12 h-12 bg-gray-600 rounded mr-3 flex items-center justify-center">
          <Icon name="heroicons:musical-note" class="w-6 h-6 text-gray-400" />
        </div>

        <!-- Track Info -->
        <div class="flex-1 min-w-0">
          <h4 class="text-white font-medium truncate">{{ track.name }}</h4>
          <p class="text-gray-400 text-sm truncate">
            {{ track.artists?.map(a => a.name).join(', ') }}
          </p>
        </div>

        <!-- Add Button -->
        <button
          class="ml-3 p-2 text-green-500 hover:text-green-400 transition-colors"
          @click.stop="addToQueue(track)"
        >
          <Icon name="heroicons:plus" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- No Results -->
    <div
      v-if="showResults && searchQuery && !loading && searchResults.length === 0"
      class="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-b-md p-4 z-50"
    >
      <p class="text-gray-400 text-center">No tracks found</p>
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
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  showResults.value = false
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
})
</script>