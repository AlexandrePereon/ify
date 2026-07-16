<template>
  <div class="flex flex-col items-center space-y-4">
    <!-- Main Next Button (hidden when user has voted) -->
    <button
      v-if="!hasVoted"
      :disabled="disabled || loading"
      :class="[
        'relative flex items-center justify-center',
        'px-8 py-3 rounded-full font-bold text-base',
        'bg-spotify-green hover:bg-spotify-green-hover text-black',
        'shadow-lg hover:shadow-xl',
        'transition-all duration-200 transform',
        'focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-spotify-base',
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
      {{ loading ? 'Patientez...' : 'Suivant' }}
    </button>

    <!-- Vote Counter (shown when votes are active, clickable to remove vote) -->
    <button
      v-if="showVoteCounter"
      :disabled="loading"
      class="flex items-center gap-3 px-5 py-2.5 bg-spotify-elevated hover:bg-spotify-highlight rounded-full border border-white/10 transition-colors duration-200 cursor-pointer"
      @click="handleNext"
    >
      <Icon name="heroicons:forward" class="w-4 h-4 text-spotify-green flex-shrink-0" />
      <div class="flex flex-col items-start gap-1">
        <span class="text-sm text-white font-medium">
          {{ skipVotes }}/{{ voteThreshold }} votes pour passer
        </span>
        <div class="w-28 h-1 bg-white/15 rounded-full overflow-hidden">
          <div
            class="h-full bg-spotify-green rounded-full transition-all duration-300"
            :style="{ width: Math.min(100, (skipVotes / voteThreshold) * 100) + '%' }"
          />
        </div>
        <span class="text-[11px] text-spotify-subdued">Appuyez pour annuler votre vote</span>
      </div>
    </button>

    <!-- Status Message -->
    <p v-if="statusMessage" class="text-sm text-spotify-subdued text-center max-w-xs">
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

// Computed
const voteThreshold = computed(() => Math.floor(props.totalMembers / 2) + 1)

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
        statusMessage.value = 'Titre passé !'
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
    statusMessage.value = 'Échec du vote. Réessayez.'
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