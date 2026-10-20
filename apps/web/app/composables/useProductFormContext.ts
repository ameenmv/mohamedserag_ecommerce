import type { InjectionKey } from 'vue'
import type { useProductForm } from './useProductForm'

export type ProductFormContext = ReturnType<typeof useProductForm>

export const ProductFormKey: InjectionKey<ProductFormContext> = Symbol('ProductFormKey')

export function provideProductForm(ctx: ProductFormContext): void {
  provide(ProductFormKey, ctx)
}

export function useProductFormContext(): ProductFormContext {
  const ctx = inject(ProductFormKey)
  if (!ctx) {
    throw new Error(
      'useProductFormContext must be called within an AdminProductsEditor component tree',
    )
  }
  return ctx
}
