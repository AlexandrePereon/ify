<template>
  <div class="flex flex-col items-center space-y-4">
    <!-- Main Next Button -->
    <ActionButton
      :loading="loading"
      :disabled="disabled"
      variant="primary"
      size="large"
      icon="heroicons:forward"
      text="Next"
      @click="handleNext"
    />
    
    <!-- Vote Counter (shown when votes are active) -->
    <VoteCounter
      v-if="showVoteCounter"
      :votes="skipVotes"
      :total="totalMembers"
    />
    
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
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  skipVotes: 0,
  totalMembers: 1,
  showVoteCounter: false
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