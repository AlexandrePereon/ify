<template>
  <div class="spotify-main h-screen overflow-hidden">
    <div class="container mx-auto px-4 py-16 h-full">
      <div class="max-w-md mx-auto text-center">
        <!-- Back to home -->
        <div class="mb-8 text-left">
          <NuxtLink
            to="/"
            class="text-gray-400 hover:text-white transition-colors flex items-center space-x-2"
          >
            <Icon name="heroicons:arrow-left" class="w-4 h-4" />
            <span>Back</span>
          </NuxtLink>
        </div>

        <!-- Logo/Title -->
        <div class="mb-8">
          <h1 class="text-4xl font-bold text-white mb-2">
            <span class="text-green-500">I</span>FY
          </h1>
          <p class="text-gray-400">
            Join a group
          </p>
        </div>


        <!-- QR Scanner (Mobile priority) -->
        <div v-if="!joining && showQRScanner && !groupCode" class="space-y-4">
          <!-- Toggle Button -->
          <div class="text-center">
            <button
              @click="toggleInput"
              class="text-green-500 hover:text-green-400 transition-colors text-sm underline"
            >
              Enter code manually
            </button>
          </div>

          <!-- Camera View -->
          <div class="relative bg-gray-800 rounded-lg overflow-hidden">
            <QrcodeStream
              @detect="onDetect"
              @error="onError"
              @camera-on="onCameraReady"
              @camera-off="onCameraOff"
              class="w-full aspect-square object-cover"
            />
            
            <!-- Error overlay -->
            <div v-if="cameraError" class="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90">
              <div class="text-center text-gray-400">
                <Icon name="heroicons:exclamation-triangle" class="w-12 h-12 mx-auto mb-2" />
                <p class="text-sm mb-3">{{ cameraError }}</p>
                <p class="text-xs text-gray-500">Use HTTPS or enter code manually</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Name input after QR scan -->
        <div v-if="!joining && showQRScanner && groupCode" class="space-y-6">
          <div class="text-center mb-4">
            <div class="inline-block px-4 py-2 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg">
              <Icon name="heroicons:check-circle" class="w-5 h-5 inline text-green-500 mr-2" />
              <span class="text-green-500 font-mono font-semibold">{{ groupCode }}</span>
            </div>
            <p class="text-gray-400 text-sm mt-2">Code detected! Enter your name:</p>
          </div>

          <div>
            <input
              v-model="guestName"
              type="text"
              placeholder="Your name"
              class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center"
              maxlength="30"
              @keyup.enter="joinAsGuest"
              ref="nameInput"
            />
          </div>
          
          <button
            @click="joinAsGuest"
            :disabled="!guestName.trim() || joining"
            class="w-full px-4 py-3 bg-green-500 hover:bg-green-400 disabled:bg-gray-600 disabled:opacity-50 text-black font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            Join {{ groupCode }}
          </button>

          <div class="text-center">
            <button
              @click="resetScan"
              class="text-gray-400 hover:text-white transition-colors text-sm underline"
            >
              Scan another code
            </button>
          </div>

          <div v-if="error" class="text-red-400 text-sm text-center">
            {{ error }}
          </div>
        </div>

        <!-- Manual Input Form -->
        <div v-else-if="!joining && !showQRScanner" class="space-y-6">
          <div>
            <input
              v-model="groupCode"
              type="text"
              placeholder="Group code"
              class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase text-center font-mono"
              maxlength="6"
              @input="groupCode = groupCode.toUpperCase()"
            />
          </div>
          
          <div v-if="status !== 'authenticated'">
            <input
              v-model="guestName"
              type="text"
              placeholder="Your name"
              class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center"
              maxlength="30"
              @keyup.enter="joinAsGuest"
            />
          </div>

          <!-- Show user info if authenticated -->
          <div v-else class="text-center p-4 bg-gray-800 rounded-lg border border-gray-600">
            <p class="text-gray-400 text-sm mb-1">Joining as:</p>
            <p class="text-white font-semibold">{{ data?.user?.name }}</p>
            <div class="flex items-center justify-center mt-2">
              <Icon
                :name="data?.user?.type === 'guest' ? 'heroicons:user' : 'simple-icons:spotify'"
                :class="data?.user?.type === 'guest' ? 'w-4 h-4 text-gray-400' : 'w-4 h-4 text-green-500'"
              />
              <span class="ml-2 text-sm text-gray-400">
                {{ data?.user?.type === 'guest' ? 'Guest' : 'Spotify' }}
              </span>
            </div>
          </div>

          <!-- Scanner toggle for capable devices -->
          <div v-if="hasCamera" class="text-center">
            <button
            class="text-green-500 hover:text-green-400 transition-colors text-sm underline flex items-center justify-center gap-2"
              @click="toggleInput"
            >
              <Icon name="heroicons:qr-code" class="w-4 h-4" />
              Scan QR code
            </button>
          </div>
          
          <button
            @click="status === 'authenticated' ? joinExistingUser() : joinAsGuest()"
            :disabled="!groupCode.trim() || groupCode.length < 3 || (status !== 'authenticated' && !guestName.trim()) || joining"
            class="w-full px-4 py-3 bg-green-500 hover:bg-green-400 disabled:bg-gray-600 disabled:opacity-50 text-black font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {{ status === 'authenticated' ? 'Join group' : 'Join as guest' }}
          </button>

          <div v-if="error" class="text-red-400 text-sm text-center">
            {{ error }}
          </div>
        </div>

        <!-- Joining State -->
        <div v-else-if="joining" class="space-y-4">
          <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin mx-auto text-green-500" />
          <p class="text-gray-400">Joining group...</p>
        </div>
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
  title: `Join Group - IFY`
})
</script>