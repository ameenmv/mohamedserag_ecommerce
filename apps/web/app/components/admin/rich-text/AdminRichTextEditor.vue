<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import {
  Bold,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Quote,
  Redo2,
  Undo2,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '~/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue: string
    allowImages?: boolean
    label: string
    onUploadImage?: (file: File) => Promise<string>
  }>(),
  {
    allowImages: false,
    onUploadImage: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()

const revision = ref(0)
const linkOpen = ref(false)
const linkUrl = ref('')
const linkError = ref(false)
const uploadingImage = ref(false)
const imageError = ref(false)
const imageInput = ref<HTMLInputElement | null>(null)

const CONTENT_CLASS = [
  'min-h-[14rem] max-w-none px-4 py-3 text-sm leading-relaxed text-foreground outline-none',
  '[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold',
  '[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold',
  '[&_h4]:mt-4 [&_h4]:mb-1.5 [&_h4]:text-base [&_h4]:font-bold',
  '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-6',
  '[&_blockquote]:my-3 [&_blockquote]:border-s-4 [&_blockquote]:border-serag-gold/60 [&_blockquote]:ps-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',
  '[&_a]:font-semibold [&_a]:text-serag-green [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-serag-gold',
  '[&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl',
].join(' ')

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      code: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: false,
        protocols: ['https', 'mailto', 'tel'],
      },
    }),
    ...(props.allowImages ? [Image.configure({ allowBase64: false })] : []),
  ],
  editorProps: {
    attributes: {
      class: CONTENT_CLASS,
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': props.label,
      dir: 'auto',
    },
  },
  onTransaction: () => {
    revision.value += 1
  },
  onUpdate: ({ editor: instance }) => {
    emit('update:modelValue', instance.getHTML())
  },
})

const formats = computed(() => {
  const instance = editor.value
  const revisionSnapshot = revision.value
  if (!instance) {
    return {
      revisionSnapshot,
      h2: false,
      h3: false,
      h4: false,
      paragraph: false,
      bold: false,
      italic: false,
      bulletList: false,
      orderedList: false,
      blockquote: false,
      link: false,
      canUndo: false,
      canRedo: false,
    }
  }

  return {
    revisionSnapshot,
    h2: instance.isActive('heading', { level: 2 }),
    h3: instance.isActive('heading', { level: 3 }),
    h4: instance.isActive('heading', { level: 4 }),
    paragraph: instance.isActive('paragraph'),
    bold: instance.isActive('bold'),
    italic: instance.isActive('italic'),
    bulletList: instance.isActive('bulletList'),
    orderedList: instance.isActive('orderedList'),
    blockquote: instance.isActive('blockquote'),
    link: instance.isActive('link'),
    canUndo: instance.can().undo(),
    canRedo: instance.can().redo(),
  }
})

watch(
  () => props.modelValue,
  (value) => {
    const instance = editor.value
    if (!instance || value === instance.getHTML()) return
    instance.commands.setContent(value, { emitUpdate: false })
  },
)

const TOOLBAR_BUTTON_CLASS =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40'

function buttonClass(active: boolean): string {
  return cn(TOOLBAR_BUTTON_CLASS, active && 'bg-accent text-foreground')
}

function toggleHeading(level: 2 | 3 | 4): void {
  editor.value?.chain().focus().toggleHeading({ level }).run()
}

function setParagraph(): void {
  editor.value?.chain().focus().setParagraph().run()
}

function toggleBold(): void {
  editor.value?.chain().focus().toggleBold().run()
}

function toggleItalic(): void {
  editor.value?.chain().focus().toggleItalic().run()
}

function toggleBulletList(): void {
  editor.value?.chain().focus().toggleBulletList().run()
}

function toggleOrderedList(): void {
  editor.value?.chain().focus().toggleOrderedList().run()
}

function toggleBlockquote(): void {
  editor.value?.chain().focus().toggleBlockquote().run()
}

function undo(): void {
  editor.value?.chain().focus().undo().run()
}

function redo(): void {
  editor.value?.chain().focus().redo().run()
}

function openLinkDialog(): void {
  const instance = editor.value
  if (!instance) return
  const attrs: Record<string, unknown> = instance.getAttributes('link')
  linkUrl.value = typeof attrs.href === 'string' ? attrs.href : ''
  linkError.value = false
  linkOpen.value = true
}

function isAllowedLink(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true
  if (value.startsWith('https://')) return true
  if (value.startsWith('mailto:') && value.length > 'mailto:'.length) return true
  if (value.startsWith('tel:') && value.length > 'tel:'.length) return true
  return false
}

function removeLink(): void {
  editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
  linkUrl.value = ''
  linkError.value = false
  linkOpen.value = false
}

function applyLink(): void {
  const instance = editor.value
  if (!instance) return
  const url = linkUrl.value.trim()
  if (!url) {
    removeLink()
    return
  }
  if (!isAllowedLink(url)) {
    linkError.value = true
    return
  }
  instance.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  linkOpen.value = false
}

async function onImagePicked(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  const upload = props.onUploadImage
  target.value = ''
  if (!file || !upload) return

  imageError.value = false
  uploadingImage.value = true
  try {
    const url = await upload(file)
    if (url) {
      editor.value?.chain().focus().setImage({ src: url }).run()
    }
  } catch {
    imageError.value = true
  } finally {
    uploadingImage.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      role="toolbar"
      :aria-label="t('admin.richText.toolbar')"
      class="flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-border bg-muted/40 p-1.5"
    >
      <button
        type="button"
        :class="buttonClass(formats.h2)"
        :aria-pressed="formats.h2"
        :aria-label="t('admin.richText.heading2')"
        :disabled="!editor"
        @click="toggleHeading(2)"
      >
        <Heading2 class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        :class="buttonClass(formats.h3)"
        :aria-pressed="formats.h3"
        :aria-label="t('admin.richText.heading3')"
        :disabled="!editor"
        @click="toggleHeading(3)"
      >
        <Heading3 class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        :class="buttonClass(formats.h4)"
        :aria-pressed="formats.h4"
        :aria-label="t('admin.richText.heading4')"
        :disabled="!editor"
        @click="toggleHeading(4)"
      >
        <Heading4 class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        :class="buttonClass(formats.paragraph)"
        :aria-pressed="formats.paragraph"
        :aria-label="t('admin.richText.paragraph')"
        :disabled="!editor"
        @click="setParagraph"
      >
        <Pilcrow class="size-4" aria-hidden="true" />
      </button>

      <span class="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />

      <button
        type="button"
        :class="buttonClass(formats.bold)"
        :aria-pressed="formats.bold"
        :aria-label="t('admin.richText.bold')"
        :disabled="!editor"
        @click="toggleBold"
      >
        <Bold class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        :class="buttonClass(formats.italic)"
        :aria-pressed="formats.italic"
        :aria-label="t('admin.richText.italic')"
        :disabled="!editor"
        @click="toggleItalic"
      >
        <Italic class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        :class="buttonClass(formats.bulletList)"
        :aria-pressed="formats.bulletList"
        :aria-label="t('admin.richText.bulletList')"
        :disabled="!editor"
        @click="toggleBulletList"
      >
        <List class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        :class="buttonClass(formats.orderedList)"
        :aria-pressed="formats.orderedList"
        :aria-label="t('admin.richText.orderedList')"
        :disabled="!editor"
        @click="toggleOrderedList"
      >
        <ListOrdered class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        :class="buttonClass(formats.blockquote)"
        :aria-pressed="formats.blockquote"
        :aria-label="t('admin.richText.blockquote')"
        :disabled="!editor"
        @click="toggleBlockquote"
      >
        <Quote class="size-4" aria-hidden="true" />
      </button>

      <span class="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />

      <button
        type="button"
        :class="buttonClass(formats.link)"
        :aria-pressed="formats.link"
        :aria-label="t('admin.richText.link')"
        :disabled="!editor"
        @click="openLinkDialog"
      >
        <LinkIcon class="size-4" aria-hidden="true" />
      </button>
      <button
        v-if="allowImages && onUploadImage"
        type="button"
        :class="buttonClass(false)"
        :aria-label="t('admin.richText.image')"
        :disabled="!editor || uploadingImage"
        @click="imageInput?.click()"
      >
        <Loader2 v-if="uploadingImage" class="size-4 animate-spin" aria-hidden="true" />
        <ImagePlus v-else class="size-4" aria-hidden="true" />
      </button>

      <span class="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />

      <button
        type="button"
        :class="buttonClass(false)"
        :aria-label="t('admin.richText.undo')"
        :disabled="!editor || !formats.canUndo"
        @click="undo"
      >
        <Undo2 class="size-4 rtl:-scale-x-100" aria-hidden="true" />
      </button>
      <button
        type="button"
        :class="buttonClass(false)"
        :aria-label="t('admin.richText.redo')"
        :disabled="!editor || !formats.canRedo"
        @click="redo"
      >
        <Redo2 class="size-4 rtl:-scale-x-100" aria-hidden="true" />
      </button>
    </div>

    <input
      v-if="allowImages && onUploadImage"
      ref="imageInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      class="sr-only"
      @change="onImagePicked"
    >

    <div
      class="rounded-b-xl border border-border bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40"
    >
      <EditorContent v-if="editor" :editor="editor" />
      <p v-else class="min-h-[14rem] px-4 py-3 text-sm text-muted-foreground">
        {{ t('admin.richText.loading') }}
      </p>
    </div>

    <p v-if="imageError" class="text-xs font-medium text-destructive">
      {{ t('admin.richText.imageError') }}
    </p>

    <Dialog :open="linkOpen" @update:open="linkOpen = $event">
      <DialogContent class="w-full max-w-[calc(100vw-2rem)] rounded-3xl p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-lg font-bold text-foreground">
            {{ t('admin.richText.linkTitle') }}
          </DialogTitle>
          <DialogDescription class="pt-1 text-xs text-muted-foreground">
            {{ t('admin.richText.linkDescription') }}
          </DialogDescription>
        </DialogHeader>

        <form class="flex flex-col gap-3 py-2" @submit.prevent="applyLink">
          <label for="rich-text-link" class="text-xs font-bold text-foreground">
            {{ t('admin.richText.linkUrl') }}
          </label>
          <Input
            id="rich-text-link"
            v-model="linkUrl"
            type="text"
            dir="ltr"
            :disabled="!editor"
            :aria-invalid="linkError"
            :aria-describedby="linkError ? 'rich-text-link-error' : undefined"
            :placeholder="t('admin.richText.linkPlaceholder')"
            class="text-start"
            @input="linkError = false"
          />
          <p
            v-if="linkError"
            id="rich-text-link-error"
            class="text-xs font-medium text-destructive"
          >
            {{ t('admin.richText.linkInvalid') }}
          </p>

          <DialogFooter class="flex flex-col-reverse gap-2 pt-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              class="min-h-12 w-full font-medium sm:w-auto"
              @click="linkOpen = false"
            >
              {{ t('common.cancel') }}
            </Button>
            <Button
              v-if="formats.link"
              type="button"
              variant="outline"
              class="min-h-12 w-full font-medium sm:w-auto"
              @click="removeLink"
            >
              {{ t('admin.richText.linkRemove') }}
            </Button>
            <Button
              type="submit"
              :disabled="!editor"
              class="min-h-12 w-full bg-serag-gold font-bold text-serag-night hover:bg-serag-gold-hi sm:w-auto"
            >
              {{ t('admin.richText.linkApply') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
