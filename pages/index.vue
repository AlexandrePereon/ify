<template>
  <div class="spotify-main">
    <div class="container mx-auto px-4 py-16">
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

        <!-- Authenticated -->
        <div v-else-if="status === 'authenticated'" class="space-y-4">
          <div class="mb-6 p-4 bg-gray-900 rounded-lg">
            <p class="text-white mb-2">Connecté en tant que</p>
            <p class="text-green-500 font-semibold">{{ data?.user?.name || data?.user?.email }}</p>
          </div>

          <!-- Main Actions -->
          <button
            @click="createGroup"
            class="spotify-button w-full"
            :disabled="creatingGroup"
          >
            <Icon
              v-if="creatingGroup"
              name="heroicons:arrow-path"
              class="w-5 h-5 animate-spin"
            />
            <Icon
              v-else
              name="heroicons:plus"
              class="w-5 h-5"
            />
            <span>{{ creatingGroup ? 'Création...' : 'Créer un groupe d\'écoute' }}</span>
          </button>

          <button
            @click="() => signOut()"
            class="w-full px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-5 h-5" />
            <span>Se déconnecter</span>
          </button>
        </div>

        <!-- Join Group Link -->
        <div class="mt-12 pt-8 border-t border-gray-800">
          <NuxtLink
            to="/join"
            class="text-gray-400 hover:text-white transition-colors underline"
          >
            Rejoindre un groupe existant
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Authentication
const { status, data, signIn, signOut } = useAuth()

// Debug logs
console.log('🎯 CLIENT DEBUG:')
console.log('- Auth Status:', status.value)
console.log('- Auth Data:', data.value)
console.log('- Current URL:', window?.location?.href)

// Watch auth changes
watch(status, (newStatus) => {
  console.log('📈 Auth Status Changed:', newStatus)
})

watch(data, (newData) => {
  console.log('📊 Auth Data Changed:', newData)
})

// Metadata
useHead({
  title: 'IFY - Écouter Spotify ensemble',
  meta: [
    { name: 'description', content: 'Créez des groupes d\'écoute Spotify partagés avec vos amis' }
  ]
})

// State
const creatingGroup = ref(false)

// Methods
const createGroup = async () => {
  if (status.value !== 'authenticated') {
    return
  }

  creatingGroup.value = true
  try {
    // TODO: Call API to create group
    console.log('Creating group for user:', data.value?.user?.name)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Redirect to group page
    // await navigateTo('/group/abc123')
    alert('Fonctionnalité en développement - API groupe à implémenter')
  } catch (error) {
    console.error('Erreur lors de la création du groupe:', error)
  } finally {
    creatingGroup.value = false
  }
}
</script>