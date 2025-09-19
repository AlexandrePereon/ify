<template>
  <div class="flex flex-col items-center space-y-4">
    <!-- Main Next Button (hidden when user has voted) -->
    <button
      v-if="!hasVoted"
      :disabled="disabled || loading"
      :class="[
        'relative flex items-center justify-center',
        'px-6 py-3 rounded-full font-semibold text-base',
        'bg-green-500 hover:bg-green-400 text-black',
        'shadow-lg hover:shadow-xl',
        'transition-all duration-200 transform',
        'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-black',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        loading ? 'cursor-wait' : 'hover:scale-105'
      ]"
      @click="handleNext"
    >
      <Icon
        v-if="!loading"
        name="heroicons:forward"
        class="w-5 h-5 mr-2"
      />
      <Icon
        v-else
        name="heroicons:arrow-path"
        class="w-5 h-5 mr-2 animate-spin"
      />
      {{ loading ? 'Processing...' : 'Next' }}
    </button>
    
    <!-- Vote Counter (shown when votes are active, clickable to remove vote) -->
    <button
      v-if="showVoteCounter"
      :disabled="loading"
      class="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full border border-gray-600 transition-colors duration-200 cursor-pointer"
      @click="handleNext"
    >
      <Icon name="heroicons:hand-raised" class="w-4 h-4 text-orange-400" />
      <div class="flex flex-col">
        <span class="text-sm text-gray-300">
          {{ skipVotes }}/{{ Math.floor(totalMembers / 2) + 1 }} votes to skip
        </span>
        <span class="text-xs text-gray-500">(click to remove vote)</span>
      </div>
    </button>
    
    <!-- Status Message -->
    <p v-if="statusMessage" class="text-sm text-gray-400 text-center max-w-xs">
      {{ statusMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  groupId: string
  disabled?: boolean
  skipVotes?: number
  totalMembers?: number
  showVoteCounter?: boolean
  hasVoted?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  skipVotes: 0,
  totalMembers: 1,
  showVoteCounter: false,
  hasVoted: false
})

const emit = defineEmits<{
  voted: [result: { voted: boolean; skipVotes: number; totalMembers: number }]
  skipped: []
}>()

// State
const loading = ref(false)
const statusMessage = ref('')

// Methods
const handleNext = async () => {
  if (loading.value) return

  loading.value = true
  statusMessage.value = ''

  try {
    const response = await $fetch(`/api/groups/${props.groupId}/skip`, {
      method: 'POST'
    })

    if (response.success) {
      if (response.skipped) {
        statusMessage.value = 'Track skipped!'
        emit('skipped')
      } else {
        statusMessage.value = response.message
        emit('voted', {
          voted: response.voted,
          skipVotes: response.skipVotes,
          totalMembers: response.totalMembers
        })
      }
    }
  } catch (error) {
    console.error('Skip vote failed:', error)
    statusMessage.value = 'Vote failed. Try again.'
  } finally {
    loading.value = false
    
    // Clear status message after 3 seconds
    if (statusMessage.value) {
      setTimeout(() => {
        statusMessage.value = ''
      }, 3000)
    }
  }
}
</script>