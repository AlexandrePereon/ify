<template>
  <div class="spotify-main h-screen overflow-hidden">
    <div class="container mx-auto px-4 py-16 h-full">
      <div class="max-w-md mx-auto text-center">
        <!-- Logo/Title -->
        <div class="mb-12">
          <h1 class="text-6xl font-bold text-white mb-4">
            <span class="text-green-500">I</span>FY
          </h1>
          <p class="text-gray-400 text-lg">
            Écoutez Spotify ensemble, en temps réel
          </p>
        </div>

        <!-- Authentication Status -->
        <div v-if="status === 'loading'" class="mb-8">
          <div class="text-white">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Chargement...</p>
          </div>
        </div>

        <!-- Not authenticated -->
        <div v-else-if="status === 'unauthenticated'" class="space-y-6">
          <button
            @click="createSpotifyGroup"
            class="spotify-button w-full"
          >
            <Icon name="simple-icons:spotify" class="w-5 h-5" />
            <span>Créer un groupe via Spotify</span>
          </button>
          
          <div class="text-center">
            <div class="flex items-center mb-4">
              <div class="flex-1 h-px bg-gray-600"></div>
              <span class="px-4 text-gray-400 text-sm">ou</span>
              <div class="flex-1 h-px bg-gray-600"></div>
            </div>
            
            <button
              @click="() => navigateTo('/join')"
              class="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              Rejoindre un groupe
            </button>
          </div>
        </div>

        <!-- Authenticated - Show options -->
        <div v-else-if="status === 'authenticated'" class="space-y-6">
          <div class="mb-6 p-4 bg-gray-900 rounded-lg">
            <div class="text-center">
              <p class="text-white mb-2">Connecté en tant que :</p>
              <p class="text-green-500 font-semibold">{{ data?.user?.name || data?.user?.email }}</p>
              <div class="flex items-center justify-center mt-2">
                <Icon
                  :name="data?.user?.type === 'guest' ? 'heroicons:user' : 'simple-icons:spotify'"
                  :class="data?.user?.type === 'guest' ? 'w-4 h-4 text-gray-400' : 'w-4 h-4 text-green-500'"
                />
                <span class="ml-2 text-sm text-gray-400">
                  {{ data?.user?.type === 'guest' ? 'Invité' : 'Spotify' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Disconnect Button -->
          <button
            @click="() => signOut({ redirect: false })"
            class="w-full mb-6 px-4 py-2 text-gray-400 hover:text-red-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-600"
          >
            <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-4 h-4 inline mr-2" />
            Se déconnecter
          </button>

          <!-- Create Group Button (only for Spotify users) -->
          <button
            v-if="data?.user?.type !== 'guest'"
            @click="createSpotifyGroup"
            class="spotify-button w-full"
          >
            <Icon name="simple-icons:spotify" class="w-5 h-5" />
            <span>Créer un nouveau groupe</span>
          </button>

          <div class="text-center">
            <div v-if="data?.user?.type !== 'guest'" class="flex items-center mb-4">
              <div class="flex-1 h-px bg-gray-600"></div>
              <span class="px-4 text-gray-400 text-sm">ou</span>
              <div class="flex-1 h-px bg-gray-600"></div>
            </div>

            <button
              @click="() => navigateTo('/join')"
              class="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              Rejoindre un groupe
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Authentication
const { status, data, signIn, signOut } = useAuth()

// State to track if we should create group after auth
const shouldCreateGroup = ref(false)

// Auto-create group when authenticated (only if requested)
watch(status, async (newStatus) => {
  if (newStatus === 'authenticated' && data.value?.user && shouldCreateGroup.value) {
    shouldCreateGroup.value = false
    await createGroupAndRedirect()
  }
})

// Check if already authenticated on page load (but don't auto-create group)
onMounted(() => {
  // Just let authenticated users stay on homepage unless they want to create a group
})

// Metadata
useHead({
  title: 'IFY - Listen to Spotify Together',
  meta: [
    { name: 'description', content: 'Create shared Spotify listening groups with your friends' }
  ]
})

// State
const creatingGroup = ref(false)

// Methods
const createSpotifyGroup = async () => {
  if (status.value === 'unauthenticated') {
    // Set flag to create group after auth
    shouldCreateGroup.value = true
    await signIn('spotify')
  } else {
    // Already authenticated, create group directly
    await createGroupAndRedirect()
  }
}

const createGroupAndRedirect = async () => {
  if (status.value !== 'authenticated') return

  try {
    const response = await $fetch('/api/groups/create', {
      method: 'POST'
    })

    if (response.success) {
      await navigateTo(`/group/${response.group.id}`)
    }
  } catch (error) {
    console.error('Error creating group:', error)
  }
}
</script>