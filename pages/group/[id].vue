<template>
  <div class="spotify-main h-screen overflow-hidden relative">
    <!-- Ambient gradient from album art (Spotify-style) -->
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-[45vh] transition-opacity duration-700"
      :style="ambientStyle"
    />

    <div class="container mx-auto px-4 py-4 max-w-lg h-full flex flex-col relative">
      <!-- Search Bar -->
      <div class="mb-2 flex-shrink-0">
        <SearchBar
          :group-id="groupId"
          placeholder="Rechercher un titre à ajouter..."
          @track-added="handleTrackAdded"
        />
      </div>

      <!-- Current Track Display -->
      <div class="flex items-center justify-center py-4">
        <CurrentTrack
          :track="currentTrack"
          :loading="trackLoading"
          :is-playing="isPlaying"
          :progress-ms="progressMs"
        />
      </div>

      <!-- Next Button -->
      <div class="flex justify-center pb-2 flex-shrink-0">
        <NextButton
          :group-id="groupId"
          :skip-votes="skipVotes"
          :total-members="totalMembers"
          :show-vote-counter="skipVotes > 0"
          :has-voted="hasVoted"
          @voted="handleVoteUpdate"
          @skipped="handleSkipped"
        />
      </div>

      <!-- Bottom action bar (hidden while the drawer is open — it has its own close affordances) -->
      <div
        class="fixed bottom-0 inset-x-0 z-[45] pointer-events-none transition-opacity duration-200"
        :class="showQueue ? 'opacity-0' : ''"
      >
        <div class="max-w-lg mx-auto flex items-center justify-between px-6 pb-6 pt-2">
          <div class="flex items-center gap-3" :class="showQueue ? '' : 'pointer-events-auto'">
            <!-- Share (QR) -->
            <button
              class="group-action-button"
              title="Partager le groupe"
              @click="showShareModal = true"
            >
              <Icon name="heroicons:qr-code" class="w-5 h-5" />
            </button>

            <!-- Queue toggle -->
            <button
              class="group-action-button"
              title="File d'attente"
              @click="showQueue = true"
            >
              <Icon name="heroicons:queue-list" class="w-5 h-5" />
            </button>
          </div>

          <!-- Leave group -->
          <button
            class="group-action-button hover:text-red-400"
            :class="showQueue ? '' : 'pointer-events-auto'"
            title="Quitter le groupe"
            @click="leaveGroup"
          >
            <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Queue Drawer -->
      <QueueDrawer
        :queue="queue"
        :group-id="groupId"
        :is-open="showQueue"
        @close="showQueue = false"
        @refresh="refreshQueue"
        @clear="clearQueue"
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

<style scoped>
.group-action-button {
  @apply w-12 h-12 rounded-full flex items-center justify-center text-white bg-spotify-highlight/80 backdrop-blur-md shadow-lg shadow-black/40 transition-all duration-200 hover:scale-110 hover:bg-spotify-press;
}
</style>

<script setup lang="ts">
// Get route params
const route = useRoute()
const groupId = route.params.id as string

// Auth
const { status, data, signOut } = useAuth()

// State
const group = ref(null)
const currentTrack = ref<any>(null)
const trackLoading = ref(false)
const skipVotes = ref(0)
const totalMembers = ref(1)
const hasVoted = ref(false)
const showShareModal = ref(false)
const showQueue = ref(false)
const progressMs = ref<number | null>(null)
const isPlaying = ref(false)

// Ambient gradient extracted from the album art
const albumImageUrl = computed(() => currentTrack.value?.album?.images?.[0]?.url || null)
const { color: ambientColor } = useDominantColor(albumImageUrl)

const ambientStyle = computed(() => {
  if (!currentTrack.value) {
    return { opacity: 0 }
  }
  const tint = ambientColor.value
    ? ambientColor.value.replace('rgb(', 'rgba(').replace(')', ', 0.45)')
    : 'rgba(29, 185, 84, 0.25)'
  return {
    opacity: 1,
    background: `linear-gradient(to bottom, ${tint}, transparent)`
  }
})

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
      progressMs.value = response.progressMs ?? null
      isPlaying.value = response.isPlaying ?? false
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
      onPlaybackUpdate: (playbackData: any) => {
        currentTrack.value = playbackData.currentTrack
        if ('progressMs' in playbackData) {
          progressMs.value = playbackData.progressMs
          isPlaying.value = playbackData.isPlaying ?? false
        }
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
        // Ignore stale updates that don't carry the voter list.
        if (!voteData.votedUserIds) {
          return
        }

        skipVotes.value = voteData.skipVotes
        totalMembers.value = voteData.totalMembers
        const currentUserId = data.value?.user?.id || data.value?.user?.email
        hasVoted.value = voteData.votedUserIds.includes(currentUserId)
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
        totalMembers.value = joinResult.group.members?.length || 1

        // Connect to SSE stream
        groupSSE.value.connect()
      }
    } catch (error) {
      // If group not found or access denied, redirect to home
      if (error.data?.statusCode === 404 || error.data?.statusCode === 403 ||
          (error.data?.statusCode === 500 && error.data?.statusMessage?.includes('Group not found'))) {
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

const handleVoteUpdate = async () => {
  // Nothing to do: the /skip endpoint already broadcasts the vote update over SSE.
}

const handleSkipped = () => {
  skipVotes.value = 0
  hasVoted.value = false
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

    // Call logout API to handle cleanup (but don't sign out Spotify users)
    const logoutResponse = await $fetch('/api/auth/logout', {
      method: 'POST'
    })

    // Only sign out guests, keep Spotify users authenticated
    if (logoutResponse.userType === 'guest') {
      await signOut({ redirect: false })
    }

    // Redirect to home
    await navigateTo('/')
  } catch (error) {
    // For guests, fallback to force signout
    // For Spotify users, just redirect
    if (data.value?.user?.type === 'guest') {
      await signOut({ redirect: false })
    }
    await navigateTo('/')
  }
}

const leaveGroup = async () => {
  try {
    // Disconnect from group first
    await disconnectGroupConnection()

    // Call logout API to handle cleanup (but don't sign out Spotify users)
    const logoutResponse = await $fetch('/api/auth/logout', {
      method: 'POST'
    })

    // Only sign out guests, keep Spotify users authenticated
    if (logoutResponse.userType === 'guest') {
      await signOut({ redirect: false })
    }

    // Redirect to home
    await navigateTo('/')
  } catch (error) {
    // For guests, fallback to force signout
    // For Spotify users, just redirect
    if (data.value?.user?.type === 'guest') {
      await signOut({ redirect: false })
    }
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