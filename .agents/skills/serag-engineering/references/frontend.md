# Frontend Engineering Guide

This document defines coding conventions, component guidelines, styling standards, form practices, and accessibility requirements for `apps/web`.

---

## 1. Vue 3 & Nuxt 4 Script Setup Conventions

Every component and page must use `<script setup lang="ts">` with strict TypeScript typing.

### Props, Model, and Emits
- **Props**: Use generic `defineProps<{ ... }>()`. Use `withDefaults` when optional props need default values.
- **Two-way Model Binding**: Use `defineModel<T>()` instead of manual `modelValue` props and `update:modelValue` emits.
- **Emits**: Use typed tuple or object syntax in `defineEmits<{ ... }>()`.

```vue
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    variant?: 'default' | 'pill'
    class?: HTMLAttributes['class']
  }>(),
  {
    disabled: false,
    variant: 'default',
    class: undefined,
  },
)

const modelValue = defineModel<string>({ default: '' })

const emit = defineEmits<{
  submit: [value: string]
  cancel: []
}>()
</script>
```

---

## 2. Nuxt Auto-Imports: What to Import and What to Omit

Nuxt 4 automatically scans and imports Vue reactivity APIs, Nuxt runtime composables, application composables (`app/composables/*`), and pure utilities (`app/utils/*`).

### ❌ DO NOT Import (Auto-imported by Nuxt):
- Vue primitives: `ref`, `computed`, `reactive`, `watch`, `onMounted`, `nextTick`.
- Nuxt built-ins: `useState`, `useRuntimeConfig`, `useRoute`, `useRouter`, `navigateTo`.
- i18n & Head: `useI18n`, `useLocalePath`, `useSwitchLocalePath`, `useHead`, `useSeoMeta`.
- App composables: `useAdminAuth`, `useAdminSession`, `useLoginForm`, `useAnalytics`.
- App utils: `cn`, `resolveNextPath`, `loginErrorKey`, `createShortcutTracker`.

### ✅ DO Import (Explicitly Required):
- Types: `import type { AdminUser } from '~/types/admin'` or `import type { Ref } from 'vue'`.
- External packages: `import { Heart, Search } from '@lucide/vue'`, `import { useEventListener } from '@vueuse/core'`.
- Monorepo packages: `import { waLink, formatEgpWithUnit } from '@serag/shared'`.
- Constants: `import { STORE_NAV_ITEMS } from '~/constants/navigation'`.

```vue
<!-- DO: Clean script without redundant imports -->
<script setup lang="ts">
import type { Permission } from '@serag/shared'
import { ShieldCheck } from '@lucide/vue'

// Auto-imported: ref, computed, useI18n, useAdminAuth
const { t } = useI18n()
const { user, can } = useAdminAuth()
const isOpen = ref(false)
</script>
```

---

## 3. Component Auto-Import Naming Rules

Nuxt scans `app/components/` and registers components using folder names as prefixes. Understanding how prefixes are constructed and deduplicated is critical to avoiding broken component tags.

### The Mechanism
1. Nuxt concatenates the directory path relative to `components/` to form the component prefix.
2. If the filename begins with that exact prefix, Nuxt deduplicates it.
3. If the filename matches only a *partial* parent folder, Nuxt concatenates both names.

### Examples from this Codebase:

| Location | Directory Prefix | Filename | Registered Component Tag |
|---|---|---|---|
| `components/common/LocaleSwitcher.vue` | `Common` | `LocaleSwitcher.vue` | `<CommonLocaleSwitcher>` |
| `components/form/FormPasswordInput.vue` | `Form` | `FormPasswordInput.vue` | `<FormPasswordInput>` |
| `components/store/StoreHeader.vue` | `Store` | `StoreHeader.vue` | `<StoreHeader>` |
| `components/store/header/StoreHeaderAnnouncement.vue` | `StoreHeader` | `StoreHeaderAnnouncement.vue` | `<StoreHeaderAnnouncement>` |
| `components/admin/dashboard/AdminDashboardWelcomeHeader.vue` | `AdminDashboard` | `AdminDashboardWelcomeHeader.vue` | `<AdminDashboardWelcomeHeader>` |

### ⚠️ Real Bug Caught:
When a developer placed a header inside `components/admin/dashboard/` and named the file `AdminWelcomeHeader.vue`:
- Directory path: `admin/dashboard` → Prefix: `AdminDashboard`.
- Filename: `AdminWelcomeHeader.vue` starts with `Admin`, **not** `AdminDashboard`.
- Nuxt did not deduplicate, registering the component as:
  `<AdminDashboardAdminWelcomeHeader>`
- In templates, developers wrote `<AdminDashboardWelcomeHeader />` or `<AdminWelcomeHeader />`, causing:
  `[Vue warn]: Failed to resolve component: AdminDashboardWelcomeHeader`

### The Rule:
- When placing a component in a nested folder (`components/<domain>/<subfolder>/`), either:
  1. Prefix the filename with the full folder hierarchy: `components/admin/dashboard/AdminDashboardWelcomeHeader.vue` → `<AdminDashboardWelcomeHeader>`.
  2. Or keep the filename simple without any partial prefix: `components/admin/dashboard/WelcomeHeader.vue` → `<AdminDashboardWelcomeHeader>`.
- **Never** use a partial prefix like `AdminWelcomeHeader.vue` inside `admin/dashboard/`.

---

## 4. shadcn-vue Primitives & Class Merging

We use `shadcn-vue` (backed by Reka UI) with components installed in `app/components/ui/`.

- **Never edit files in `app/components/ui/`**: They are managed by `shadcn-nuxt`. Treat them as third-party primitives.
- **Extend via domain or form wrappers**: When adding business logic or custom layout, create a wrapper under `components/form/` or `components/admin/`.
- **Merge classes using `cn()`**: Always merge tailwind classes with `cn()` from `~/lib/utils` (combines `clsx` and `tailwind-merge`).

```vue
<!-- components/form/FormPasswordInput.vue -->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Eye, EyeOff } from '@lucide/vue'
import { cn } from '~/lib/utils'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  disabled?: boolean
  class?: HTMLAttributes['class']
}>()

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
      class="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
      @click="showPassword = !showPassword"
    >
      <EyeOff v-if="showPassword" class="size-5" />
      <Eye v-else class="size-5" />
    </button>
  </div>
</template>
```

---

## 5. Form Architecture, Slot Props & Hydration Guard

Forms must be accessible, responsive, and secure against pre-hydration submission.

### Accessible `FormField` Pattern
`components/form/FormField.vue` encapsulates the `<Label>` and error message, exposing slot props to wire ARIA attributes:

```vue
<FormField
  id="admin-email"
  :label="t('admin.login.email')"
  :error="emailError"
>
  <template #default="{ id, invalid, describedBy }">
    <Input
      :id="id"
      v-model="email"
      type="email"
      :disabled="submitting || !hydrated"
      :aria-invalid="invalid"
      :aria-describedby="describedBy"
      class="h-12 rounded-xl"
    />
  </template>
</FormField>
```

### ⚠️ Review Checklist Rule:
Always bind the slot props (`:id="id"`, `:aria-invalid="invalid"`, `:aria-describedby="describedBy"`). Exposing slot props but ignoring them in child inputs breaks screen reader accessibility.

### Hydration Guard
In SSR, forms rendered in HTML can natively submit before Vue finishes hydrating if a user presses Enter or clicks submit.
- **Problem**: Native form submission triggers an HTTP GET or basic POST, dumping sensitive fields (such as email/password) into browser history or URL query parameters.
- **Solution**: Keep all form inputs and submit buttons disabled until `onMounted`:

```ts
// In form composable (e.g. useLoginForm.ts)
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

// In template:
// <Input :disabled="submitting || !hydrated" />
// <Button type="submit" :disabled="submitting || !hydrated" />
```

---

## 6. SSR & Hydration Safety

Nuxt 4 renders pages on the server (Nitro) and hydrates on the client. Code must execute safely in both contexts.

1. **Reactive State Across Requests**: Never use module-scoped `ref()` or `reactive()` outside of components. Use `useState('unique-key', () => initialValue)` to ensure per-request isolation on the server.
2. **Server-Only Checks**: Guard server-only operations with `import.meta.server`:
   ```ts
   if (import.meta.server) {
     const incoming = useRequestHeaders(['cookie'])
     if (incoming.cookie) headers.set('cookie', incoming.cookie)
   }
   ```
3. **Client-Only Checks**: Guard browser window access with `import.meta.client` or check `typeof window !== 'undefined'`. Never reference `window`, `document`, or `navigator` at module root.
4. **Cookie Forwarding**: Server-side API calls during SSR must forward the user's incoming `cookie` header so the API can authenticate the session.

---

## 7. Styling & Design Tokens

Styling uses Tailwind CSS v4 CSS-first configuration (`@tailwindcss/vite`), referencing brand tokens from `packages/ui/tokens.css`.

### Brand Color Tokens
- `bg-serag-night` / `text-serag-night`: Deep brand forest green (`#16291E`).
- `bg-serag-green` / `text-serag-green`: Accent green (`#244230`).
- `bg-serag-gold` / `text-serag-gold`: Serag gold (`#C89B3C`).
- `text-serag-gold-hi`: High-contrast gold hover state (`#E0B354`).
- `bg-serag-ivory`: Soft warm background (`#FBF9F4`).
- `text-serag-ink`: Primary dark body text (`#1C1E1B`).
- `rounded-[var(--radius-card)]`: 1.25rem card corner rounding.

### Logical CSS Properties for RTL/LTR Support
Never use physical directions (`left`, `right`). Always use logical CSS:

| Physical (Forbidden) | Logical (Mandatory) | Purpose |
|---|---|---|
| `ml-4`, `mr-4` | `ms-4`, `me-4` | Margin start / margin end |
| `pl-4`, `pr-4` | `ps-4`, `pe-4` | Padding start / padding end |
| `left-0`, `right-0` | `start-0`, `end-0` | Position start / end |
| `border-l`, `border-r` | `border-s`, `border-e` | Border start / end |
| `text-left`, `text-right` | `text-start`, `text-end` | Text alignment |

### Numbers & Directional Icons
- **Numbers**: Always apply the `.num` utility class to numbers, prices, phone numbers, and dates. This ensures Latin digits with tabular figures and clean typography.
- **Directional Icons**: Icons indicating forwards/backwards (chevrons, back arrows) must flip in RTL using `rtl:-scale-x-100`.

```vue
<!-- Back arrow flipping for RTL -->
<ChevronRight class="size-4 rtl:-scale-x-100" aria-hidden="true" />

<!-- Formatted price with .num -->
<span class="num font-bold text-serag-gold">{{ formatEgpWithUnit(product.price) }}</span>
```

---

## 8. Accessibility (a11y) Baseline

Every UI addition must comply with WCAG 2.2 AA standards:

1. **Labels for Every Input**: Every form input must have an associated `<Label :for="id">` or explicit `aria-label`.
2. **Keyboard Navigation & Rings**: Interactive elements must show clear focus rings:
   `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`.
3. **Minimum Target Size**: Touch targets must be at least 44×44px on mobile (`min-h-11 min-w-11` or `h-12`).
4. **Skip to Content Link**: Both `layouts/default.vue` and `layouts/admin.vue` render an accessible skip link as their first child:
   ```vue
   <a
     href="#main-content"
     class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:font-bold focus:shadow-lg"
   >
     {{ t('common.skipToContent') }}
   </a>
   ```
5. **Aria Hidden**: Decorative SVG icons must declare `aria-hidden="true"`.
