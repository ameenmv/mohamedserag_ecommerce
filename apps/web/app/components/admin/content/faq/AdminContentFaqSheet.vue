<script setup lang="ts">
import { FAQ_TOPICS, type AdminFaqEntry, type FaqTopic } from '@serag/shared'
import { Loader2, Save } from '@lucide/vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseAdminApiError } from '~/utils/admin-api-errors'

const props = defineProps<{
  open: boolean
  entry: AdminFaqEntry | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [entry: AdminFaqEntry]
  created: [entry: AdminFaqEntry]
}>()

const AdminRichTextEditor = defineAsyncComponent(
  () => import('~/components/admin/rich-text/AdminRichTextEditor.vue'),
)

const { t, localeProperties } = useI18n()
const faqApi = useAdminFaq()
const notify = useNotify()

const side = computed<'right' | 'left'>(() => (localeProperties.value.dir === 'ltr' ? 'right' : 'left'))
const isEditing = computed(() => props.entry !== null)

const hydrated = ref(false)
const saving = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const currentTab = ref<'ar' | 'en'>('ar')

const topic = ref<FaqTopic>('delivery-payment')
const question = ref('')
const answer = ref('')
const visible = ref(true)

const questionEn = ref('')
const answerEn = ref('')

function resetForm(): void {
  if (props.entry) {
    topic.value = props.entry.topic
    question.value = props.entry.question
    answer.value = props.entry.answer
    visible.value = props.entry.visible

    const en = props.entry.translations?.en
    questionEn.value = en?.question ?? ''
    answerEn.value = en?.answer ?? ''
  } else {
    topic.value = 'delivery-payment'
    question.value = ''
    answer.value = ''
    visible.value = true
    questionEn.value = ''
    answerEn.value = ''
  }
  currentTab.value = 'ar'
  fieldErrors.value = {}
}

watch(
  () => [props.open, props.entry],
  ([isOpen]) => {
    if (isOpen) {
      resetForm()
    }
  },
  { immediate: true },
)

function onOpenChange(value: boolean): void {
  if (!saving.value) {
    emit('update:open', value)
  }
}

async function save(): Promise<void> {
  fieldErrors.value = {}

  // Client validation
  const errors: Record<string, string> = {}
  if (!question.value.trim()) {
    errors.question = t('admin.content.faq.fieldQuestion') + ' مطلوب'
  }
  if (!answer.value.trim() || answer.value.trim() === '<p></p>') {
    errors.answer = t('admin.content.faq.fieldAnswer') + ' مطلوبة'
  }

  if (Object.keys(errors).length > 0) {
    fieldErrors.value = errors
    currentTab.value = 'ar'
    return
  }

  saving.value = true
  try {
    const enTranslations = {
      ...(questionEn.value.trim() ? { question: questionEn.value.trim() } : {}),
      ...(answerEn.value.trim() && answerEn.value.trim() !== '<p></p>' ? { answer: answerEn.value.trim() } : {}),
    }

    const payload = {
      topic: topic.value,
      question: question.value.trim(),
      answer: answer.value.trim(),
      visible: visible.value,
      translations: Object.keys(enTranslations).length > 0 ? { en: enTranslations } : null,
    }

    if (props.entry) {
      const updated = await faqApi.update(props.entry.id, payload)
      notify.success(t('admin.content.faq.savedToast'))
      emit('saved', updated)
    } else {
      const created = await faqApi.create(payload)
      notify.success(t('admin.content.faq.createdToast'))
      emit('created', created)
    }
    emit('update:open', false)
  } catch (err: unknown) {
    const parsed = parseAdminApiError(err, t)
    fieldErrors.value = parsed.fieldErrors
    if (Object.keys(parsed.fieldErrors).length === 0) {
      notify.error(t('admin.content.faq.saveError'), parsed.message)
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  hydrated.value = true
})
</script>

<template>
  <Sheet :open="open" @update:open="onOpenChange">
    <SheetContent
      :side="side"
      class="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
    >
      <SheetHeader class="border-b border-border p-5 text-start">
        <SheetTitle class="font-display text-xl font-bold text-foreground">
          {{ isEditing ? t('admin.content.faq.editQuestion') : t('admin.content.faq.newQuestion') }}
        </SheetTitle>
        <SheetDescription class="text-xs text-muted-foreground">
          {{ t('admin.content.faq.subtitle') }}
        </SheetDescription>
      </SheetHeader>

      <!-- Language tabs -->
      <div class="border-b border-border px-5">
        <div
          role="tablist"
          :aria-label="t('admin.content.langTabs.ariaLabel')"
          class="-mb-px flex items-center gap-2"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="currentTab === 'ar'"
            class="flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-bold transition-colors"
            :class="
              currentTab === 'ar'
                ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            "
            @click="currentTab = 'ar'"
          >
            <span>{{ t('admin.content.langTabs.ar') }}</span>
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="currentTab === 'en'"
            class="flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-bold transition-colors"
            :class="
              currentTab === 'en'
                ? 'border-serag-green text-serag-green dark:border-serag-gold dark:text-serag-gold'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            "
            @click="currentTab = 'en'"
          >
            <span>{{ t('admin.content.langTabs.en') }}</span>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-5">
        <form id="admin-faq-form" class="flex flex-col gap-4" @submit.prevent="save">
          <!-- Arabic Tab Content -->
          <template v-if="currentTab === 'ar'">
            <!-- Topic Select -->
            <div class="flex flex-col gap-1.5">
              <Label for="faq-topic-select" class="text-xs font-bold text-foreground">
                {{ t('admin.content.faq.fieldTopic') }}
              </Label>
              <AdminFormSelect
                id="faq-topic-select"
                v-model="topic"
                :disabled="!hydrated || saving"
              >
                <option v-for="top in FAQ_TOPICS" :key="top" :value="top">
                  {{ t(`admin.content.faq.topics.${top}`) }}
                </option>
              </AdminFormSelect>
              <p v-if="fieldErrors.topic" class="text-xs text-destructive">
                {{ fieldErrors.topic }}
              </p>
            </div>

            <!-- Arabic Question -->
            <FormField
              id="faq-question-ar"
              :label="t('admin.content.faq.fieldQuestion')"
              :error="fieldErrors.question"
            >
              <template #default="{ id, invalid, describedBy }">
                <div class="flex flex-col gap-1">
                  <Input
                    :id="id"
                    v-model="question"
                    type="text"
                    maxlength="300"
                    :disabled="!hydrated || saving"
                    :aria-invalid="invalid"
                    :aria-describedby="describedBy"
                    class="h-11 rounded-lg"
                  />
                  <span class="num self-end text-[11px] text-muted-foreground">
                    {{ question.length }} / 300
                  </span>
                </div>
              </template>
            </FormField>

            <!-- Arabic Answer (Rich Text) -->
            <div class="flex flex-col gap-1.5">
              <Label class="text-xs font-bold text-foreground">
                {{ t('admin.content.faq.fieldAnswer') }}
              </Label>
              <AdminRichTextEditor
                v-model="answer"
                :allow-images="false"
                :label="t('admin.content.faq.fieldAnswer')"
              />
              <p v-if="fieldErrors.answer" class="text-xs font-medium text-destructive">
                {{ fieldErrors.answer }}
              </p>
            </div>

            <!-- Visibility Toggle -->
            <div class="flex items-center justify-between rounded-xl border border-border p-3">
              <div class="flex flex-col gap-0.5">
                <span class="text-xs font-bold text-foreground">
                  {{ t('admin.content.faq.fieldVisible') }}
                </span>
                <span class="text-[11px] text-muted-foreground">
                  {{ visible ? t('admin.content.faq.visible') : t('admin.content.faq.hidden') }}
                </span>
              </div>
              <AdminFormSwitch
                id="faq-visible-switch"
                v-model="visible"
                :disabled="!hydrated || saving"
                :aria-label="t('admin.content.faq.fieldVisible')"
              />
            </div>
          </template>

          <!-- English Tab Content -->
          <template v-else-if="currentTab === 'en'">
            <p class="text-xs text-muted-foreground">
              {{ t('admin.content.faq.englishTabHint') }}
            </p>

            <!-- English Question -->
            <FormField
              id="faq-question-en"
              :label="t('admin.content.faq.fieldQuestionEn')"
              :error="fieldErrors['translations.en.question']"
            >
              <template #default="{ id, invalid, describedBy }">
                <div class="flex flex-col gap-1">
                  <Input
                    :id="id"
                    v-model="questionEn"
                    type="text"
                    dir="ltr"
                    lang="en"
                    maxlength="300"
                    :disabled="!hydrated || saving"
                    :aria-invalid="invalid"
                    :aria-describedby="describedBy"
                    class="h-11 rounded-lg"
                  />
                  <span class="num self-end text-[11px] text-muted-foreground">
                    {{ questionEn.length }} / 300
                  </span>
                </div>
              </template>
            </FormField>

            <!-- English Answer (Rich Text) -->
            <div class="flex flex-col gap-1.5">
              <Label class="text-xs font-bold text-foreground">
                {{ t('admin.content.faq.fieldAnswerEn') }}
              </Label>
              <div dir="ltr" lang="en">
                <AdminRichTextEditor
                  v-model="answerEn"
                  :allow-images="false"
                  :label="t('admin.content.faq.fieldAnswerEn')"
                />
              </div>
              <p v-if="fieldErrors['translations.en.answer']" class="text-xs font-medium text-destructive">
                {{ fieldErrors['translations.en.answer'] }}
              </p>
            </div>
          </template>
        </form>
      </div>

      <SheetFooter class="border-t border-border p-4 sm:justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          class="min-h-11 rounded-lg"
          :disabled="saving"
          @click="onOpenChange(false)"
        >
          {{ t('common.cancel') }}
        </Button>
        <Button
          type="submit"
          form="admin-faq-form"
          class="min-h-11 rounded-lg bg-serag-gold font-bold text-serag-night hover:bg-serag-gold-hi"
          :disabled="!hydrated || saving"
        >
          <Loader2 v-if="saving" class="me-1.5 size-4 animate-spin" aria-hidden="true" />
          <Save v-else class="me-1.5 size-4" aria-hidden="true" />
          <span>{{ saving ? t('admin.content.faq.saving') : t('admin.content.faq.save') }}</span>
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
