<template>
  <div class="flex items-center space-x-2 text-sm">
    <!-- Vote Icon -->
    <Icon name="heroicons:hand-raised" class="w-4 h-4 text-gray-400" />
    
    <!-- Vote Count -->
    <span class="text-gray-400">
      {{ votes }}/{{ total }}
    </span>
    
    <!-- Progress Bar -->
    <div class="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
      <div 
        class="h-full bg-green-500 transition-all duration-300 ease-out"
        :style="{ width: `${percentage}%` }"
      />
    </div>
    
    <!-- Percentage -->
    <span class="text-xs text-gray-500 w-8">
      {{ Math.round(percentage) }}%
    </span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  votes: number
  total: number
}

const props = defineProps<Props>()

const percentage = computed(() => {
  if (props.total === 0) return 0
  return (props.votes / props.total) * 100
})
</script>