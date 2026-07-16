<template>
  <div class="spotify-card flex items-center gap-3 p-3 px-4 text-left">
    <!-- Avatar -->
    <img
      v-if="image"
      :src="image"
      :alt="name"
      class="w-10 h-10 rounded-full object-cover flex-shrink-0"
    />
    <div
      v-else
      class="w-10 h-10 rounded-full bg-spotify-green flex items-center justify-center flex-shrink-0"
    >
      <span class="text-black font-bold text-lg leading-none">{{ initial }}</span>
    </div>

    <!-- Identity -->
    <div class="flex-1 min-w-0">
      <p v-if="label" class="text-spotify-subdued text-xs">{{ label }}</p>
      <p class="text-white font-bold truncate">{{ name }}</p>
    </div>

    <!-- Provider badge -->
    <div class="flex items-center gap-1.5 flex-shrink-0">
      <Icon
        :name="isGuest ? 'heroicons:user' : 'simple-icons:spotify'"
        :class="isGuest ? 'text-spotify-subdued' : 'text-spotify-green'"
        class="w-4 h-4"
      />
      <span class="text-xs text-spotify-subdued">{{ isGuest ? 'Invité' : 'Spotify' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  name: string
  image?: string | null
  type?: string
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  image: null,
  type: 'spotify',
  label: ''
})

const isGuest = computed(() => props.type === 'guest')
const initial = computed(() => (props.name || '?').trim().charAt(0).toUpperCase())
</script>
