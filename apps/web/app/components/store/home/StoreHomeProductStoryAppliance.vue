<script setup lang="ts">
import type { ProductStoryAppliance } from '@serag/shared'

defineProps<{
  kind: ProductStoryAppliance
}>()
</script>

<template>
  <div
    class="story-appliance-3d relative flex items-center justify-center select-none"
    style="width: min(70vw, 300px);"
    aria-hidden="true"
  >
    <!-- 1. FRIDGE -->
    <div
      v-if="kind === 'fridge'"
      class="relative h-[370px] w-[240px] rounded-[24px] border border-serag-ivory/20 bg-gradient-to-b from-[#2A2926] to-[#1E1D1B] p-3 shadow-2xl"
    >
      <!-- Interior shelves & items (behind doors) -->
      <div class="flex size-full flex-col justify-between overflow-hidden rounded-[16px] bg-[#171614] p-3">
        <!-- Top freezer compartment -->
        <div class="flex h-[32%] flex-col justify-between border-b border-serag-ivory/15 pb-2">
          <div class="flex justify-between px-1">
            <span class="size-2 rounded-full bg-serag-gold-hi/40" />
            <span class="size-2 rounded-full bg-serag-gold-hi/40" />
          </div>
          <!-- Ice tray / frozen item -->
          <div class="flex items-center gap-2 px-2">
            <div class="h-6 w-12 rounded-md border border-serag-ivory/20 bg-serag-ivory/10 shadow-xs" />
            <div class="h-5 w-8 rounded-md border border-serag-green/40 bg-serag-green/20" />
          </div>
        </div>

        <!-- Bottom fresh food compartment -->
        <div class="flex h-[64%] flex-col justify-between pt-1">
          <!-- Shelf 1 with bottles -->
          <div class="flex items-end gap-2 border-b border-serag-ivory/15 pb-2 px-2">
            <div class="h-9 w-4 rounded-sm border border-serag-gold/40 bg-serag-gold/25" />
            <div class="h-11 w-5 rounded-md border border-serag-ivory/30 bg-serag-ivory/15" />
            <div class="h-8 w-4 rounded-sm border border-serag-green/40 bg-serag-green/25" />
          </div>
          <!-- Shelf 2 with container -->
          <div class="flex items-center gap-2 border-b border-serag-ivory/15 pb-2 px-2">
            <div class="h-6 w-14 rounded-md border border-serag-gold-hi/30 bg-serag-gold-hi/15" />
            <div class="h-6 w-8 rounded-md border border-serag-ivory/25 bg-serag-ivory/10" />
          </div>
          <!-- Crisper drawer at bottom -->
          <div class="h-10 w-full rounded-lg border border-serag-green/35 bg-gradient-to-r from-serag-green/15 to-serag-gold/15 px-2 py-1 flex items-center justify-between">
            <div class="size-3 rounded-full bg-serag-green/50" />
            <div class="size-3 rounded-full bg-serag-gold-hi/50" />
            <div class="size-3 rounded-full bg-serag-hot/40" />
          </div>
        </div>
      </div>

      <!-- Top Door (Freezer) -->
      <div
        data-part="door-top"
        class="story-door-fridge-top absolute inset-x-0 top-0 h-[36%] rounded-t-[24px] rounded-b-[6px] border border-serag-ivory/30 bg-gradient-to-br from-[#ECE7DC] to-[#D5CDBE] p-3 shadow-xl"
      >
        <div class="relative size-full">
          <!-- Sleek handle on leading side -->
          <div class="absolute top-1/2 -translate-y-1/2 start-2 h-14 w-2 rounded-full border border-serag-ink/20 bg-serag-gold shadow-xs" />
          <!-- Subtle brand badge -->
          <div class="absolute top-2 end-2 size-2 rounded-full bg-serag-gold-ink/40" />
        </div>
      </div>

      <!-- Bottom Door (Fresh food) -->
      <div
        data-part="door-bottom"
        class="story-door-fridge-bottom absolute inset-x-0 bottom-0 h-[62%] rounded-t-[6px] rounded-b-[24px] border border-serag-ivory/30 bg-gradient-to-br from-[#ECE7DC] to-[#D5CDBE] p-3 shadow-xl"
      >
        <div class="relative size-full">
          <!-- Handle on leading side -->
          <div class="absolute top-8 start-2 h-20 w-2 rounded-full border border-serag-ink/20 bg-serag-gold shadow-xs" />
          <!-- Inner door bins when swung open -->
          <div class="absolute inset-y-4 end-2 flex flex-col justify-around w-10 opacity-30">
            <div class="h-8 rounded-sm border border-serag-ink/20 bg-serag-ivory/40" />
            <div class="h-10 rounded-sm border border-serag-ink/20 bg-serag-ivory/40" />
          </div>
        </div>
      </div>
    </div>

    <!-- 2. WASHER -->
    <div
      v-else-if="kind === 'washer'"
      class="relative h-[320px] w-[270px] rounded-[26px] border border-serag-ivory/30 bg-gradient-to-b from-[#FAF7F0] to-[#EAE4D5] p-4 shadow-2xl"
    >
      <!-- Top control strip -->
      <div class="flex h-12 items-center justify-between border-b border-serag-ink/10 pb-3">
        <!-- Detergent drawer -->
        <div class="h-7 w-14 rounded-md border border-serag-ink/15 bg-serag-cream shadow-xs px-1.5 py-1 flex items-center">
          <div class="h-1 w-6 rounded-full bg-serag-ink/20" />
        </div>
        <!-- Knobs & indicator -->
        <div class="flex items-center gap-2.5">
          <div class="size-2 rounded-full bg-serag-green animate-pulse-soft" />
          <div class="size-6 rounded-full border border-serag-gold bg-serag-cream shadow-xs flex items-center justify-center">
            <div class="h-2 w-0.5 rounded-full bg-serag-ink/60" />
          </div>
          <div class="size-5 rounded-full border border-serag-gold/70 bg-serag-cream shadow-xs flex items-center justify-center">
            <div class="h-1.5 w-0.5 rounded-full bg-serag-ink/60" />
          </div>
        </div>
      </div>

      <!-- Center drum housing cavity -->
      <div class="relative mx-auto mt-4 flex size-44 items-center justify-center rounded-full border-4 border-serag-gold/40 bg-[#161514] shadow-inner">
        <!-- Spinning drum inside -->
        <div
          data-part="drum"
          class="relative flex size-36 items-center justify-center rounded-full border border-serag-ivory/20 bg-[radial-gradient(circle_at_40%_35%,#3D3A35_0%,#1B1A18_100%)] shadow-md"
        >
          <!-- Perforations and paddles -->
          <div class="absolute inset-2 rounded-full border border-dashed border-serag-gold-hi/25" />
          <!-- Off-centre blob/paddle so spinning is clearly visible -->
          <div class="absolute top-4 end-5 size-7 rounded-full bg-gradient-to-br from-serag-green to-[#3D5B28] shadow-md border border-serag-ivory/30" />
          <div class="size-12 rounded-full border border-serag-ivory/15 bg-black/40 flex items-center justify-center">
            <div class="size-4 rounded-full bg-serag-gold/40" />
          </div>
        </div>

        <!-- Glass porthole door (opens outward) -->
        <div
          data-part="door"
          class="story-door-washer absolute inset-0 flex items-center justify-center rounded-full border-4 border-serag-gold-hi bg-serag-ivory/20 backdrop-blur-xs shadow-xl"
        >
          <!-- Door handle notch on opposite side -->
          <div class="absolute start-1 size-5 rounded-full border border-serag-gold bg-serag-cream shadow-sm" />
          <div class="size-28 rounded-full border border-serag-ivory/40 bg-gradient-to-tr from-serag-gold-hi/20 to-transparent" />
        </div>
      </div>
    </div>

    <!-- 3. COOKER -->
    <div
      v-else-if="kind === 'cooker'"
      class="relative h-[330px] w-[270px] rounded-[24px] border border-serag-ivory/25 bg-gradient-to-b from-[#2A2926] to-[#1E1D1B] p-4 shadow-2xl"
    >
      <!-- Cooktop with 4 burners -->
      <div class="grid h-28 grid-cols-2 gap-3 rounded-xl border border-serag-ivory/15 bg-[#141412] p-2.5">
        <div v-for="b in 4" :key="b" class="relative flex items-center justify-center rounded-lg border border-serag-ivory/10 bg-white/5">
          <!-- Cast iron grate circle -->
          <div class="size-9 rounded-full border border-serag-ivory/20 bg-black/50" />
          <!-- Flame above burner -->
          <div data-part="flame" class="absolute -top-1.5 flex justify-center">
            <svg viewBox="0 0 24 32" class="size-6 drop-shadow-[0_0_8px_rgba(228,87,46,0.8)]">
              <defs>
                <linearGradient :id="`flame-grad-${b}`" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stop-color="#E4572E" />
                  <stop offset="55%" stop-color="#F59E0B" />
                  <stop offset="100%" stop-color="#C9B189" />
                </linearGradient>
              </defs>
              <path
                d="M12 2C12 2 4 14 4 20C4 24.4 7.6 28 12 28C16.4 28 20 24.4 20 20C20 14 12 2 12 2Z"
                :fill="`url(#flame-grad-${b})`"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- Front control strip with 4 turning knobs -->
      <div class="mt-3 flex items-center justify-around border-y border-serag-ivory/15 py-2.5">
        <div
          v-for="k in 4"
          :key="k"
          data-part="knob"
          class="relative flex size-6 items-center justify-center rounded-full border border-serag-gold-hi/50 bg-[#141412] shadow-sm -rotate-120"
        >
          <!-- Pointer line -->
          <div class="absolute top-0.5 h-2 w-0.5 rounded-full bg-serag-gold-hi" />
        </div>
      </div>

      <!-- Oven window below -->
      <div class="relative mt-3 h-24 overflow-hidden rounded-xl border border-serag-ivory/20 bg-black/60 shadow-inner flex items-center justify-center">
        <!-- Warm interior oven glow -->
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,177,137,0.2)_0%,transparent_75%)]" />
        <!-- Oven handle -->
        <div class="absolute top-2 inset-x-6 h-1.5 rounded-full bg-serag-gold-hi/50 shadow-xs" />
        <!-- Oven rack wire line -->
        <div class="w-4/5 border-t border-dashed border-serag-ivory/20" />
      </div>
    </div>

    <!-- 4. TV -->
    <div
      v-else-if="kind === 'tv'"
      class="relative flex flex-col items-center w-[290px]"
    >
      <!-- Thin frame casing -->
      <div class="relative w-full rounded-[14px] border border-serag-ivory/30 bg-[#0F0F0E] p-1.5 shadow-2xl">
        <!-- Screen -->
        <div
          data-part="screen"
          class="relative aspect-[16/10] w-full overflow-hidden rounded-[10px] bg-[#141412] flex items-center justify-center border border-white/5"
        >
          <!-- Screen glow layer -->
          <div
            data-part="glow"
            class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(85,120,64,0.45)_0%,rgba(201,177,137,0.35)_45%,transparent_75%)]"
          />

          <!-- Abstract picture inside screen -->
          <div class="relative flex flex-col items-center justify-center gap-1.5 text-center">
            <!-- Glowing geometric emblem -->
            <div class="size-12 rounded-full border border-serag-gold-hi/50 bg-serag-gold/20 flex items-center justify-center shadow-[0_0_16px_rgba(201,177,137,0.35)]">
              <span class="font-display text-sm font-bold text-serag-ivory">MS</span>
            </div>
            <div class="h-1 w-16 rounded-full bg-gradient-to-r from-transparent via-serag-gold-hi to-transparent opacity-80" />
          </div>

          <!-- Bottom subtle screen scanline aesthetic -->
          <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px]" />
        </div>

        <!-- Stand connection / power LED -->
        <div class="flex items-center justify-between px-3 pt-1">
          <span class="text-[9px] font-bold tracking-widest text-serag-gold-hi/60 uppercase">SERAG</span>
          <span class="size-1.5 rounded-full bg-serag-green animate-pulse-soft" />
        </div>
      </div>

      <!-- TV pedestal stand -->
      <div class="h-3 w-28 rounded-full border border-serag-gold/40 bg-gradient-to-r from-serag-gold/30 via-serag-gold-hi to-serag-gold/30 shadow-md -mt-0.5" />
    </div>

    <!-- 5. AC -->
    <div
      v-else-if="kind === 'ac'"
      class="relative flex flex-col items-center w-[290px]"
    >
      <!-- Main indoor split unit body -->
      <div class="relative h-28 w-full rounded-[22px] border border-serag-ivory/35 bg-gradient-to-b from-[#FAF7F0] to-[#EAE4D5] p-3 shadow-2xl flex flex-col justify-between">
        <!-- Top intake grille lines -->
        <div class="flex justify-between gap-1 px-4 opacity-40">
          <div v-for="l in 7" :key="l" class="h-1 flex-1 rounded-full bg-serag-ink/30" />
        </div>

        <!-- Center panel with digital display & brand -->
        <div class="flex items-center justify-between px-4">
          <span class="font-display text-xs font-bold tracking-wider text-serag-gold-ink">SERAG</span>
          <!-- LED temperature readout -->
          <div class="flex items-center gap-1.5 rounded-md border border-serag-green/30 bg-[#161514] px-2 py-0.5 shadow-inner">
            <span class="num text-xs font-extrabold text-serag-green">24°</span>
            <span class="size-1.5 rounded-full bg-serag-green animate-pulse-soft" />
          </div>
        </div>

        <!-- Louver (bottom flap) -->
        <div
          data-part="louver"
          class="story-louver-open h-3.5 w-full rounded-b-md border-t border-black/15 bg-gradient-to-r from-serag-gold/60 via-serag-gold-hi to-serag-gold/60 shadow-sm"
        />
      </div>

      <!-- Flowing air waves SVG below louver -->
      <div class="relative -mt-1 h-20 w-48 overflow-visible">
        <svg viewBox="0 0 200 80" class="size-full overflow-visible" fill="none">
          <defs>
            <linearGradient id="air-wave-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#C9B189" stop-opacity="0.9" />
              <stop offset="60%" stop-color="#557840" stop-opacity="0.6" />
              <stop offset="100%" stop-color="#C9B189" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path
            data-part="air"
            d="M 40 4 Q 45 28, 30 52 T 20 76"
            stroke="url(#air-wave-grad)"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-dasharray="60"
            stroke-dashoffset="0"
          />
          <path
            data-part="air"
            d="M 100 4 Q 105 28, 100 52 T 95 76"
            stroke="url(#air-wave-grad)"
            stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray="60"
            stroke-dashoffset="0"
          />
          <path
            data-part="air"
            d="M 160 4 Q 155 28, 170 52 T 180 76"
            stroke="url(#air-wave-grad)"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-dasharray="60"
            stroke-dashoffset="0"
          />
        </svg>
      </div>
    </div>
  </div>
</template>
