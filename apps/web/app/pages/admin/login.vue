<script setup lang="ts">
import { Check, Eye, EyeOff, Loader2 } from '@lucide/vue'

definePageMeta({ layout: false })
useSeoMeta({ title: 'تسجيل الدخول' })

const route = useRoute()
const { login } = useAdminAuth()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
// Inputs and submit stay disabled until hydration: typed text would be reset by v-model on hydrate,
// and a native (non-JS) submit must never happen.
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const emailError = ref('')
const passwordError = ref('')
const formError = ref('')

function resolveNextPath(raw: unknown): string {
  if (typeof raw !== 'string') return '/admin'
  if (!raw.startsWith('/admin') || raw.startsWith('//') || raw.startsWith('/admin/login')) {
    return '/admin'
  }
  return raw
}

function validate(): boolean {
  emailError.value = ''
  passwordError.value = ''
  formError.value = ''

  const trimmedEmail = email.value.trim()
  if (!trimmedEmail) {
    emailError.value = 'يرجى إدخال البريد الإلكتروني'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    emailError.value = 'البريد الإلكتروني غير صحيح'
  }

  if (!password.value) {
    passwordError.value = 'يرجى إدخال كلمة المرور'
  }

  return !emailError.value && !passwordError.value
}

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const data = (err as { data?: { message?: unknown } }).data
    if (typeof data?.message === 'string' && data.message.trim().length > 0) {
      return data.message
    }
  }
  return 'البريد أو كلمة المرور غير صحيحة'
}

async function onSubmit() {
  if (submitting.value) return
  if (!validate()) return

  submitting.value = true
  formError.value = ''

  try {
    await login(email.value.trim().toLowerCase(), password.value)
    await navigateTo(resolveNextPath(route.query.next))
  } catch (err: unknown) {
    formError.value = extractErrorMessage(err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main
    dir="rtl"
    class="min-h-dvh w-full bg-serag-ivory text-serag-ink flex items-center justify-center p-4 sm:p-6 lg:p-10"
  >
    <div
      class="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 overflow-hidden rounded-[var(--radius-card)] border border-border shadow-xl bg-card"
    >
      <!-- Form Side -->
      <Card
        class="lg:col-span-7 border-0 rounded-none shadow-none py-8 px-6 sm:px-12 flex flex-col justify-center gap-6"
      >
        <CardHeader class="p-0 gap-2">
          <div class="flex items-center gap-3 mb-2">
            <div
              class="size-12 rounded-2xl bg-serag-green flex items-center justify-center font-num font-extrabold text-xl text-serag-gold-hi shadow-[inset_0_0_0_2px_rgba(210,194,122,0.45)]"
            >
              MS
            </div>
            <div class="flex flex-col leading-tight">
              <span class="font-display text-2xl text-serag-green">محمد سراج</span>
              <span class="font-num text-[11px] font-bold tracking-[3px] text-serag-gold-ink">
                ADMIN PORTAL
              </span>
            </div>
          </div>

          <CardTitle class="font-display text-4xl sm:text-5xl font-normal text-serag-green leading-none">
            تسجيل الدخول
          </CardTitle>
          <CardDescription class="text-base text-muted-foreground">
            لوحة تحكم معرض محمد سراج — سجّل دخولك لإدارة الطلبات والمنتجات
          </CardDescription>
        </CardHeader>

        <CardContent class="p-0">
          <form class="flex flex-col gap-5" method="post" novalidate @submit.prevent="onSubmit">
            <div
              v-if="formError"
              role="alert"
              class="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
            >
              {{ formError }}
            </div>

            <div class="flex flex-col gap-2">
              <Label for="admin-email" class="text-sm font-semibold">
                البريد الإلكتروني
              </Label>
              <Input
                id="admin-email"
                v-model="email"
                type="email"
                name="email"
                autocomplete="email"
                dir="ltr"
                placeholder="admin@serag.co"
                :disabled="submitting || !hydrated"
                :aria-invalid="Boolean(emailError)"
                :aria-describedby="emailError ? 'admin-email-error' : undefined"
                class="h-12 rounded-xl bg-serag-ivory/60 px-4 text-start"
              />
              <p
                v-if="emailError"
                id="admin-email-error"
                class="text-xs font-medium text-destructive"
              >
                {{ emailError }}
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <Label for="admin-password" class="text-sm font-semibold">
                كلمة المرور
              </Label>
              <div class="relative">
                <Input
                  id="admin-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  name="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  :disabled="submitting || !hydrated"
                  :aria-invalid="Boolean(passwordError)"
                  :aria-describedby="passwordError ? 'admin-password-error' : undefined"
                  class="h-12 rounded-xl bg-serag-ivory/60 ps-4 pe-12"
                />
                <button
                  type="button"
                  :disabled="submitting"
                  :aria-label="showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'"
                  class="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="size-5" aria-hidden="true" />
                  <Eye v-else class="size-5" aria-hidden="true" />
                </button>
              </div>
              <p
                v-if="passwordError"
                id="admin-password-error"
                class="text-xs font-medium text-destructive"
              >
                {{ passwordError }}
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              :disabled="submitting || !hydrated"
              class="mt-2 h-13 w-full rounded-full bg-serag-gold text-serag-ink font-bold text-base hover:bg-serag-gold-hi transition-all"
            >
              <Loader2 v-if="submitting" class="size-5 animate-spin" aria-hidden="true" />
              <span>{{ submitting ? 'جاري تسجيل الدخول...' : 'دخول' }}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <!-- Brand Panel -->
      <div
        class="lg:col-span-5 relative overflow-hidden bg-serag-deep text-serag-ivory p-8 sm:p-12 flex flex-col justify-between gap-10 min-h-[380px]"
      >
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -top-36 -left-36 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(181,164,92,0.3)_0%,rgba(181,164,92,0)_65%)]"
        />
        <div
          aria-hidden="true"
          class="pointer-events-none select-none absolute -bottom-10 left-1/2 -translate-x-1/2 font-num font-extrabold text-[180px] leading-[0.8] text-transparent [-webkit-text-stroke:2px_rgba(181,164,92,0.16)] tracking-tighter whitespace-nowrap"
        >
          1972
        </div>

        <div class="relative flex flex-col gap-4">
          <span class="font-num font-bold tracking-[4px] text-xs text-serag-gold-hi">
            MOHAMED SERAG · SINCE 1972
          </span>
          <h2 class="font-display text-4xl sm:text-5xl leading-tight">
            إدارة معرض
            <br>
            <span class="text-serag-gold-hi">محمد سراج</span>
          </h2>
          <p class="text-base leading-relaxed text-[#C9D5C6] max-w-sm">
            متابعة الطلبات، تأكيد التحويلات، إدارة باقات العروسة وتحديث المخزون والأسعار في مكان واحد.
          </p>
        </div>

        <ul class="relative flex flex-col gap-3.5 text-sm sm:text-base">
          <li class="flex items-center gap-3">
            <span
              class="size-8 rounded-full bg-serag-gold/20 text-serag-gold-hi flex items-center justify-center shrink-0"
            >
              <Check class="size-4" aria-hidden="true" />
            </span>
            <span>متابعة الطلبات وتأكيد الدفع بضغطة واحدة</span>
          </li>
          <li class="flex items-center gap-3">
            <span
              class="size-8 rounded-full bg-serag-gold/20 text-serag-gold-hi flex items-center justify-center shrink-0"
            >
              <Check class="size-4" aria-hidden="true" />
            </span>
            <span>إدارة حجوزات العروسة وفترة تثبيت الأسعار</span>
          </li>
          <li class="flex items-center gap-3">
            <span
              class="size-8 rounded-full bg-serag-gold/20 text-serag-gold-hi flex items-center justify-center shrink-0"
            >
              <Check class="size-4" aria-hidden="true" />
            </span>
            <span>تحديث الكتالوج وعروض الفلاش والكوبونات</span>
          </li>
        </ul>
      </div>
    </div>
  </main>
</template>
