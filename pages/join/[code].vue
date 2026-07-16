<template>
  <div class="spotify-main min-h-screen flex items-center justify-center px-4 py-12">
    <div class="max-w-md w-full mx-auto text-center">
      <!-- Logo/Title -->
      <div class="mb-10">
        <h1 class="text-4xl font-extrabold tracking-tighter text-white mb-4">
          <span class="text-spotify-green">I</span>FY
        </h1>
        <p class="text-spotify-subdued">Rejoindre le groupe</p>
        <p class="text-spotify-green font-mono font-bold text-2xl tracking-[0.3em] mt-2">{{ groupCode }}</p>
      </div>

      <!-- Guest Name Form -->
      <div v-if="!joining" class="space-y-6">
        <div>
          <input
            v-model="guestName"
            type="text"
            placeholder="Votre nom"
            class="spotify-input w-full text-center"
            maxlength="30"
            @keyup.enter="joinAsGuest"
          />
        </div>

        <button
          @click="joinAsGuest"
          :disabled="!guestName.trim() || joining"
          class="spotify-button w-full"
        >
          Rejoindre {{ groupCode }}
        </button>

        <div v-if="error" class="text-red-400 text-sm">
          {{ error }}
        </div>
      </div>

      <!-- Joining State -->
      <div v-else class="space-y-4">
        <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin mx-auto text-spotify-green" />
        <p class="text-spotify-subdued">Connexion au groupe...</p>
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