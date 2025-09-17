<template>
  <div class="spotify-main h-screen overflow-hidden">
    <div class="container mx-auto px-4 py-16 h-full">
      <div class="max-w-md mx-auto text-center">
        <!-- Logo/Title -->
        <div class="mb-8">
          <h1 class="text-4xl font-bold text-white mb-2">
            <span class="text-green-500">I</span>FY
          </h1>
          <p class="text-gray-400">
            Rejoindre le groupe <span class="text-green-500 font-mono">{{ groupCode }}</span>
          </p>
        </div>

        <!-- Guest Name Form -->
        <div v-if="!joining" class="space-y-6">
          <div>
            <input
              v-model="guestName"
              type="text"
              placeholder="Votre nom"
              class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center"
              maxlength="30"
              @keyup.enter="joinAsGuest"
            />
          </div>
          
          <button
            @click="joinAsGuest"
            :disabled="!guestName.trim() || joining"
            class="w-full px-4 py-3 bg-green-500 hover:bg-green-400 disabled:bg-gray-600 disabled:opacity-50 text-black font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            Rejoindre le groupe
          </button>

          <div v-if="error" class="text-red-400 text-sm">
            {{ error }}
          </div>
        </div>

        <!-- Joining State -->
        <div v-else class="space-y-4">
          <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin mx-auto text-green-500" />
          <p class="text-gray-400">Connexion au groupe...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { signIn } = useAuth()

// Get group code from route
const groupCode = route.params.code as string

// State
const guestName = ref('')
const joining = ref(false)
const error = ref('')

// Methods
const joinAsGuest = async () => {
  if (!guestName.value.trim()) return
  
  joining.value = true
  error.value = ''
  
  try {
    // Create guest session
    const response = await $fetch('/api/auth/guest', {
      method: 'POST',
      body: {
        name: guestName.value.trim(),
        groupCode: groupCode
      }
    })

    if (response.success) {
      // Sign in as guest using the auth system
      await signIn('credentials', {
        user: JSON.stringify(response.user),
        redirect: false
      })
      
      // Redirect to group using the REAL group ID
      await navigateTo(`/group/${response.group.id}`)
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Groupe introuvable ou erreur de connexion'
  } finally {
    joining.value = false
  }
}

// Metadata
useHead({
  title: `Rejoindre ${groupCode} - IFY`
})
</script>