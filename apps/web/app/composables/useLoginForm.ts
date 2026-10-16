/**
 * Encapsulates admin login form state, client-side validation, hydration guard,
 * submission handling, and redirect.
 */
export function useLoginForm() {
  const route = useRoute()
  const config = useRuntimeConfig()
  const { login } = useAdminAuth()
  const { t } = useI18n()
  const localePath = useLocalePath()

  const devLogin = config.public.devLogin

  const email = ref(devLogin?.email ?? '')
  const password = ref(devLogin?.password ?? '')
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

  function validate(): boolean {
    emailError.value = ''
    passwordError.value = ''
    formError.value = ''

    const trimmedEmail = email.value.trim()
    if (!trimmedEmail) {
      emailError.value = t('validation.emailRequired')
    } else if (!isValidEmail(trimmedEmail)) {
      emailError.value = t('validation.emailInvalid')
    }

    if (!password.value) {
      passwordError.value = t('validation.passwordRequired')
    }

    return !emailError.value && !passwordError.value
  }

  async function submit(): Promise<boolean> {
    if (submitting.value) return false
    if (!validate()) return false

    submitting.value = true
    formError.value = ''

    try {
      await login(email.value.trim().toLowerCase(), password.value)
      const next = resolveNextPath(route.query.next, localePath('/admin'))
      await navigateTo(next)
      return true
    } catch (err: unknown) {
      formError.value = t(loginErrorKey(err))
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    email,
    password,
    submitting,
    hydrated,
    emailError,
    passwordError,
    formError,
    submit,
  }
}
