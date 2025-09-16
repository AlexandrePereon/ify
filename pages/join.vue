<template>
  <div class="spotify-main">
    <div class="container mx-auto px-4 py-16">
      <div class="max-w-md mx-auto text-center">
        <!-- Back to home -->
        <div class="mb-8 text-left">
          <NuxtLink
            to="/"
            class="text-gray-400 hover:text-white transition-colors flex items-center space-x-2"
          >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            <span>Retour</span>
          </NuxtLink>
        </div>

        <!-- Logo/Title -->
        <div class="mb-12">
          <h1 class="text-4xl font-bold text-white mb-4">
            Rejoindre un groupe
          </h1>
          <p class="text-gray-400">
            Entrez le code de groupe partagé par votre ami
          </p>
        </div>

        <!-- Code Input -->
        <div class="space-y-6">
          <div>
            <input
              v-model="groupCode"
              type="text"
              placeholder="ABC123"
              class="spotify-input w-full text-center text-2xl font-bold uppercase tracking-widest"
              maxlength="6"
              @keyup.enter="joinGroup"
            />
            <p class="text-xs text-gray-500 mt-2">
              Code à 6 caractères fourni par l'organisateur
            </p>
          </div>

          <button
            @click="joinGroup"
            :disabled="!isValidCode || joining"
            class="spotify-button w-full"
          >
            <Icon
              v-if="joining"
              name="heroicons:arrow-path"
              class="w-5 h-5 animate-spin"
            />
            <Icon
              v-else
              name="heroicons:user-plus"
              class="w-5 h-5"
            />
            <span>{{ joining ? 'Connexion...' : 'Rejoindre le groupe' }}</span>
          </button>

          <!-- Error message -->
          <div
            v-if="error"
            class="text-red-400 text-sm bg-red-900/20 rounded-lg p-3"
          >
            {{ error }}
          </div>
        </div>

        <!-- Or create group -->
        <div class="mt-12 pt-8 border-t border-gray-800">
          <p class="text-gray-400 mb-4">Pas de code ?</p>
          <NuxtLink
            to="/"
            class="spotify-button-secondary"
          >
            Créer un nouveau groupe
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Metadata
useHead({
  title: 'Rejoindre un groupe - IFY',
  meta: [
    { name: 'description', content: 'Rejoignez un groupe d\'écoute Spotify avec un code' }
  ]
})

// State
const groupCode = ref('')
const joining = ref(false)
const error = ref('')

// Computed
const isValidCode = computed(() => {
  return groupCode.value.trim().length === 6
})

// Methods
const joinGroup = async () => {
  if (!isValidCode.value) return

  joining.value = true
  error.value = ''

  try {
    // TODO: Implement join group logic
    console.log('Joining group:', groupCode.value)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Navigate to group page (will be implemented later)
    await navigateTo(`/group/${groupCode.value.trim().toLowerCase()}`)
  } catch (err) {
    error.value = 'Groupe introuvable ou code invalide'
    console.error('Erreur en rejoignant le groupe:', err)
  } finally {
    joining.value = false
  }
}

// Auto-format code (uppercase, limit length)
watch(groupCode, (newValue) => {
  // Remove non-alphanumeric characters and convert to uppercase
  const cleaned = newValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (cleaned !== newValue) {
    groupCode.value = cleaned
  }
})
</script>