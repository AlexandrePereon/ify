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
        <div v-else-if="status === 'unauthenticated'" class="space-y-4">
          <p class="text-gray-400 mb-6">
            Connectez-vous à Spotify pour commencer
          </p>
          <button
            @click="() => signIn('spotify')"
            class="spotify-button w-full"
          >
            <Icon name="simple-icons:spotify" class="w-5 h-5" />
            <span>Se connecter avec Spotify</span>
          </button>
        </div>

        <!-- Authenticated - Auto redirect -->
        <div v-else-if="status === 'authenticated'" class="space-y-4">
          <div class="mb-6 p-4 bg-gray-900 rounded-lg">
            <p class="text-white mb-2">Création de votre groupe d'écoute...</p>
            <p class="text-green-500 font-semibold">{{ data?.user?.name || data?.user?.email }}</p>
          </div>

          <div class="text-center">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin mx-auto mb-2 text-green-500" />
            <p class="text-gray-400">Préparation de votre session Spotify...</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Authentication
const { status, data, signIn, signOut } = useAuth()


// Auto-create group when authenticated
watch(status, async (newStatus) => {
  if (newStatus === 'authenticated' && data.value?.user) {
    await createGroupAndRedirect()
  }
})

// Check if already authenticated on page load
onMounted(() => {
  if (status.value === 'authenticated' && data.value?.user) {
    createGroupAndRedirect()
  }
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