<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Eye, EyeOff } from '@lucide/vue'
import { cn } from '~/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  disabled?: boolean
  class?: HTMLAttributes['class']
}>()

const { t } = useI18n()
const modelValue = defineModel<string>({ default: '' })
const showPassword = ref(false)
</script>

<template>
  <div class="relative">
    <Input
      v-model="modelValue"
      v-bind="$attrs"
      :type="showPassword ? 'text' : 'password'"
      :disabled="disabled"
      :class="cn('h-12 rounded-xl bg-serag-ivory/60 ps-4 pe-12', props.class)"
    />
    <button
      type="button"
      :disabled="disabled"
      :aria-label="showPassword ? t('common.hidePassword') : t('common.showPassword')"
      class="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      @click="showPassword = !showPassword"
    >
      <EyeOff v-if="showPassword" class="size-5" aria-hidden="true" />
      <Eye v-else class="size-5" aria-hidden="true" />
    </button>
  </div>
</template>
