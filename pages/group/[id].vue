<template>
  <div class="spotify-main min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-lg">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-white mb-1">
            {{ group?.name || 'Loading...' }}
          </h1>
          <p class="text-gray-400 text-sm">
            Code: <span class="font-mono text-green-500">{{ group?.code }}</span>
          </p>
        </div>
        <button
          @click="leaveGroup"
          class="text-gray-400 hover:text-red-400 transition-colors p-2"
        >
          <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-5 h-5" />
        </button>
      </div>

      <!-- Search Bar -->
      <div class="mb-8">
        <SearchBar
          :group-id="groupId"
          placeholder="Search for tracks to add..."
          @track-added="handleTrackAdded"
        />
      </div>

      <!-- Current Track Display -->
      <div class="mb-8">
        <CurrentTrack
          :track="currentTrack"
          :is-playing="isPlaying"
          :loading="trackLoading"
        />
      </div>

      <!-- Next Button -->
      <div class="flex justify-center mb-8">
        <NextButton
          :group-id="groupId"
          :skip-votes="skipVotes"
          :total-members="group?.members?.length || 1"
          :show-vote-counter="skipVotes > 0"
          @voted="handleVoteUpdate"
          @skipped="handleSkipped"
        />
      </div>

      <!-- Queue Drawer -->
      <QueueDrawer
        :queue="mockQueue"
        :group-id="groupId"
        @refresh="refreshCurrentTrack"
        @clear="clearQueue"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// Get route params
const route = useRoute()
const groupId = route.params.id as string

// Auth
const { status, data } = useAuth()

// State
const group = ref(null)
const currentTrack = ref(null)
const isPlaying = ref(false)
const trackLoading = ref(false)
const skipVotes = ref(0)

// Mock queue data (will be replaced with real Spotify queue)
const mockQueue = ref([])

// Metadata
useHead({
  title: `Group ${group.value?.code || groupId} - IFY`,
  meta: [
    { name: 'description', content: 'Spotify group listening session' }
  ]
})

// Methods
const loadGroup = async () => {
  try {
    // Mock data for now
    group.value = {
      id: groupId,
      code: 'ABC123',
      name: `${data.value?.user?.name || 'User'}'s Group`,
      admin: {
        id: data.value?.user?.email,
        name: data.value?.user?.name
      },
      members: [
        {
          id: data.value?.user?.email,
          name: data.value?.user?.name,
          image: data.value?.user?.image
        }
      ]
    }
  } catch (error) {
    console.error('Error loading group:', error)
  }
}

const refreshCurrentTrack = async () => {
  trackLoading.value = true
  try {
    const response = await $fetch(`/api/groups/${groupId}/current-track`)
    if (response.success) {
      currentTrack.value = response.currentTrack
      isPlaying.value = response.isPlaying
    }
  } catch (error) {
    console.error('Failed to load current track:', error)
  } finally {
    trackLoading.value = false
  }
}

const handleTrackAdded = (track: any) => {
  // Optional: Show notification or update UI
  console.log('Track added:', track.name)
}

const handleVoteUpdate = (result: any) => {
  skipVotes.value = result.skipVotes
}

const handleSkipped = () => {
  skipVotes.value = 0
  // Refresh current track after skip
  setTimeout(() => {
    refreshCurrentTrack()
  }, 1000)
}

const clearQueue = () => {
  mockQueue.value = []
}

const leaveGroup = async () => {
  await navigateTo('/')
}

// Load initial data
onMounted(() => {
  if (status.value === 'authenticated') {
    loadGroup()
    refreshCurrentTrack()
    // TODO: Initialize WebSocket connection
  }
})

// Cleanup
onUnmounted(() => {
  // TODO: Close WebSocket connection
})

// Redirect if not authenticated
watch(status, (newStatus) => {
  if (newStatus === 'unauthenticated') {
    navigateTo('/')
  }
})
</script>