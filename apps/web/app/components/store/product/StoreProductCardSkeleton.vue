<template>
  <!-- Same box sizes as StoreProductCard, so the grid does not jump when products arrive -->
  <div class="flex flex-col rounded-[20px] border border-border bg-card p-2.5 sm:rounded-[26px] sm:p-4">
    <Skeleton class="aspect-square w-full rounded-2xl sm:rounded-[20px]" />
    <div class="mt-2.5 flex items-center justify-between sm:mt-4">
      <Skeleton class="h-3 w-14 sm:h-3.5 sm:w-16" />
      <Skeleton class="h-3 w-10 sm:w-12" />
    </div>
    <Skeleton class="mt-2 h-3.5 w-full sm:h-4" />
    <Skeleton class="mt-1.5 h-3.5 w-2/3 sm:h-4" />
    <Skeleton class="mt-3.5 h-6 w-24 sm:mt-4 sm:h-7 sm:w-28" />
    <Skeleton class="mt-1.5 h-3 w-16" />
    <div class="mt-2.5 flex gap-1.5 sm:mt-3.5 sm:gap-2">
      <Skeleton class="h-10 flex-1 rounded-xl sm:h-[52px] sm:rounded-2xl" />
      <Skeleton class="size-10 shrink-0 rounded-xl sm:size-[52px] sm:rounded-2xl" />
    </div>
  </div>
</template>
