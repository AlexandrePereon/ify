<template>
  <div class="flex justify-center gap-2" @paste.prevent="onPaste">
    <input
      v-for="i in length"
      :key="i"
      :ref="el => setBoxRef(i - 1, el)"
      type="text"
      inputmode="text"
      autocomplete="one-time-code"
      autocapitalize="characters"
      maxlength="1"
      :value="chars[i - 1] || ''"
      :class="[
        'w-11 h-14 sm:w-12 text-center text-xl font-mono font-bold uppercase rounded-lg',
        'bg-spotify-highlight border focus:outline-none transition-colors caret-transparent',
        isComplete
          ? 'text-spotify-green border-spotify-green/60'
          : 'text-white border-transparent focus:border-spotify-green'
      ]"
      @input="onInput(i - 1, $event)"
      @keydown="onKeydown(i - 1, $event)"
      @focus="($event.target as HTMLInputElement).select()"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  length?: number
}

const props = withDefaults(defineProps<Props>(), {
  length: 6
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const boxes = ref<(HTMLInputElement | null)[]>([])

const setBoxRef = (index: number, el: any) => {
  boxes.value[index] = el
}

const chars = computed(() => props.modelValue.split(''))
const isComplete = computed(() => props.modelValue.length === props.length)

const sanitize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '')

const setCharAt = (index: number, char: string) => {
  const current = props.modelValue.split('')
  current[index] = char
  emit('update:modelValue', current.join('').slice(0, props.length))
}

const onInput = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const char = sanitize(input.value).slice(-1)
  input.value = chars.value[index] || ''

  if (!char) return
  setCharAt(index, char)
  boxes.value[index + 1]?.focus()
}

const onKeydown = (index: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace') {
    event.preventDefault()
    if (chars.value[index]) {
      setCharAt(index, '')
    } else if (index > 0) {
      setCharAt(index - 1, '')
      boxes.value[index - 1]?.focus()
    }
  } else if (event.key === 'ArrowLeft' && index > 0) {
    boxes.value[index - 1]?.focus()
  } else if (event.key === 'ArrowRight' && index < props.length - 1) {
    boxes.value[index + 1]?.focus()
  }
}

const onPaste = (event: ClipboardEvent) => {
  const pasted = sanitize(event.clipboardData?.getData('text') || '').slice(0, props.length)
  if (!pasted) return
  emit('update:modelValue', pasted)
  nextTick(() => {
    boxes.value[Math.min(pasted.length, props.length - 1)]?.focus()
  })
}
</script>
