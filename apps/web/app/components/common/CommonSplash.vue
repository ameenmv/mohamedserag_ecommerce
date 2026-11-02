<script setup lang="ts">
/**
 * Storefront splash screen: the four appliance cards drop into a deck, fan out,
 * show the brand marks, then fly into the hero art positions as the background fades.
 * CSS only (main.css, "Splash"), rendered with hydrate-never (app.vue) so zero JS ships.
 */
const { t } = useI18n()

// Measures the hero cards just before the landing and hands their geometry to the splash cards
// (see "Splash: the hero cards" in main.css). A plain inline script in this server-only markup
// (the component is never hydrated), so it costs no client JavaScript: registering it through
// useHead pulled a shared chunk into the home's first load. The hero is already parsed when it
// runs (the splash comes after the page in app.vue); the CSP hashes it like every inline script.
const LAND_SCRIPT = "try{var d=document.documentElement,s=document.querySelector('.splash');if(s&&!d.classList.contains('splash-seen')&&!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)){d.classList.add('splash-landing');setTimeout(function(){try{var c=['fridges','washers','screens','acs'],h=[],p=[],iw=window.innerWidth,ih=window.innerHeight;for(var i=0;i<c.length;i++){var he=document.querySelector('[data-hero-card=\"'+c[i]+'\"]'),se=document.querySelector('[data-splash-card=\"'+c[i]+'\"]');if(!he||!se)return;var r=he.getBoundingClientRect();if(r.top<0||r.bottom>ih||r.left<0||r.right>iw)return;h.push(he);p.push(se)}for(var j=0;j<c.length;j++){var el=h[j],sp=p[j],rc=el.getBoundingClientRect(),cs=window.getComputedStyle(el);sp.style.setProperty('--land-x',(rc.left+rc.width/2-iw/2)+'px');sp.style.setProperty('--land-y',(rc.top+rc.height/2-ih/2)+'px');sp.style.setProperty('--land-w',el.offsetWidth+'px');sp.style.setProperty('--land-h',el.offsetHeight+'px');sp.style.setProperty('--land-r',cs.getPropertyValue('--tilt').trim()||'0deg');sp.style.setProperty('--land-rad',cs.borderTopLeftRadius)}s.setAttribute('data-land','hero')}catch(e){}},950);setTimeout(function(){d.classList.remove('splash-landing')},2000)}}catch(e){}"
// A render function: templates drop <script> tags, the server renderer outputs this one as is
const LandScript = () => h('script', { innerHTML: LAND_SCRIPT })
</script>

<template>
  <div
    class="splash pointer-events-none fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
    aria-hidden="true"
  >
    <!-- Center brand showcase: rises above the fan, fades before landing fly -->
    <div class="splash-logo absolute flex flex-col items-center text-center">
      <svg class="splash-mark aspect-[268/260] w-14 lg:w-[72px]" focusable="false">
        <use href="#brand-mark" />
      </svg>
      <div class="splash-wordmark-wrap mt-3.5 lg:mt-5">
        <svg class="splash-wordmark aspect-[688/267] w-[170px] text-serag-ivory lg:w-[220px]" focusable="false">
          <use href="#brand-wordmark" />
        </svg>
      </div>
    </div>

    <!-- Cards deck: drops, fans out, flies into hero, morphs/lands on matching hero card -->
    <div class="splash-deck">
      <!-- 1. Fridge -->
      <div data-splash-card="fridges" class="splash-card splash-card-1 gap-4 border border-serag-gold-hi/55 bg-gradient-to-b from-[#4F7F1B] to-[#1B3526] text-serag-gold-hi">
        <svg viewBox="0 0 48 48" class="w-[64%]" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="13" y="4" width="22" height="40" rx="3" />
          <path d="M13 20h22M18 10v6M18 25v8" />
        </svg>
        <span class="rounded-full bg-black/30 px-4 py-1.5 text-sm font-bold text-serag-ivory sm:text-base">
          {{ t('store.home.heroArt.fridges') }}
        </span>
      </div>

      <!-- 2. Washer -->
      <div data-splash-card="washers" class="splash-card splash-card-2 gap-3 border border-[#E4DDC6] bg-serag-ivory text-serag-green">
        <svg viewBox="0 0 48 48" class="w-[56%]" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="4" width="30" height="40" rx="4" />
          <circle cx="24" cy="28" r="10" />
          <circle cx="24" cy="28" r="5" />
          <path d="M15 11h8M31 11h2" />
        </svg>
        <span class="text-sm font-bold sm:text-[15px]">
          {{ t('store.home.heroArt.washers') }}
        </span>
      </div>

      <!-- 3. Screen -->
      <div data-splash-card="screens" class="splash-card splash-card-3 gap-2.5 bg-serag-gold text-serag-ink">
        <svg viewBox="0 0 48 48" class="w-[62%]" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="8" width="40" height="27" rx="3" />
          <path d="M16 42h16M24 35v7" />
        </svg>
        <span class="text-sm font-bold sm:text-[15px]">
          {{ t('store.home.heroArt.screens') }}
        </span>
      </div>

      <!-- 4. AC -->
      <div data-splash-card="acs" class="splash-card splash-card-4 gap-2 border border-serag-ivory/25 bg-serag-ivory/8 text-serag-ivory backdrop-blur-sm">
        <svg viewBox="0 0 48 48" class="w-1/2" fill="none" stroke="var(--color-serag-gold-hi)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="10" width="40" height="16" rx="3" />
          <path d="M10 21h28M14 32c2 3 2 5 0 8M24 32c2 3 2 5 0 8M34 32c2 3 2 5 0 8" />
        </svg>
        <span class="text-xs font-bold sm:text-sm">
          {{ t('store.home.heroArt.acs') }}
        </span>
      </div>
    </div>
    <LandScript />
  </div>
</template>
