<template>
  <div class="spotify-main min-h-screen flex items-center justify-center px-4 py-12">
    <div class="max-w-md w-full mx-auto text-center">
      <!-- Logo/Title -->
      <div class="mb-12">
        <h1 class="text-6xl font-extrabold tracking-tighter text-white mb-4 drop-shadow-[0_0_30px_rgba(29,185,84,0.35)]">
          <span class="text-spotify-green">I</span>FY
        </h1>
        <p class="text-spotify-subdued text-lg">
          Écoutez Spotify ensemble, en temps réel
        </p>
      </div>

      <!-- Authentication Status -->
      <div v-if="status === 'loading'" class="mb-8">
        <div class="text-white">
          <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin mx-auto mb-2 text-spotify-green" />
          <p class="text-spotify-subdued">Chargement...</p>
        </div>
      </div>

      <!-- Not authenticated -->
      <div v-else-if="status === 'unauthenticated'" class="space-y-6">
        <button
          class="spotify-button w-full"
          @click="createSpotifyGroup"
        >
          <Icon name="simple-icons:spotify" class="w-5 h-5" />
          <span>Créer un groupe via Spotify</span>
        </button>

        <div class="flex items-center">
          <div class="flex-1 h-px bg-white/10"/>
          <span class="px-4 text-spotify-subdued text-sm">ou</span>
          <div class="flex-1 h-px bg-white/10"/>
        </div>

        <button
          class="spotify-button-secondary w-full"
          @click="() => navigateTo('/join')"
        >
          Rejoindre un groupe
        </button>
      </div>

      <!-- Authenticated - Show options -->
      <div v-else-if="status === 'authenticated'" class="space-y-6">
        <UserChip
          :name="data?.user?.name || data?.user?.email || 'Utilisateur'"
          :image="data?.user?.image"
          :type="data?.user?.type || 'spotify'"
          label="Connecté en tant que"
          class="mb-8"
        />

        <!-- Create Group Button (only for Spotify users) -->
        <button
          v-if="data?.user?.type !== 'guest'"
          class="spotify-button w-full"
          @click="createSpotifyGroup"
        >
          <Icon name="simple-icons:spotify" class="w-5 h-5" />
          <span>Créer un nouveau groupe</span>
        </button>

        <div v-if="data?.user?.type !== 'guest'" class="flex items-center">
          <div class="flex-1 h-px bg-white/10"/>
          <span class="px-4 text-spotify-subdued text-sm">ou</span>
          <div class="flex-1 h-px bg-white/10"/>
        </div>

        <button
          class="spotify-button-secondary w-full"
          @click="() => navigateTo('/join')"
        >
          Rejoindre un groupe
        </button>

        <!-- Disconnect link -->
        <button
          class="mt-10 inline-flex items-center gap-2 text-sm text-spotify-subdued hover:text-white transition-colors"
          @click="() => signOut({ redirect: false })"
        >
          <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-4 h-4" />
          Se déconnecter
        </button>
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