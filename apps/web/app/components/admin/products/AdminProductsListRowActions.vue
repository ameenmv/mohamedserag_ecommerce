<script setup lang="ts">
import type { AdminProductListItem } from '@serag/shared'
import {
  Archive,
  ArchiveRestore,
  Edit,
  Eye,
  EyeOff,
  MoreHorizontal,
  Trash2,
} from '@lucide/vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const props = defineProps<{
  product: AdminProductListItem
}>()

const emit = defineEmits<{
  toggleVisibility: [product: AdminProductListItem]
  toggleArchive: [product: AdminProductListItem]
  deleteProduct: [product: AdminProductListItem]
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-8 rounded-lg text-muted-foreground hover:text-foreground"
        :aria-label="t('admin.products.list.actionsFor', { name: props.product.name })"
      >
        <MoreHorizontal class="size-4" aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-44 text-sm font-medium">
      <!-- Edit Link -->
      <DropdownMenuItem as-child>
        <NuxtLink
          :to="localePath(`/admin/products/${props.product.id}`)"
          class="flex w-full items-center gap-2 cursor-pointer"
        >
          <Edit class="size-4 text-muted-foreground" aria-hidden="true" />
          <span>{{ t('admin.products.actions.edit') }}</span>
        </NuxtLink>
      </DropdownMenuItem>

      <!-- Toggle Visibility -->
      <DropdownMenuItem
        class="flex items-center gap-2 cursor-pointer"
        @select="emit('toggleVisibility', props.product)"
      >
        <EyeOff v-if="props.product.visible" class="size-4 text-muted-foreground" aria-hidden="true" />
        <Eye v-else class="size-4 text-muted-foreground" aria-hidden="true" />
        <span>
          {{
            props.product.visible
              ? t('admin.products.actions.hide')
              : t('admin.products.actions.show')
          }}
        </span>
      </DropdownMenuItem>

      <!-- Toggle Archive -->
      <DropdownMenuItem
        class="flex items-center gap-2 cursor-pointer"
        @select="emit('toggleArchive', props.product)"
      >
        <ArchiveRestore v-if="props.product.archived" class="size-4 text-muted-foreground" aria-hidden="true" />
        <Archive v-else class="size-4 text-muted-foreground" aria-hidden="true" />
        <span>
          {{
            props.product.archived
              ? t('admin.products.actions.unarchive')
              : t('admin.products.actions.archive')
          }}
        </span>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <!-- Delete -->
      <DropdownMenuItem
        class="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
        @select="emit('deleteProduct', props.product)"
      >
        <Trash2 class="size-4" aria-hidden="true" />
        <span>{{ t('admin.products.actions.delete') }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
