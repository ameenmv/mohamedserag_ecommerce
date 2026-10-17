<script setup lang="ts">
import { Loader2 } from '@lucide/vue'

const { t } = useI18n()

const {
  email,
  password,
  submitting,
  hydrated,
  emailError,
  passwordError,
  formError,
  submit,
} = useLoginForm()
</script>

<template>
  <Card
    class="lg:col-span-7 border-0 rounded-none shadow-none py-8 px-6 sm:px-12 flex flex-col justify-center gap-6"
  >
    <CardHeader class="p-0 gap-2">
      <div class="flex items-center justify-between gap-3">
        <AdminLoginBrandHeader />
        <CommonLocaleSwitcher variant="pill" />
      </div>

      <CardTitle class="font-display text-4xl sm:text-5xl font-normal text-serag-green leading-none">
        {{ t('admin.login.title') }}
      </CardTitle>
      <CardDescription class="text-base text-muted-foreground">
        {{ t('admin.login.subtitle') }}
      </CardDescription>
    </CardHeader>

    <CardContent class="p-0">
      <form class="flex flex-col gap-5" method="post" novalidate @submit.prevent="submit">
        <FormAlert v-if="formError" :message="formError" />

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
              name="email"
              autocomplete="email"
              dir="ltr"
              placeholder="admin@serag.co"
              :disabled="submitting || !hydrated"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
              class="h-12 rounded-xl bg-serag-ivory/60 px-4 text-start"
            />
          </template>
        </FormField>

        <FormField
          id="admin-password"
          :label="t('admin.login.password')"
          :error="passwordError"
        >
          <template #default="{ id, invalid, describedBy }">
            <FormPasswordInput
              :id="id"
              v-model="password"
              name="password"
              autocomplete="current-password"
              placeholder="••••••••"
              :disabled="submitting || !hydrated"
              :aria-invalid="invalid"
              :aria-describedby="describedBy"
            />
          </template>
        </FormField>

        <Button
          type="submit"
          size="lg"
          :disabled="submitting || !hydrated"
          class="mt-2 h-13 w-full rounded-full bg-serag-gold text-serag-ink font-bold text-base hover:bg-serag-gold-hi transition-all"
        >
          <Loader2 v-if="submitting" class="size-5 animate-spin" aria-hidden="true" />
          <span>{{ submitting ? t('admin.login.submitting') : t('admin.login.submit') }}</span>
        </Button>
      </form>
    </CardContent>
  </Card>
</template>
