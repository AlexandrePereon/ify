<template>
  <div class="spotify-main h-screen overflow-hidden">
    <div class="container mx-auto px-4 py-4 max-w-lg h-full flex flex-col">
      <!-- Search Bar with Disconnect Button -->
      <div class="flex items-center gap-3 mb-4 flex-shrink-0">
        <div class="flex-1">
          <SearchBar
            :group-id="groupId"
            placeholder="Search for tracks to add..."
            @track-added="handleTrackAdded"
          />
        </div>
        <button
          @click="leaveGroup"
          class="text-gray-400 hover:text-red-400 transition-colors p-3 rounded-lg hover:bg-gray-800/50"
        >
          <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-5 h-5" />
        </button>
      </div>

      <!-- Current Track Display -->
      <div class="flex-1 flex flex-col justify-center">
        <CurrentTrack
          :track="currentTrack"
          :loading="trackLoading"
        />
      </div>

      <!-- Next Button -->
      <div class="flex justify-center pb-4 flex-shrink-0">
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
        :queue="queue"
        :group-id="groupId"
        @refresh="refreshQueue"
        @clear="clearQueue"
        @show-share="showShareModal = true"
      />
      
      <!-- Group Code Modal -->
      <GroupCodeModal
        :is-open="showShareModal"
        :group-code="group?.code || ''"
        :group-id="groupId"
        @close="showShareModal = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// Get route params
const route = useRoute()
const groupId = route.params.id as string

// Auth
const { status, data, signOut } = useAuth()

// State
const group = ref(null)
const currentTrack = ref(null)
const trackLoading = ref(false)
const skipVotes = ref(0)
const showShareModal = ref(false)

// Queue data
const queue = ref([])

// Group SSE connection
const groupSSE = ref(null)

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
    // Silent fail
  }
}

const refreshCurrentTrack = async () => {
  trackLoading.value = true
  try {
    const response = await $fetch(`/api/groups/${groupId}/current-track`)
    if (response.success) {
      currentTrack.value = response.currentTrack
    }
  } catch (error) {
    // Silent fail
  } finally {
    trackLoading.value = false
  }
}

const initializeGroupConnection = async () => {
  if (process.client && status.value === 'authenticated') {
    const userId = data.value?.user?.id || data.value?.user?.email
    
    if (!userId) {
      return
    }

    // Initialize Group SSE with clean callbacks
    groupSSE.value = useGroupSSE({
      groupId,
      userId,
      onPlaybackUpdate: (playbackData) => {
        currentTrack.value = playbackData.currentTrack
      },
      onQueueUpdate: (queueData) => {
        queue.value = queueData.queue.map(track => ({
          id: track.id,
          name: track.name,
          artists: track.artists?.map(a => a.name) || [],
          image: track.album?.images?.[0]?.url,
          uri: track.uri
        }))
      },
      onGroupState: (groupData) => {
        group.value = groupData
      },
      onTrackAdded: (trackData) => {
        // Could show a toast notification here
      },
      onVoteUpdate: (voteData) => {
        skipVotes.value = voteData.skipVotes
      },
      onGroupDeleted: (deletedData) => {
        // Group has been deleted by admin, disconnect and redirect
        handleGroupDeleted(deletedData.message)
      },
      onError: (error) => {
        console.error('Group SSE connection error:', error)
      }
    })

    // Join group and connect SSE
    try {
      const joinResult = await groupSSE.value.joinGroup()
      if (joinResult.success) {
        group.value = joinResult.group
        
        // Connect to SSE stream
        groupSSE.value.connect()
      }
    } catch (error) {
      // If group not found or access denied, redirect to home
      if (error.data?.statusCode === 404 || error.data?.statusCode === 403) {
        await navigateTo('/')
      }
    }
  }
}

const disconnectGroupConnection = async () => {
  if (groupSSE.value) {
    try {
      // Leave group and disconnect SSE
      await groupSSE.value.leaveGroup()
      groupSSE.value.disconnect()
      groupSSE.value = null
    } catch (error) {
      // Silent fail
    }
  }
}

const handleTrackAdded = async (track: any) => {
  if (groupSSE.value) {
    try {
      await groupSSE.value.notifyTrackAdded(track, data.value?.user?.name || 'Anonymous')
    } catch (error) {
      console.warn('Failed to notify track added:', error)
    }
  }
}

const handleVoteUpdate = async (result: any) => {
  skipVotes.value = result.skipVotes
  
  if (groupSSE.value) {
    try {
      await groupSSE.value.notifyVoteUpdate(result)
    } catch (error) {
      console.warn('Failed to notify vote update:', error)
    }
  }
}

const handleSkipped = () => {
  skipVotes.value = 0
  // Refresh current track after skip
  setTimeout(() => {
    refreshCurrentTrack()
  }, 1000)
}

const refreshQueue = async () => {
  try {
    const response = await $fetch(`/api/groups/${groupId}/queue`)
    if (response.success) {
      queue.value = response.queue.map(track => ({
        id: track.id,
        name: track.name,
        artists: track.artists?.map(a => a.name) || [],
        image: track.album?.images?.[0]?.url,
        uri: track.uri
      }))
    }
  } catch (error) {
    // Silent fail
  }
}

const clearQueue = () => {
  queue.value = []
}

const handleGroupDeleted = async (message: string) => {
  try {
    // Disconnect from group
    await disconnectGroupConnection()
    
    // Sign out from auth system (group is already deleted server-side)
    await signOut({ redirect: false })
    
    // Redirect to home
    await navigateTo('/')
  } catch (error) {
    // Fallback: force signout and redirect
    await signOut({ redirect: false })
    await navigateTo('/')
  }
}

const leaveGroup = async () => {
  try {
    // Disconnect from group first
    await disconnectGroupConnection()
    
    // Call logout API to handle cleanup
    await $fetch('/api/auth/logout', {
      method: 'POST'
    })
    
    // Sign out from auth system
    await signOut({ redirect: false })
    
    // Redirect to home
    await navigateTo('/')
  } catch (error) {
    // Fallback: force signout and redirect
    await signOut({ redirect: false })
    await navigateTo('/')
  }
}

// Load initial data
onMounted(() => {
  if (status.value === 'authenticated') {
    loadGroup()
    refreshCurrentTrack()
    refreshQueue()
    initializeGroupConnection()
  }
})

// Cleanup
onUnmounted(() => {
  disconnectGroupConnection()
})

// Redirect if not authenticated
watch(status, (newStatus) => {
  if (newStatus === 'unauthenticated') {
    navigateTo('/')
  }
})
</script>