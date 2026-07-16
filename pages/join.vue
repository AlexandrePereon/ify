<template>
  <div class="spotify-main min-h-screen px-4 py-10">
    <div class="max-w-md mx-auto text-center">
      <!-- Back to home -->
      <div class="mb-8 text-left">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 text-spotify-subdued hover:text-white transition-colors"
        >
          <Icon name="heroicons:arrow-left" class="w-4 h-4" />
          <span>Retour</span>
        </NuxtLink>
      </div>

      <!-- Logo/Title -->
      <div class="mb-10">
        <h1 class="text-4xl font-extrabold tracking-tighter text-white mb-2">
          <span class="text-spotify-green">I</span>FY
        </h1>
        <p class="text-spotify-subdued">
          Rejoindre un groupe
        </p>
      </div>


      <!-- QR Scanner (Mobile priority) -->
      <div v-if="!joining && showQRScanner && !groupCode" class="space-y-6">
        <!-- Camera View -->
        <div class="relative spotify-card overflow-hidden rounded-2xl">
          <QrcodeStream
            @detect="onDetect"
            @error="onError"
            @camera-on="onCameraReady"
            @camera-off="onCameraOff"
            class="w-full aspect-square object-cover"
          />

          <!-- Viewfinder overlay -->
          <div v-if="!cameraError" class="absolute inset-10 pointer-events-none">
            <span class="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-spotify-green rounded-tl-2xl"></span>
            <span class="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-spotify-green rounded-tr-2xl"></span>
            <span class="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-spotify-green rounded-bl-2xl"></span>
            <span class="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-spotify-green rounded-br-2xl"></span>
          </div>

          <!-- Error overlay -->
          <div v-if="cameraError" class="absolute inset-0 flex items-center justify-center bg-spotify-elevated/95">
            <div class="text-center text-spotify-subdued px-6">
              <Icon name="heroicons:exclamation-triangle" class="w-12 h-12 mx-auto mb-2" />
              <p class="text-sm mb-3">{{ cameraError }}</p>
              <p class="text-xs text-spotify-subdued/70">Utilisez HTTPS ou saisissez le code manuellement</p>
            </div>
          </div>
        </div>

        <p class="text-spotify-subdued text-sm">Scannez le QR code du groupe</p>

        <!-- Toggle Button -->
        <button
          @click="toggleInput"
          class="spotify-button-secondary w-full"
        >
          <Icon name="heroicons:pencil-square" class="w-4 h-4" />
          <span>Saisir le code manuellement</span>
        </button>
      </div>

      <!-- Name input after QR scan -->
      <div v-if="!joining && showQRScanner && groupCode" class="space-y-6">
        <div class="text-center mb-4">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-spotify-green/15 border border-spotify-green/60 rounded-full">
            <Icon name="heroicons:check-circle" class="w-5 h-5 text-spotify-green" />
            <span class="text-spotify-green font-mono font-bold tracking-[0.2em]">{{ groupCode }}</span>
          </div>
          <p class="text-spotify-subdued text-sm mt-3">Code détecté ! Entrez votre nom :</p>
        </div>

        <div>
          <input
            v-model="guestName"
            type="text"
            placeholder="Votre nom"
            class="spotify-input w-full text-center"
            maxlength="30"
            @keyup.enter="joinAsGuest"
            ref="nameInput"
          />
        </div>

        <button
          @click="joinAsGuest"
          :disabled="!guestName.trim() || joining"
          class="spotify-button w-full"
        >
          Rejoindre {{ groupCode }}
        </button>

        <div class="text-center">
          <button
            @click="resetScan"
            class="text-spotify-subdued hover:text-white transition-colors text-sm"
          >
            Scanner un autre code
          </button>
        </div>

        <div v-if="error" class="text-red-400 text-sm text-center">
          {{ error }}
        </div>
      </div>

      <!-- Manual Input Form -->
      <div v-else-if="!joining && !showQRScanner" class="space-y-6">
        <div class="space-y-3">
          <p class="text-spotify-subdued text-xs uppercase tracking-widest">Code du groupe</p>
          <CodeInput v-model="groupCode" />
        </div>

        <div v-if="status !== 'authenticated'">
          <input
            v-model="guestName"
            type="text"
            placeholder="Votre nom"
            class="spotify-input w-full text-center"
            maxlength="30"
            @keyup.enter="joinAsGuest"
          />
        </div>

        <!-- Show user info if authenticated -->
        <UserChip
          v-else
          :name="data?.user?.name || 'Utilisateur'"
          :image="data?.user?.image"
          :type="data?.user?.type || 'spotify'"
          label="Vous rejoignez en tant que"
        />

        <button
          @click="status === 'authenticated' ? joinExistingUser() : joinAsGuest()"
          :disabled="!groupCode.trim() || groupCode.length < 6 || (status !== 'authenticated' && !guestName.trim()) || joining"
          class="spotify-button w-full"
        >
          {{ status === 'authenticated' ? 'Rejoindre le groupe' : "Rejoindre en tant qu'invité" }}
        </button>

        <!-- Scanner toggle for capable devices -->
        <button
          v-if="hasCamera"
          class="spotify-button-secondary w-full"
          @click="toggleInput"
        >
          <Icon name="heroicons:qr-code" class="w-4 h-4" />
          <span>Scanner un QR code</span>
        </button>

        <div v-if="error" class="text-red-400 text-sm text-center">
          {{ error }}
        </div>
      </div>

      <!-- Joining State -->
      <div v-else-if="joining" class="space-y-4">
        <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin mx-auto text-spotify-green" />
        <p class="text-spotify-subdued">Connexion au groupe...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { QrcodeStream } from 'vue-qrcode-reader'

// Allow unauthenticated access to this page
definePageMeta({
  auth: false
})

const route = useRoute()
const { signIn, status, data } = useAuth()
const { $device } = useNuxtApp()

// State
const groupCode = ref('')
const guestName = ref('')
const joining = ref(false)
const error = ref('')
const showQRScanner = ref(false)
const hasCamera = ref(false)

// QR Scanner state
const cameraError = ref('')

// Initialize camera and input mode
onMounted(async () => {
  console.log('Join page mounted - Device:', $device)
  console.log('Is mobile:', $device.isMobile)
  console.log('Auth status:', status.value)
  console.log('User data:', data.value)

  // Pre-fill username if user is authenticated
  if (status.value === 'authenticated' && data.value?.user?.name) {
    guestName.value = data.value.user.name
  }

  // Set default input mode based on device
  console.log('Device detection:', {
    isMobile: $device.isMobile,
    isDesktop: $device.isDesktop,
    isTablet: $device.isTablet,
    userAgent: navigator?.userAgent
  })

  if ($device.isMobile) {
    console.log('Setting QR scanner for mobile')
    showQRScanner.value = true
    hasCamera.value = true
  } else {
    console.log('Using manual input mode for desktop/tablet')
    showQRScanner.value = false
    hasCamera.value = false
  }

  // Initialize with code from route if coming from /join/[code]
  if (route.params.code) {
    console.log('Route code detected:', route.params.code)
    groupCode.value = (route.params.code as string).toUpperCase()
    showQRScanner.value = false // Force manual input if code provided
  }

  console.log('Final showQRScanner:', showQRScanner.value)
})

// QR Scanner methods
const onDetect = async (detectedCodes: any[]) => {
  if (detectedCodes.length > 0) {
    const result = detectedCodes[0].rawValue

    // Extract group code from QR result
    let code = result

    // If it's a full URL, extract the code
    const urlMatch = code.match(/\/join\/([A-Z0-9]{6})/)
    if (urlMatch) {
      code = urlMatch[1]
    }

    // Validate code format (6 alphanumeric characters)
    if (/^[A-Z0-9]{6}$/.test(code)) {
      groupCode.value = code.toUpperCase()

      // If user is authenticated, join directly
      if (status.value === 'authenticated') {
        await joinExistingUser()
      } else {
        // Show name input for guests
        nextTick(() => {
          const nameInput = document.querySelector('input[ref="nameInput"]') as HTMLInputElement
          nameInput?.focus()
        })
      }
    } else {
      cameraError.value = 'Invalid QR code'
    }
  }
}

const resetScan = () => {
  groupCode.value = ''
  cameraError.value = ''
  error.value = ''
}

const onError = (err: Error) => {
  cameraError.value = err.message || 'Camera error'
}

const onCameraReady = () => {
  cameraError.value = ''
  hasCamera.value = true
}

const onCameraOff = () => {
  // Camera stopped
}

// Methods
const toggleInput = () => {
  showQRScanner.value = !showQRScanner.value
  groupCode.value = '' // Reset code when switching modes
}

const joinAsGuest = async () => {
  if (!groupCode.value.trim() || !guestName.value.trim()) return

  joining.value = true
  error.value = ''

  // Clear any camera errors during join process
  cameraError.value = ''

  try {
    // Create guest session
    const response = await $fetch('/api/auth/guest', {
      method: 'POST',
      body: {
        name: guestName.value.trim(),
        groupCode: groupCode.value
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
    error.value = err.data?.message || 'Group not found or connection error'

    // Reset scan state if needed
    if (showQRScanner.value && hasCamera.value) {
      groupCode.value = '' // Allow re-scanning
    }
  } finally {
    joining.value = false
  }
}

const joinExistingUser = async () => {
  if (!groupCode.value.trim()) return

  joining.value = true
  error.value = ''

  try {
    // Find group by code
    const response = await $fetch('/api/groups/join-by-code', {
      method: 'POST',
      body: {
        groupCode: groupCode.value,
        user: {
          id: data.value?.user?.id || data.value?.user?.email,
          name: data.value?.user?.name,
          image: data.value?.user?.image,
          type: data.value?.user?.type || 'spotify'
        }
      }
    })

    if (response.success) {
      // Redirect to group using the group ID
      await navigateTo(`/group/${response.group.id}`)
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Group not found or connection error'

    // Reset scan state if needed
    if (showQRScanner.value && hasCamera.value) {
      groupCode.value = '' // Allow re-scanning
    }
  } finally {
    joining.value = false
  }
}

// Cleanup
onUnmounted(() => {
  // Cleanup handled by vue-qrcode-reader
})

// Metadata
useHead({
  title: `Rejoindre un groupe - IFY`
})
</script>