/* =========================================================
   إعدادات المتجر — غيّر الأرقام هنا مرة واحدة وتتطبق على كل الصفحات
   Store config — single source of truth + Mobile & Animation Engine
   ========================================================= */
window.SERAG = {
  whatsapp: '201000000000',        // رقم الواتساب بصيغة دولية بدون + (مؤقت)
  phone: '01000000000',            // رقم الاتصال (مؤقت)
  pay: {
    instapay: { name: 'إنستا باي', account: 'serag@instapay', hint: 'حوّل على عنوان الدفع ده من تطبيق إنستا باي' },
    vfcash:   { name: 'فودافون كاش', account: '01000000000', hint: 'حوّل من محفظتك على الرقم ده' },
    fawry:    { name: 'فوري', account: '000000000', hint: 'ادفع بالكود ده من أي فرع أو تطبيق فوري' }
  },
  zones: [
    { name: 'المنصورة', desc: 'المنصورة وطلخا', price: 100 },
    { name: 'مراكز الدقهلية', desc: 'ميت غمر، السنبلاوين، دكرنس، المنزلة…', price: 150 },
    { name: 'باقي الدلتا', desc: 'الغربية، دمياط، الشرقية، كفر الشيخ…', price: 250 },
    { name: 'باقي مصر', desc: 'القاهرة، الإسكندرية، القناة، الصعيد…', price: 400 }
  ],
  waLink: function (text) {
    return 'https://wa.me/' + this.whatsapp + (text ? '?text=' + encodeURIComponent(text) : '');
  }
};

/* =========================================================
   SERAG PREMIUM UI, ANIMATIONS & MOBILE ENGINE
   ========================================================= */
(function () {
  var C = window.SERAG;

  var css = `
/* ===== GLOBAL PREMIUM SMOOTHNESS & TEXTURE ===== */
html { scroll-behavior: smooth; -webkit-tap-highlight-color: transparent; }
::selection { background: #B5A45C; color: #14201A; }

/* Subtle gold scrollbar */
::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-track { background: #FAF7EE; }
::-webkit-scrollbar-thumb { background: #C8BA7B; border-radius: 999px; border: 2px solid #FAF7EE; }
::-webkit-scrollbar-thumb:hover { background: #2A4D38; }

/* Scroll progress bar */
#sr-prog {
  position: fixed; top: 0; right: 0; height: 3.5px; z-index: 9998;
  background: linear-gradient(90deg, #D2C27A 0%, #B5A45C 50%, #2A4D38 100%);
  width: 0%; transition: width .08s linear; pointer-events: none;
  box-shadow: 0 1px 8px rgba(181,164,92,.6);
}

/* Sticky Frosted Header */
header {
  position: sticky !important; top: 0; z-index: 800;
  transition: background .3s ease, box-shadow .3s ease, border-color .3s ease;
}
body.sr-scrolled header {
  background: rgba(255,255,255,.92) !important;
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 14px 34px -18px rgba(20,32,26,.16);
  border-bottom-color: rgba(228,221,198,.8) !important;
}

/* ===== ENHANCED ANIMATIONS & MICRO-INTERACTIONS ===== */
.tile, .pcard, .how-step, .opt {
  transition: transform .38s cubic-bezier(.22,1,.36,1), box-shadow .38s cubic-bezier(.22,1,.36,1), border-color .3s ease, background .3s ease !important;
  will-change: transform;
}
.tile:hover {
  transform: translateY(-9px) scale(1.015) !important;
  border-color: #B5A45C !important;
  box-shadow: 0 26px 46px -18px rgba(20,32,26,.28), 0 0 0 1px rgba(181,164,92,.35) !important;
}
.tile > div:first-child {
  transition: transform .4s cubic-bezier(.22,1,.36,1), background .35s ease, color .35s ease;
}
.tile:hover > div:first-child {
  transform: scale(1.1) rotate(-6deg);
  background: #2A4D38 !important;
  color: #D2C27A !important;
}
.pcard:hover {
  transform: translateY(-8px) !important;
  border-color: #B5A45C !important;
  box-shadow: 0 30px 54px -22px rgba(20,32,26,.34), 0 0 0 1px rgba(181,164,92,.25) !important;
}
.pcard > div:first-child svg {
  transition: transform .5s cubic-bezier(.22,1,.36,1);
}
.pcard:hover > div:first-child > svg,
.pcard:hover > div:first-child > a > svg {
  transform: scale(1.08) translateY(-3px);
}

/* Shimmer on primary gold buttons */
.btn-gold {
  position: relative; overflow: hidden;
  transition: transform .25s cubic-bezier(.22,1,.36,1), background .25s ease, box-shadow .25s ease !important;
}
.btn-gold::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,.42) 50%, transparent 75%);
  transform: translateX(130%); transition: transform .65s ease; pointer-events: none;
}
.btn-gold:hover {
  transform: translateY(-3px) !important;
  background: #D2C27A !important;
  box-shadow: 0 16px 32px -12px rgba(181,164,92,.65) !important;
}
.btn-gold:hover::after { transform: translateX(-130%); }
.btn-gold:active, .btn-add:active, .btn-wa:active, .btn-line:active, .round-add:active, button:active {
  transform: scale(.96) !important;
}

/* Navlink underline reveal */
.navlink { position: relative; transition: color .2s ease !important; }
.nav-row .navlink::after {
  content: ""; position: absolute; bottom: 8px; right: 16px; left: 16px; height: 2px;
  background: #D2C27A; border-radius: 2px; transform: scaleX(0); transform-origin: right;
  transition: transform .28s cubic-bezier(.22,1,.36,1);
}
.nav-row .navlink:hover::after { transform: scaleX(1); }

/* Staggered Scroll Reveal */
.rv {
  opacity: 0; transform: translateY(32px) scale(.985);
  transition: opacity .75s cubic-bezier(.22,1,.36,1), transform .75s cubic-bezier(.22,1,.36,1);
  transition-delay: var(--d, 0ms);
}
.rv.in { opacity: 1; transform: none; }

/* Hero entrance animation */
@keyframes srHeroUp {
  from { opacity: 0; transform: translateY(26px); }
  to { opacity: 1; transform: translateY(0); }
}
section[style*="background:#16291E"] h1 { animation: srHeroUp .75s cubic-bezier(.22,1,.36,1) .05s both; }
section[style*="background:#16291E"] p { animation: srHeroUp .75s cubic-bezier(.22,1,.36,1) .16s both; }

/* Toast Notification */
#sr-toast {
  position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-130%);
  z-index: 10000; background: #14201A; color: #FAF7EE; border: 1.5px solid #B5A45C;
  border-radius: 999px; padding: 12px 22px; display: flex; align-items: center; gap: 12px;
  font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif; font-weight: 700; font-size: 15px;
  box-shadow: 0 24px 48px -12px rgba(0,0,0,.55);
  transition: transform .42s cubic-bezier(.22,1,.36,1), opacity .3s ease;
  opacity: 0; pointer-events: none; white-space: nowrap; max-width: 92vw;
}
#sr-toast.show { transform: translateX(-50%) translateY(0); opacity: 1; pointer-events: auto; }
#sr-toast .ok {
  width: 26px; height: 26px; border-radius: 50%; background: #B5A45C; color: #14201A;
  display: flex; align-items: center; justify-content: center; flex: none;
}

/* ===== FLOATING WA (DESKTOP) ===== */
#wa-float {
  position: fixed; bottom: 26px; left: 26px; z-index: 900; width: 62px; height: 62px;
  border-radius: 50%; background: #16A34A; color: #fff; display: flex; align-items: center;
  justify-content: center; box-shadow: 0 18px 36px -10px rgba(22,163,74,.75);
  transition: transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s ease;
}
#wa-float:hover { transform: scale(1.1) translateY(-3px); box-shadow: 0 24px 44px -10px rgba(22,163,74,.9); }
#wa-float::before {
  content: ""; position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid #16A34A; animation: srPing 2.2s ease-out infinite;
}
@keyframes srPing { 0% { transform: scale(.92); opacity: .9; } 100% { transform: scale(1.55); opacity: 0; } }
#wa-float .tip {
  position: absolute; left: 74px; white-space: nowrap; background: #14201A; color: #FAF7EE;
  font-size: 14px; font-weight: 600; padding: 8px 14px; border-radius: 12px; opacity: 0;
  transform: translateX(-6px); transition: all .25s ease; pointer-events: none;
  font-family: 'IBM Plex Sans Arabic', sans-serif; border: 1px solid rgba(210,194,122,.35);
}
#wa-float:hover .tip { opacity: 1; transform: none; }

/* ===== MOBILE MENU BUTTON & DRAWER ===== */
#sr-mbtn {
  display: none; width: 44px; height: 44px; border-radius: 14px;
  border: 1.5px solid #E4DDC6; background: #FAF7EE; color: #2A4D38;
  align-items: center; justify-content: center; padding: 0; flex: none;
}
#sr-drawer-bg {
  position: fixed; inset: 0; z-index: 9990; background: rgba(10,18,13,.65);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  opacity: 0; pointer-events: none; transition: opacity .32s ease;
}
#sr-drawer-bg.open { opacity: 1; pointer-events: auto; }
#sr-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; width: min(340px, 86vw); z-index: 9995;
  background: #FAF7EE; color: #14201A; font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif;
  transform: translateX(105%); transition: transform .38s cubic-bezier(.22,1,.36,1), visibility .38s;
  display: flex; flex-direction: column; box-shadow: none; visibility: hidden; pointer-events: none;
  overflow-y: auto;
}
#sr-drawer-bg.open + #sr-drawer { transform: translateX(0); box-shadow: -24px 0 60px rgba(0,0,0,.45); visibility: visible; pointer-events: auto; }

/* ===== MOBILE QUICK CATEGORY STRIP (UNDER HEADER) ===== */
#sr-mstrip {
  display: none; background: #16291E; border-bottom: 1px solid rgba(210,194,122,.22);
  overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none;
  padding: 9px 14px; gap: 8px; align-items: center;
  font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif;
}
#sr-mstrip::-webkit-scrollbar { display: none; }
#sr-mstrip a {
  flex: none; display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;
  color: #EAE3C8; background: rgba(250,247,238,.07); border: 1px solid rgba(250,247,238,.14);
  white-space: nowrap; transition: all .2s ease;
}
#sr-mstrip a.gold {
  background: rgba(181,164,92,.22); border-color: rgba(210,194,122,.55); color: #D2C27A; font-weight: 700;
}
#sr-mstrip a.hot {
  background: rgba(228,87,46,.2); border-color: rgba(228,87,46,.5); color: #FFAB91; font-weight: 700;
}

/* ===== MOBILE BOTTOM DOCK (#mnav) ===== */
#mnav { display: none; }

/* ===== SHOP FILTER DRAWER BUTTON (MOBILE) ===== */
#sr-filter-btn { display: none; }
#sr-fbackdrop {
  display: none; position: fixed; inset: 0; z-index: 950;
  background: rgba(10,18,13,.6); backdrop-filter: blur(5px);
}

/* =========================================================
   MOBILE RESPONSIVE OVERHAUL (<= 860px & <= 768px)
   ========================================================= */
@media (max-width: 860px) {
  #wa-float { display: none !important; }
  .nav-row { display: none !important; }
  .hide-m { display: none !important; }
  #sr-mbtn { display: inline-flex !important; }
  #sr-mstrip { display: flex !important; }
  body { padding-bottom: 84px !important; }

  /* Premium App-like Floating Bottom Navigation */
  #mnav {
    display: flex !important; position: fixed; bottom: 0; left: 0; right: 0; z-index: 900;
    background: rgba(20, 32, 26, .95) !important;
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    border-top: 1px solid rgba(210,194,122,.28) !important;
    padding: 7px 8px calc(8px + env(safe-area-inset-bottom)) !important;
    justify-content: space-around; align-items: center;
    font-family: 'IBM Plex Sans Arabic', sans-serif;
    box-shadow: 0 -14px 36px rgba(0,0,0,.28);
  }
  #mnav a {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
    font-size: 11px; font-weight: 600; color: #B9C7B6 !important; padding: 4px 0;
    position: relative; transition: color .2s ease, transform .2s ease;
  }
  #mnav a.active { color: #D2C27A !important; font-weight: 700; }
  #mnav a.active::after {
    content: ""; position: absolute; bottom: -2px; width: 16px; height: 3px;
    border-radius: 99px; background: #D2C27A;
  }
  #mnav a svg { width: 22px; height: 22px; }
  #mnav a.wa { color: #fff !important; }
  #mnav a.wa span.b {
    width: 54px; height: 54px; margin-top: -28px; border-radius: 50%;
    background: linear-gradient(145deg, #22C55E, #15803D) !important;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 10px 24px -4px rgba(22,163,74,.85) !important;
    border: 3.5px solid #FAF7EE !important; color: #fff;
  }
  #mnav a.wa em { color: #86EFAC !important; font-style: normal; font-weight: 700; }
}

@media (max-width: 768px) {
  /* Announcement Bar: sleek single line */
  div[style*="background:#0E1A13"] > div {
    padding: 7px 14px !important; font-size: 12px !important;
    justify-content: space-between !important; gap: 6px !important;
  }

  /* Header Compact 2-Row Layout */
  header > div {
    padding: 10px 14px 12px !important; gap: 10px 10px !important;
    justify-content: space-between !important;
  }
  /* Logo compact */
  header > div > a[href*="index"], header > div > a[href="#top"] {
    gap: 10px !important; margin-left: auto;
  }
  header > div > a > div:first-child {
    width: 44px !important; height: 44px !important; border-radius: 13px !important; font-size: 19px !important;
  }
  header > div > a span[style*="Lalezar"] { font-size: 24px !important; }
  header > div > a span[style*="SINCE"] { font-size: 9.5px !important; letter-spacing: 2px !important; }

  /* Header Action Icons row (stay on row 1 next to logo) */
  header > div > div:last-of-type {
    gap: 7px !important; order: 2;
  }
  header > div > div:last-of-type > a,
  header > div > div:last-of-type > button {
    width: 42px !important; height: 42px !important; border-radius: 12px !important;
  }
  /* Cart button in header: compact pill */
  header > div > div:last-of-type > a[href="cart.html"] {
    width: auto !important; padding: 0 13px !important; height: 42px !important;
    font-size: 13.5px !important; gap: 6px !important;
  }

  /* Search Bar: Row 2 full width, sleek height */
  header form, header > div > div[style*="flex:1 1 360px"] {
    order: 3; flex: 1 1 100% !important;
    padding: 4px 6px 4px 12px !important; border-radius: 16px !important;
  }
  header input[type="search"] {
    font-size: 14.5px !important; padding: 7px 10px !important;
  }
  header form button[type="submit"],
  header > div > div[style*="flex:1 1 360px"] > a {
    width: 36px !important; height: 36px !important; flex: none;
  }

  /* Global Section Paddings */
  div[style*="max-width:1280px"], div[style*="max-width:1100px"], div[style*="max-width:900px"] {
    padding-left: 16px !important; padding-right: 16px !important;
  }
  section > div[style*="padding:104px"],
  section > div[style*="padding:96px"],
  section > div[style*="padding:88px"],
  section > div[style*="padding:80px"] {
    padding-top: 52px !important; padding-bottom: 52px !important;
  }

  /* ===== HERO SECTION ON MOBILE: SHOW FLOATING SHOWCASE! ===== */
  section[style*="background:#16291E"] > div[style*="max-width:1280px"] {
    padding: 28px 16px 40px !important; gap: 28px !important;
  }
  section[style*="background:#16291E"] div[style*="flex:1 1 520px"] {
    gap: 18px !important; text-align: center; align-items: center;
  }
  section[style*="background:#16291E"] h1 {
    font-size: clamp(46px, 13.5vw, 68px) !important; line-height: 1 !important;
  }
  section[style*="background:#16291E"] p {
    font-size: 15.5px !important; line-height: 1.75 !important;
  }
  /* Hero CTA buttons side by side on mobile */
  section[style*="background:#16291E"] div[style*="flex:1 1 520px"] > div[style*="display:flex;flex-wrap:wrap;gap:14px"] {
    width: 100%; display: grid !important; grid-template-columns: 1.15fr 1fr; gap: 10px !important;
  }
  section[style*="background:#16291E"] a[style*="padding:18px 34px"] {
    width: 100% !important; padding: 14px 12px !important; font-size: 15px !important;
    justify-content: center; border-radius: 16px !important;
  }
  /* Hero stats: 3 clean columns */
  div[style*="gap:36px;margin-top:12px"] {
    width: 100%; display: grid !important; grid-template-columns: repeat(3, 1fr);
    gap: 8px !important; padding-top: 20px !important; margin-top: 6px !important;
    text-align: center;
  }
  div[style*="gap:36px;margin-top:12px"] > div {
    background: rgba(250,247,238,.05); border: 1px solid rgba(250,247,238,.1);
    border-radius: 16px; padding: 12px 6px;
  }
  div[style*="gap:36px;margin-top:12px"] div[style*="font-size:40px"] {
    font-size: 24px !important;
  }
  div[style*="gap:36px;margin-top:12px"] div[style*="font-size:14px"] {
    font-size: 11.5px !important;
  }

  /* Hero Floating Appliances Showcase: visible & scaled for mobile! */
  section[style*="background:#16291E"] div[style*="flex:1 1 440px"] {
    display: block !important; flex: 1 1 100% !important;
    height: 300px !important; max-width: 350px !important; margin: 4px auto 0 !important;
  }
  section[style*="background:#16291E"] div[style*="flex:1 1 440px"] > div[style*="width:150px"] {
    width: 96px !important; height: 96px !important; bottom: -6px !important; right: 0 !important;
  }
  section[style*="background:#16291E"] div[style*="flex:1 1 440px"] > div[style*="width:150px"] svg {
    width: 96px !important; height: 96px !important;
  }
  section[style*="background:#16291E"] div[style*="flex:1 1 440px"] > div[style*="width:150px"] div[style*="font-size:44px"] {
    font-size: 28px !important;
  }

  /* Marquee compact on mobile */
  .marq { padding: 9px 0 !important; font-size: 20px !important; }

  /* ===== TRUST STRIP: 2x2 GRID ON MOBILE ===== */
  section[style*="border-bottom:1px solid #ECE6D3"] > div[style*="gap:28px"] {
    display: grid !important; grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px !important; padding: 20px 14px !important;
  }
  section[style*="border-bottom:1px solid #ECE6D3"] div[style*="flex:1 1 240px"] {
    background: #FAF7EE; border: 1px solid #ECE6D3; border-radius: 18px;
    padding: 12px 10px !important; gap: 10px !important;
    flex-direction: column; text-align: center;
  }
  section[style*="border-bottom:1px solid #ECE6D3"] div[style*="width:60px;height:60px"] {
    width: 44px !important; height: 44px !important; border-radius: 14px !important;
  }
  section[style*="border-bottom:1px solid #ECE6D3"] div[style*="font-size:18px"] {
    font-size: 14.5px !important;
  }
  section[style*="border-bottom:1px solid #ECE6D3"] div[style*="font-size:14px"] {
    font-size: 11.5px !important; line-height: 1.4;
  }

  /* ===== CATEGORIES: 2-COLUMN BENTO GRID ===== */
  #cats > div > div:last-child {
    display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important;
  }
  #cats .tile {
    flex: initial !important; width: 100% !important;
    padding: 18px 12px !important; border-radius: 22px !important; gap: 12px !important;
  }
  #cats .tile > div:first-child {
    width: 68px !important; height: 68px !important;
  }
  #cats .tile > div:first-child svg {
    width: 36px !important; height: 36px !important;
  }
  #cats .tile > div:last-child {
    font-size: 15.5px !important;
  }

  /* ===== FLASH SALE: 2-COLUMN PRODUCT GRID ON MOBILE ===== */
  #flash > div > div:first-child {
    gap: 16px !important; margin-bottom: 24px !important;
  }
  #flash > div > div:first-child > div:last-child {
    width: 100%; justify-content: space-between;
    background: rgba(20,32,26,.05); padding: 10px 14px; border-radius: 18px;
  }
  #flash div[style*="min-width:72px"] {
    min-width: 58px !important; padding: 8px 0 !important; border-radius: 12px !important;
  }
  #flash div[style*="font-size:34px"] { font-size: 24px !important; }

  /* 2-col product cards in Flash Sale & Shop */
  #flash > div > div:last-child {
    display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important;
  }
  #flash .pcard {
    padding: 11px !important; border-radius: 20px !important; gap: 10px !important;
  }
  #flash .pcard > div:first-child {
    height: 140px !important; border-radius: 15px !important;
  }
  #flash .pcard > div:first-child > svg {
    width: 78px !important; height: 78px !important;
  }
  #flash .pcard h3 {
    font-size: 14px !important; line-height: 1.35 !important;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 38px;
  }
  #flash .pcard span[style*="font-size:24px"] { font-size: 18px !important; }
  #flash .pcard .btn-add {
    padding: 10px 8px !important; font-size: 13.5px !important; border-radius: 12px !important;
  }
  #flash .pcard .btn-wa {
    padding: 8px 6px !important; font-size: 12px !important; border-radius: 12px !important; gap: 5px !important;
  }

  /* ===== HOW TO ORDER: 2x2 GRID ON MOBILE ===== */
  #how > div > div:nth-child(2) {
    display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important;
  }
  #how .how-step {
    padding: 20px 14px !important; border-radius: 22px !important; gap: 10px !important;
  }
  #how .how-ic { width: 48px !important; height: 48px !important; border-radius: 14px !important; }
  #how .how-ic svg { width: 24px !important; height: 24px !important; }
  #how .how-step span[style*="font-size:44px"] { font-size: 30px !important; }
  #how .how-step div[style*="font-size:21px"] { font-size: 16px !important; }
  #how .how-step div[style*="font-size:15px"] { font-size: 12.5px !important; line-height: 1.55 !important; }
  #how .how-step span[style*="top:-13px"] {
    font-size: 10px !important; padding: 3px 9px !important; right: 10px !important;
  }

  /* ===== B2B & ABOUT SECTIONS ON MOBILE ===== */
  #b2b > div { gap: 32px !important; }
  #b2b div[style*="min-height:520px"] { min-height: auto !important; width: 100%; }
  #b2b div[style*="margin:36px 0 0 36px"] { margin: 14px 14px 0 0 !important; padding: 22px 18px !important; }

  #about div[style*="min-height:460px"] { min-height: 280px !important; width: 100%; }
  #about div[style*="inset:0 0 0 12%"] { inset: 0 0 20px 0 !important; border-radius: 120px 120px 28px 28px !important; }
  #about div[style*="margin-top:96px"] { margin-top: 44px !important; }
  #about div[style*="margin-top:96px"] > div {
    display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important;
  }
  #about div[style*="margin-top:96px"] > div > div { padding: 18px 14px !important; border-radius: 20px !important; }
  #about div[style*="font-size:44px"] { font-size: 30px !important; }

  /* ===== PARTNERS & REELS ON MOBILE ===== */
  #partners div[style*="width:180px;height:180px"] { width: 136px !important; height: 136px !important; }
  #partners .pt-seal { width: 136px !important; height: 136px !important; }
  #partners div[style*="padding:36px 28px"] {
    display: grid !important; grid-template-columns: repeat(2, 1fr) !important;
    gap: 16px !important; padding: 22px 16px !important; border-radius: 24px !important;
  }
  #partners div[style*="font-size:46px"] { font-size: 32px !important; }

  /*Guides horizontal snap on mobile */
  #guides > div > div:last-child {
    display: flex !important; flex-wrap: nowrap !important; overflow-x: auto;
    scroll-snap-type: x mandatory; gap: 14px !important; padding-bottom: 12px;
    margin-inline: -16px; padding-inline: 16px; scrollbar-width: none;
  }
  #guides > div > div:last-child::-webkit-scrollbar { display: none; }
  #guides .pcard { flex: 0 0 78vw !important; max-width: 300px; scroll-snap-align: start; }

  /* Contact CTA Banner */
  #contact > div { padding-bottom: 48px !important; }
  #contact div[style*="border-radius:44px"] {
    padding: 32px 22px !important; border-radius: 28px !important; gap: 22px !important; text-align: center;
  }
  #contact div[style*="border-radius:44px"] > div:last-child {
    width: 100%; display: flex; flex-direction: column; gap: 10px !important;
  }
  #contact div[style*="border-radius:44px"] a { width: 100%; justify-content: center; }

  /* ===== SHOP PAGE MOBILE OVERHAUL ===== */
  /* Horizontal swipeable category pills */
  section > div > div[style*="margin-top:28px"] {
    flex-wrap: nowrap !important; overflow-x: auto; scrollbar-width: none;
    margin-inline: -16px; padding-inline: 16px; padding-bottom: 6px; margin-top: 18px !important;
  }
  section > div > div[style*="margin-top:28px"]::-webkit-scrollbar { display: none; }

  /* Collapsible Filter Drawer on Shop Page */
  #sr-filter-btn {
    display: inline-flex !important; align-items: center; gap: 8px;
    background: #2A4D38; color: #FAF7EE; border: 0; border-radius: 14px;
    padding: 10px 16px; font-weight: 700; font-size: 14px;
  }
  aside.side {
    position: fixed !important; left: 0; right: 0; bottom: 0; z-index: 960;
    max-height: 82vh; overflow-y: auto; border-radius: 28px 28px 0 0 !important;
    box-shadow: none;
    transform: translateY(105%); transition: transform .36s cubic-bezier(.22,1,.36,1);
    margin: 0 !important; padding: 24px 20px 100px !important;
  }
  body.sr-filter-open aside.side { transform: translateY(0); box-shadow: 0 -24px 60px rgba(0,0,0,.45); }
  body.sr-filter-open #sr-fbackdrop { display: block !important; }

  /* Shop Product Grid: 2 Columns on Mobile! */
  div[style*="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))"] {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 12px !important;
  }
  div[style*="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))"] .pcard {
    border-radius: 20px !important;
  }
  div[style*="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))"] .pcard > div:first-child {
    height: 156px !important;
  }
  div[style*="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))"] .pcard > div:first-child svg {
    width: 84px !important; height: 84px !important;
  }
  div[style*="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))"] .pcard > div:last-child {
    padding: 12px 12px 16px !important;
  }
  div[style*="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))"] .pcard span[style*="font-size:23px"] {
    font-size: 18px !important;
  }
  div[style*="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))"] .pcard a[href="product.html"] {
    font-size: 13.5px !important; line-height: 1.4 !important;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }

  /* ===== PRODUCT PAGE MOBILE OVERHAUL ===== */
  /* Stack main image on top, horizontal thumbs below */
  div[style*="flex:1 1 520px;display:flex;gap:18px"] {
    flex-direction: column-reverse !important; gap: 12px !important; width: 100%;
  }
  div[style*="flex:1 1 520px;display:flex;gap:18px"] > div:first-child {
    flex-direction: row !important; width: 100%; justify-content: center; overflow-x: auto;
  }
  div[style*="flex:1 1 520px;display:flex;gap:18px"] > div:first-child button {
    width: 66px !important; height: 66px !important; border-radius: 16px !important; flex: none;
  }
  div[style*="height:560px;border-radius:36px"] {
    height: 310px !important; width: 100% !important; border-radius: 26px !important; flex: none !important;
  }
  div[style*="height:560px;border-radius:36px"] > svg {
    width: 190px !important; height: 190px !important;
  }
  /* Tabs scrollable on mobile */
  div[style*="margin-bottom:32px"] {
    flex-wrap: nowrap !important; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px;
  }
  div[style*="margin-bottom:32px"] button { white-space: nowrap; padding: 11px 20px !important; font-size: 15px !important; }

  /* ===== CART & CHECKOUT MOBILE OVERHAUL ===== */
  article[style*="border-radius:28px;padding:18px;display:flex;flex-wrap:wrap;gap:20px"] {
    padding: 14px !important; gap: 12px !important; border-radius: 22px !important;
  }
  article a[style*="width:132px;height:132px"] {
    width: 84px !important; height: 84px !important; border-radius: 16px !important;
  }
  article a[style*="width:132px;height:132px"] svg { width: 48px !important; height: 48px !important; }

  /* Login & Account Mobile Overhaul */
  div[style*="border-radius:0 40px 40px 0"] {
    border-radius: 28px !important; padding: 28px 20px !important;
  }
  div[style*="border-radius:40px 0 0 40px"] {
    border-radius: 28px !important; padding: 32px 22px !important; min-height: auto !important;
  }
  /* Account sidebar nav horizontal scroll on mobile */
  aside[style*="flex:0 1 330px"] { flex: 1 1 100% !important; }
  aside[style*="flex:0 1 330px"] > nav {
    flex-direction: row !important; overflow-x: auto; scrollbar-width: none; padding: 8px !important; border-radius: 20px !important;
  }
  aside[style*="flex:0 1 330px"] > nav button,
  aside[style*="flex:0 1 330px"] > nav a {
    white-space: nowrap; padding: 10px 14px !important; font-size: 14px !important; border-radius: 14px !important; gap: 6px;
  }

  /* Footer compact 2-column links on mobile */
  footer > div > div:first-child { gap: 28px !important; }
  footer div[style*="flex:1 1 160px"] {
    flex: 1 1 calc(50% - 16px) !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rv { opacity: 1 !important; transform: none !important; }
  #wa-float::before { animation: none !important; }
}
`;

  function injectStyles() {
    if (document.getElementById('sr-engine-css')) return;
    var s = document.createElement('style');
    s.id = 'sr-engine-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function showToast(msg) {
    var t = document.getElementById('sr-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'sr-toast';
      document.body.appendChild(t);
    }
    t.innerHTML = '<span class="ok"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>' + msg + '</span>';
    t.classList.add('show');
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  window.SERAG.toast = showToast;

  function setupChrome() {
    var WA = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>';
    var hello = 'السلام عليكم، عندي استفسار من الموقع 👋';

    // 1. Scroll progress bar
    if (!document.getElementById('sr-prog')) {
      var p = document.createElement('div');
      p.id = 'sr-prog';
      document.body.appendChild(p);
    }

    // 2. Desktop Floating WhatsApp
    if (!document.getElementById('wa-float')) {
      var f = document.createElement('a');
      f.id = 'wa-float'; f.href = C.waLink(hello); f.target = '_blank'; f.rel = 'noopener'; f.setAttribute('aria-label', 'كلمنا واتساب');
      f.innerHTML = WA + '<span class="tip">كلمنا واتساب، بنرد بسرعة</span>';
      document.body.appendChild(f);
    }

    // 3. Mobile Bottom Dock (#mnav) with active state
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var ico = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
    var n = document.getElementById('mnav');
    if (!n) {
      n = document.createElement('nav');
      n.id = 'mnav'; n.setAttribute('aria-label', 'تنقل سريع');
      document.body.appendChild(n);
    }
    n.innerHTML =
      '<a class="' + (path === 'index.html' || path === '' ? 'active' : '') + '" href="index.html">' + ico('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>') + 'الرئيسية</a>' +
      '<a class="' + (path === 'shop.html' || path === 'product.html' ? 'active' : '') + '" href="shop.html">' + ico('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>') + 'المتجر</a>' +
      '<a class="wa" href="' + C.waLink(hello) + '" target="_blank" rel="noopener"><span class="b">' + WA.replace('width="28" height="28"', 'width="26" height="26"') + '</span><em>واتساب</em></a>' +
      '<a class="' + (path === 'cart.html' || path === 'checkout.html' ? 'active' : '') + '" href="cart.html">' + ico('<path d="M3 4h2l2.5 11h10L20 7H6.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>') + 'السلة</a>' +
      '<a class="' + (path === 'account.html' || path === 'login.html' ? 'active' : '') + '" href="account.html">' + ico('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>') + 'حسابي</a>';

    // 4. Mobile Slide-Out Drawer + Hamburger Button + Quick Category Strip
    var hdr = document.querySelector('header');
    if (hdr && !document.getElementById('sr-mbtn')) {
      var hRow = hdr.querySelector('div');
      if (hRow) {
        var mbtn = document.createElement('button');
        mbtn.type = 'button';
        mbtn.id = 'sr-mbtn';
        mbtn.setAttribute('aria-label', 'القائمة');
        mbtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h12"/></svg>';
        hRow.insertBefore(mbtn, hRow.firstChild);
        mbtn.addEventListener('click', openDrawer);
      }

      var strip = document.createElement('div');
      strip.id = 'sr-mstrip';
      strip.innerHTML =
        '<a class="gold" href="shop.html">✦ كل الأقسام</a>' +
        '<a class="hot" href="index.html#flash">⚡ عروض الفلاش</a>' +
        '<a href="shop.html">ثلاجات وفريزر</a>' +
        '<a href="shop.html">غسالات</a>' +
        '<a href="shop.html">شاشات</a>' +
        '<a href="shop.html">تكييفات</a>' +
        '<a href="shop.html">بوتاجازات</a>' +
        '<a href="index.html#b2b">للتجار والجملة</a>' +
        '<a href="index.html#reels">آراء التجار</a>';
      hdr.appendChild(strip);
    }

    if (!document.getElementById('sr-drawer')) {
      var dbg = document.createElement('div');
      dbg.id = 'sr-drawer-bg';
      var drw = document.createElement('aside');
      drw.id = 'sr-drawer';
      drw.setAttribute('aria-label', 'القائمة الجانبية');
      drw.innerHTML =
        '<div style="background:#16291E;color:#FAF7EE;padding:22px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(210,194,122,.25)">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<div style="width:44px;height:44px;border-radius:12px;background:#2A4D38;color:#D2C27A;display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;font-weight:800;font-size:19px;box-shadow:inset 0 0 0 1.5px rgba(210,194,122,.45)">MS</div>' +
            '<div><div style="font-family:Lalezar,sans-serif;font-size:24px;line-height:1">محمد سراج</div><div style="font-family:Outfit,sans-serif;font-size:10px;letter-spacing:2.5px;color:#D2C27A;margin-top:2px">SINCE 1972</div></div>' +
          '</div>' +
          '<button type="button" id="sr-drawer-x" aria-label="إغلاق" style="width:38px;height:38px;border-radius:50%;border:1px solid rgba(250,247,238,.25);background:transparent;color:#FAF7EE;font-size:22px;display:flex;align-items:center;justify-content:center">×</button>' +
        '</div>' +
        '<div style="padding:18px 16px;display:flex;flex-direction:column;gap:6px;flex:1">' +
          '<div style="font-size:12px;font-weight:700;color:#6F6329;padding:4px 10px">تصفّح الأقسام</div>' +
          '<a href="shop.html" style="padding:12px 14px;border-radius:14px;background:#fff;border:1px solid #ECE6D3;font-weight:700;display:flex;justify-content:space-between;align-items:center"><span>كل الأجهزة الكهربائية</span><span style="color:#B5A45C">←</span></a>' +
          '<a href="shop.html" style="padding:11px 14px;border-radius:12px;font-weight:600;color:#2F3B34">ثلاجات وديب فريزر</a>' +
          '<a href="shop.html" style="padding:11px 14px;border-radius:12px;font-weight:600;color:#2F3B34">غسالات أوتوماتيك وفوق أوتوماتيك</a>' +
          '<a href="shop.html" style="padding:11px 14px;border-radius:12px;font-weight:600;color:#2F3B34">شاشات سمارت 4K</a>' +
          '<a href="shop.html" style="padding:11px 14px;border-radius:12px;font-weight:600;color:#2F3B34">تكييفات ومراوح</a>' +
          '<a href="shop.html" style="padding:11px 14px;border-radius:12px;font-weight:600;color:#2F3B34">بوتاجازات وأفران ومطبخ</a>' +
          '<div style="height:1px;background:#ECE6D3;margin:8px 0"></div>' +
          '<a href="index.html#flash" style="padding:11px 14px;border-radius:12px;font-weight:700;color:#E4572E">⚡ عروض الفلاش اليومية</a>' +
          '<a href="index.html#b2b" style="padding:11px 14px;border-radius:12px;font-weight:700;color:#2A4D38">🏢 أسعار الجملة للتجار والمعارض</a>' +
          '<a href="index.html#reels" style="padding:11px 14px;border-radius:12px;font-weight:600;color:#2F3B34">🎬 فيديوهات وآراء التجار</a>' +
          '<a href="index.html#about" style="padding:11px 14px;border-radius:12px;font-weight:600;color:#2F3B34">✨ حكايتنا من 1972</a>' +
          '<div style="height:1px;background:#ECE6D3;margin:8px 0"></div>' +
          '<a href="account.html" style="padding:11px 14px;border-radius:12px;font-weight:600;color:#2F3B34">📦 تتبّع طلباتي وحسابي</a>' +
          '<a href="login.html" style="padding:11px 14px;border-radius:12px;font-weight:600;color:#2F3B34">🔑 تسجيل الدخول / حساب تاجر</a>' +
        '</div>' +
        '<div style="padding:16px;background:#F1ECDD;border-top:1px solid #E4DDC6;display:flex;flex-direction:column;gap:10px">' +
          '<a href="' + C.waLink(hello) + '" target="_blank" rel="noopener" style="height:48px;border-radius:14px;background:#16A34A;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;gap:10px">' + WA.replace('width="28" height="28"', 'width="20" height="20"') + 'تواصل واتساب مباشر</a>' +
          '<a href="tel:' + C.phone + '" style="height:44px;border-radius:14px;border:1.5px solid #2A4D38;color:#2A4D38;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px">📞 اتصل بالمعرض: ' + C.phone + '</a>' +
        '</div>';
      document.body.appendChild(dbg);
      document.body.appendChild(drw);
      dbg.addEventListener('click', closeDrawer);
      drw.querySelector('#sr-drawer-x').addEventListener('click', closeDrawer);
      drw.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeDrawer); });
    }

    // 5. Shop Page Mobile Filter Drawer Toggle
    var side = document.querySelector('aside.side');
    if (side && !document.getElementById('sr-filter-btn')) {
      var sortRow = side.nextElementSibling && side.nextElementSibling.querySelector('div[style*="justify-content:space-between"]');
      if (sortRow) {
        var fbtn = document.createElement('button');
        fbtn.type = 'button';
        fbtn.id = 'sr-filter-btn';
        fbtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D2C27A" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>فلترة النتائج';
        sortRow.insertBefore(fbtn, sortRow.firstChild);
        fbtn.addEventListener('click', function () { document.body.classList.add('sr-filter-open'); });
      }
      var fbg = document.createElement('div');
      fbg.id = 'sr-fbackdrop';
      document.body.appendChild(fbg);
      fbg.addEventListener('click', function () { document.body.classList.remove('sr-filter-open'); });

      var sideTop = side.querySelector('div');
      if (sideTop) {
        var closeF = document.createElement('button');
        closeF.type = 'button';
        closeF.className = 'sr-only-mob';
        closeF.style.cssText = 'border:0;background:#2A4D38;color:#D2C27A;font-weight:700;font-size:13px;padding:7px 14px;border-radius:999px;display:none';
        closeF.textContent = 'تطبيق ✓';
        closeF.addEventListener('click', function () { document.body.classList.remove('sr-filter-open'); });
        sideTop.appendChild(closeF);
        var st = document.createElement('style');
        st.textContent = '@media(max-width:768px){.sr-only-mob{display:inline-block !important}}';
        document.head.appendChild(st);
      }
    }
  }

  function openDrawer() {
    var b = document.getElementById('sr-drawer-bg');
    if (b) { b.classList.add('open'); document.body.style.overflow = 'hidden'; }
  }
  function closeDrawer() {
    var b = document.getElementById('sr-drawer-bg');
    if (b) { b.classList.remove('open'); document.body.style.overflow = ''; }
  }

  function setupAnimations() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    // Reveal animations with stagger on cards
    var blocks = document.querySelectorAll('section > div > div:not([aria-hidden]), #partners .pt-mask');
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }) : null;

    blocks.forEach(function (el) {
      var sec = el.closest('section');
      if (!io || (sec && sec.getAttribute('style') && sec.getAttribute('style').indexOf('#16291E') !== -1 && sec === document.querySelector('section'))) return;
      el.classList.add('rv');
      io.observe(el);
    });

    // Stagger individual cards inside grids
    var grids = document.querySelectorAll('#cats > div > div:last-child, #flash > div > div:last-child, #how > div > div:nth-child(2), #guides > div > div:last-child');
    grids.forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (ch, idx) {
        ch.style.setProperty('--d', (idx * 65) + 'ms');
        ch.classList.add('rv');
        if (io) io.observe(ch);
      });
    });

    // Animated counters
    var cio = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target, to = +el.getAttribute('data-count'), pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
        var t0 = performance.now(), dur = 1500;
        (function tick(t) {
          var k = Math.min(1, (t - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
          el.textContent = pre + v.toLocaleString('en-US') + suf;
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.5 }) : null;
    if (cio) document.querySelectorAll('[data-count]').forEach(function (el) { cio.observe(el); });
  }

  /* =========================================================
     INTERACTIVE FRONTEND SUITE (Search, Cart/Wishlist Drawers,
     Product Compare, Article/Policy Modals, Order Tracker,
     Mobile Sticky Product Bar)
     ========================================================= */
  var CATALOG = [
    { id: 's1', name: 'ثلاجة نوفروست بابين 450 لتر', brand: 'Samsung · سامسونج', cat: 'ثلاجات وفريزر', price: 28900, old: 32500, cap: '450 لتر (16 قدم)', tech: 'ديجيتال انفرتر · Twin Cooling', warranty: '10 سنوات ضمان سامسونج', origin: 'مصر — ضمان الوكيل' },
    { id: 's2', name: 'ثلاجة ديفروست 350 لتر', brand: 'Toshiba · توشيبا', cat: 'ثلاجات وفريزر', price: 19800, old: 22000, cap: '350 لتر (14 قدم)', tech: 'تبريد هجين · موفرة للطاقة', warranty: '10 سنوات العربي جروب', origin: 'مصر — ضمان العربي' },
    { id: 's3', name: 'ثلاجة نوفروست ديجيتال 400 لتر', brand: 'LG · إل جي', cat: 'ثلاجات وفريزر', price: 31500, old: 34900, cap: '400 لتر ديجيتال', tech: 'Smart Inverter · Linear Cooling', warranty: '10 سنوات ضمان إل جي', origin: 'مصر / كوريا' },
    { id: 's4', name: 'ثلاجة ديفروست 14 قدم', brand: 'Fresh · فريش', cat: 'ثلاجات وفريزر', price: 17200, old: 19000, cap: '14 قدم (330 لتر)', tech: 'عزل حراري سميك · أرفف بايركس', warranty: '10 سنوات ضمان فريش', origin: 'مصر — مصانع فريش' },
    { id: 's5', name: 'غسالة أوتوماتيك فتحة أمامية 8 كجم', brand: 'LG · إل جي', cat: 'غسالات', price: 24500, old: 27000, cap: '8 كجم · 1200 لفة', tech: 'موتور دفع مباشر Direct Drive بالبخار', warranty: '10 سنوات على الموتور', origin: 'مصر — ضمان إل جي' },
    { id: 's6', name: 'غسالة أوتوماتيك 10 كجم إنفرتر', brand: 'Samsung · سامسونج', cat: 'غسالات', price: 29900, old: 33000, cap: '10 كجم · 1400 لفة', tech: 'ديجيتال انفرتر · EcoBubble', warranty: '10 سنوات ضمان سامسونج', origin: 'مصر — ضمان الوكيل' },
    { id: 's7', name: 'غسالة نصف أوتوماتيك 7 كجم', brand: 'Tornado · تورنيدو', cat: 'غسالات', price: 9800, old: 11200, cap: '7 كجم · حوضين', tech: 'موتور قوي · فلتر نسالة مزدوج', warranty: '5 سنوات العربي جروب', origin: 'مصر — ضمان العربي' },
    { id: 's8', name: 'شاشة سمارت 55 بوصة 4K', brand: 'Samsung · سامسونج', cat: 'شاشات وتلفزيونات', price: 21900, old: 24500, cap: '55 بوصة 4K UHD', tech: 'معالج Crystal 4K · ريسيفر داخلي · HDR10+', warranty: 'سنتان ضمان سامسونج', origin: 'مصر — ضمان سامسونج' },
    { id: 's9', name: 'شاشة 43 بوصة Full HD', brand: 'Sharp · شارب', cat: 'شاشات وتلفزيونات', price: 11900, old: 13500, cap: '43 بوصة FHD', tech: 'إضاءة LED مباشرة · مدخلين HDMI + USB', warranty: '3 سنوات العربي جروب', origin: 'مصر — ضمان العربي' },
    { id: 's10', name: 'شاشة QLED سمارت 65 بوصة', brand: 'LG · إل جي', cat: 'شاشات وتلفزيونات', price: 38900, old: 42000, cap: '65 بوصة QLED 4K', tech: 'ألوان Quantum · ذكاء اصطناعي ThinQ AI', warranty: 'سنتان ضمان إل جي', origin: 'مصر — ضمان إل جي' },
    { id: 's11', name: 'تكييف سبليت 1.5 حصان إنفرتر', brand: 'Sharp · شارب', cat: 'تكييفات', price: 26900, old: 29500, cap: '1.5 حصان (تغطية 14 م²)', tech: 'انفرتر موفر 40% · بلازما كلاستر ديجيتال', warranty: '5 سنوات العربي جروب', origin: 'مصر — ضمان العربي' },
    { id: 's12', name: 'تكييف سبليت 2.25 حصان بارد ساخن', brand: 'Toshiba · توشيبا', cat: 'تكييفات', price: 34500, old: 37500, cap: '2.25 حصان (تغطية 20 م²)', tech: 'بارد ساخن · تربو كول · فلاتر مضادة للبكتيريا', warranty: '5 سنوات العربي جروب', origin: 'مصر — ضمان العربي' },
    { id: 's13', name: 'تكييف سبليت 3 حصان بارد', brand: 'Fresh · فريش', cat: 'تكييفات', price: 38900, old: 42000, cap: '3 حصان (تغطية 26 م²)', tech: 'كباس تروبيكال للأجواء الحارة · تبريد فائق', warranty: '5 سنوات ضمان فريش', origin: 'مصر — مصانع فريش' },
    { id: 's14', name: 'بوتاجاز 5 شعلة ستانلس', brand: 'Unionaire · يونيون إير', cat: 'بوتاجازات', price: 14900, old: 16800, cap: '90 × 60 سم (5 شعلة)', tech: 'استانلس كامل · إشعال ذاتي · مروحة فرن', warranty: '5 سنوات ضمان يونيون إير', origin: 'مصر' },
    { id: 's15', name: 'بوتاجاز غاز 4 شعلة', brand: 'Fresh · فريش', cat: 'بوتاجازات', price: 9400, old: 10800, cap: '60 × 60 سم (4 شعلة)', tech: 'شواية بالموتور · إشعال أوتوماتيك', warranty: '5 سنوات ضمان فريش', origin: 'مصر — مصانع فريش' },
    { id: 's16', name: 'بوتاجاز غاز 5 شعلة بشاشة', brand: 'Tornado · تورنيدو', cat: 'بوتاجازات', price: 11700, old: 13200, cap: '90 × 60 سم ديجيتال', tech: 'شاشة تايمر ديجيتال · أمان كامل · حوامل زهر', warranty: '5 سنوات العربي جروب', origin: 'مصر — ضمان العربي' },
    { id: 'f1', name: 'ثلاجة سامسونج 18 قدم نوفروست انفرتر', brand: 'Samsung · سامسونج', cat: 'ثلاجات وفريزر', price: 24900, old: 29500, cap: '18 قدم (500 لتر)', tech: 'ديجيتال انفرتر · نوفروست بالكامل', warranty: '10 سنوات ضمان سامسونج', origin: 'مصر — ضمان الوكيل' },
    { id: 'f2', name: 'غسالة توشيبا فوق أوتوماتيك 13 كيلو', brand: 'Toshiba · توشيبا', cat: 'غسالات', price: 14800, old: 17900, cap: '13 كيلو تحميل علوي', tech: 'موتور الدفع المباشر · 8 برامج غسيل', warranty: '5 سنوات العربي جروب', origin: 'مصر — ضمان العربي' },
    { id: 'f3', name: 'شاشة إل جي 55 بوصة 4K سمارت', brand: 'LG · إل جي', cat: 'شاشات وتلفزيونات', price: 18500, old: 22000, cap: '55 بوصة 4K UHD', tech: 'WebOS سمارت · ريموت ماجيك · HDR10', warranty: 'سنتان ضمان إل جي', origin: 'مصر — ضمان إل جي' },
    { id: 'f4', name: 'تكييف شارب 1.5 حصان بارد ساخن انفرتر', brand: 'Sharp · شارب', cat: 'تكييفات', price: 22400, old: 26200, cap: '1.5 حصان بارد ساخن', tech: 'انفرتر + بلازما كلاستر · شاشة ديجيتال', warranty: '5 سنوات العربي جروب', origin: 'مصر — ضمان العربي' }
  ];
  window.SERAG.catalog = CATALOG;

  var ARTICLES = {
    'guide-fridge': {
      badge: 'دليل الشراء الذكي · 4 دقائق قراءة',
      title: 'إزاي تختار الثلاجة المناسبة لبيتك وعيلتك؟',
      body:
        '<p>اختيار الثلاجة الصح بيوفر عليك سنين من استهلاك الكهرباء العالي والأعطال. في معرض <strong>محمد سراج</strong> لخصنالك خبرة +50 سنة في 4 نقط أساسية قبل ما تشتري:</p>' +
        '<h4>1. تحديد السعة المناسبة باللتر والقدم</h4>' +
        '<ul>' +
          '<li><strong>عريس وعروسة (2 – 3 أفراد):</strong> سعة من 350 إلى 420 لتر (14 – 16 قدم) مثالية جداً وموفرة.</li>' +
          '<li><strong>أسرة متوسطة (4 – 5 أفراد):</strong> سعة من 430 إلى 500 لتر (16 – 18 قدم) عشان تاخد خزين الشهر براحتك.</li>' +
          '<li><strong>أسرة كبيرة أو تخزين عالي:</strong> 500 لتر فما فوق أو ثلاجة 450 لتر + ديب فريزر رأسي 6 أو 7 درج.</li>' +
        '</ul>' +
        '<h4>2. ليه لازم تختار موتور ديجيتال انفرتر (Inverter)؟</h4>' +
        '<p>الموتور الانفرتر مش بيفصل ويشتغل فجأة زي الموتور القديم، لكن بيعدل سرعته حسب درجة البرودة، وده بيوفر <strong>من 35% لـ 45% من فاتورة الكهرباء</strong>، وصوته هادي جداً، وعمره الافتراضي أطول مع ضمان بيوصل لـ 10 سنين.</p>' +
        '<h4>3. قيس المساحة والمداخل قبل الشراء</h4>' +
        '<p>تأكد من عرض باب المطبخ وباب الشقة والطرقة، وسيب مسافة تهوية <strong>5 سم من الجنبين و10 سم من الضهر</strong> عشان الموتور يشتغل بأعلى كفاءة.</p>' +
        '<h4>4. ترشيحات محمد سراج الأكثر مبيعاً</h4>' +
        '<p>ثلاجات <strong>سامسونج 450 لتر انفرتر</strong> و<strong>توشيبا العربي 411 لتر</strong> هما الأعلى اعتمادية وتوافر لقطع الغيار في مصر.</p>'
    },
    'guide-washer': {
      badge: 'مقارنة شاملة · 5 دقائق قراءة',
      title: 'غسالة أوتوماتيك أمامية ولا فوق أوتوماتيك؟ المقارنة الصريحة',
      body:
        '<p>السؤال الأكثر تكراراً في المعرض كل يوم! الإجابة بتعتمد على طبيعة استخدامك وميزانيتك:</p>' +
        '<h4>أولاً: الغسالة الأوتوماتيك (تحميل أمامي Front Load)</h4>' +
        '<ul>' +
          '<li><strong>المميزات:</strong> تنظيف عميق جداً بفضل السخان الداخلي وبرامج البخار والتعقيم، استهلاك مياه ومسحوق أقل بـ 40%، لطيفة على الملابس، سرعة عصر عالية (1200 – 1400 لفة).</li>' +
          '<li><strong>مناسبة لمين؟</strong> اللي بيدور على أعلى نظافة وتعقيم للملابس وموديلات الموتور الدفع المباشر (Direct Drive).</li>' +
        '</ul>' +
        '<h4>ثانياً: الغسالة فوق أوتوماتيك (تحميل علوي Top Load)</h4>' +
        '<ul>' +
          '<li><strong>المميزات:</strong> سعات كبيرة بسعر اقتصادي (10 إلى 16 كيلو)، إمكانية إضافة غسيل أثناء التشغيل بسهولة، تقبل المسحوق العادي أو الأوتوماتيك، صيانتها بسيطة جداً.</li>' +
          '<li><strong>مناسبة لمين؟</strong> العائلات الكبيرة واللي بيغسلوا بطاطين خفيفة أو كميات يومية كبيرة بسرعة.</li>' +
        '</ul>' +
        '<h4>نصيحة محمد سراج الذهبية</h4>' +
        '<p>لو هتختار أوتوماتيك أمامية، ركز على الموديلات الانفرتر بسعة <strong>8 أو 9 كيلو</strong> عشان الحلة تكون مرتاحة والومان بلي يعيش معاك سنين طويلة بدون صوت.</p>'
    },
    'guide-home': {
      badge: 'تجهيز البيوت والعرايس · 6 دقائق قراءة',
      title: 'الأساسيات اللي تبدأ بيها تجهيز شقتك بدون مبالغة',
      body:
        '<p>تجهيز البيت مش بكترة الأجهزة، لكن باختيار الأجهزة العملية اللي هتشتغل كل يوم وتعيش معاك بالعمر. دي خطة التجهيز الذكية:</p>' +
        '<h4>الأجهزة الأساسية (الأولوية القصوى)</h4>' +
        '<ul>' +
          '<li><strong>1. الثلاجة:</strong> اختارها انفرتر نوفروست سعة 400 – 450 لتر لأنها شغالة 24 ساعة.</li>' +
          '<li><strong>2. الغسالة:</strong> أوتوماتيك 8 أو 9 كيلو انفرتر بموتور دفع مباشر.</li>' +
          '<li><strong>3. البوتاجاز:</strong> 5 شعلة مقاس 90×60 سم استانلس كامل بـ <strong>أمان كامل (Full Safety)</strong> ومروحة فرن.</li>' +
          '<li><strong>4. الشاشة:</strong> سمارت 50 أو 55 بوصة 4K بريسيفر داخلي.</li>' +
          '<li><strong>5. السخان:</strong> غاز 10 لتر ديجيتال أو كهرباء 50 لتر حسب توصيلات شقتك.</li>' +
        '</ul>' +
        '<h4>أجهزة المرحلة التانية (حسب الميزانية)</h4>' +
        '<p>الديب فريزر الرأسي (6 أو 7 درج)، التكييف الانفرتر لغرفة المعيشة أو النوم، الميكروويف، وغسالة الأطباق.</p>' +
        '<h4>ميزة التجهيز من محمد سراج</h4>' +
        '<p>بنقدملك باقات مجمعة بخصم خاص وتوصيل كل الأجهزة في نقلة واحدة مجاناً للمنصورة مع ضمان الوكيل الرسمي.</p>'
    },
    'policy-return': {
      badge: 'سياسة رسمية معتمدة',
      title: 'سياسة الاستبدال والاسترجاع وحماية المستهلك',
      body:
        '<p>في <strong>محمد سراج للأجهزة الكهربائية</strong>، حقك محفوظ بالكامل وفقاً لقانون حماية المستهلك المصري:</p>' +
        '<ul>' +
          '<li><strong>الاسترجاع أو الاستبدال خلال 14 يوم:</strong> يمكنك استبدال أو استرجاع الجهاز خلال 14 يوم من تاريخ الاستلام بشرط أن يكون الجهاز في كرتونته الأصلية المغلقة وبنفس حالته عند الاستلام دون تشغيل.</li>' +
          '<li><strong>عيوب الصناعة (خلال 30 يوم):</strong> في حالة ظهور أي عيب صناعة معتمد بتقرير فني من شركة الضمان (الوكيل الرسمي)، يتم استبدال الجهاز فوراً بجهاز جديد أو استرداد كامل القيمة دون أي مصاريف.</li>' +
          '<li><strong>المعاينة عند الاستلام:</strong> يحق للعميل معاينة الكرتونة والتأكد من سلامة الجهاز ظاهرياً ومطابقة الموديل واللون قبل سداد باقي المبلغ للمندوب.</li>' +
          '<li><strong>طريقة استرداد المبلغ:</strong> يتم رد المبلغ بنفس طريقة الدفع (كاش، إنستا باي، أو فودافون كاش) خلال 48 ساعة عمل من استلام المرتجع.</li>' +
        '</ul>'
    },
    'policy-terms': {
      badge: 'الشروط والضمان',
      title: 'الشروط والأحكام وضمان الوكيل الرسمي',
      body:
        '<ul>' +
          '<li><strong>أصالة المنتجات 100%:</strong> جميع الأجهزة المباعة في معرض وموقع محمد سراج أصلية، فرز أول، بكرتونة المصنع المبرشمة، ومرفق بها شهادة ضمان الوكيل الرسمي وفاتورة ضريبية معتمدة.</li>' +
          '<li><strong>تفعيل الضمان والتركيب:</strong> للأجهزة الكبيرة (التكييفات، الغسالات الأوتوماتيك، الثلاجات، السخانات الغاز)، يُنصح بتركيب الجهاز وتشغيله عن طريق فني الشركة المعتمد مجاناً عبر الخط الساخن للوكيل لضمان سريان الضمان.</li>' +
          '<li><strong>الأسعار وحجز الطلبات:</strong> السعر الموضح في تأكيد الطلب ثابت ومضمون لمدة 48 ساعة من لحظة الحجز.</li>' +
          '<li><strong>التوصيل والتطليع:</strong> التوصيل داخل المنصورة وطلخا خلال 24 ساعة، ولجميع محافظات الدلتا ومصر خلال 2 – 5 أيام عمل بسيارات المعرض المجهزة.</li>' +
        '</ul>'
    },
    'policy-faq': {
      badge: 'إجابات سريعة وواضة',
      title: 'الأسئلة الشائعة لعملاء محمد سراج',
      body:
        '<h4>هل كل الأجهزة بضمان الوكيل الرسمي؟</h4>' +
        '<p>نعم 100%، إحنا موزعين معتمدين من 1972 لكل الماركات (العربي، سامسونج، إل جي، فريش، كاريير، بيكو، يونيون إير)، وكل جهاز معاه شهادة الضمان الأصلية وفاتورة مختومة.</p>' +
        '<h4>إزاي بدفع ثمن الجهاز؟</h4>' +
        '<p>تقدر تدفع <strong>كاش عند الاستلام</strong> بعد ما تعاين كرتونة جهازك، أو تحول عن طريق <strong>إنستا باي (InstaPay)</strong> أو <strong>فودافون كاش</strong> أو <strong>فوري</strong>.</p>' +
        '<h4>هل في توصيل خارج المنصورة؟</h4>' +
        '<p>طبعاً! بنوصل لكل مراكز الدقهلية، محافظات الدلتا (الغربية، دمياط، الشرقية، كفر الشيخ)، والقاهرة والإسكندرية وباقي المحافظات.</p>' +
        '<h4>إزاي أحصل على أسعار الجملة للتجار والمعارض؟</h4>' +
        '<p>اضغط على زر <strong>"اطلب كشف أسعار الجملة"</strong> في قسم التجار أو تواصل معانا واتساب مباشر، وفريق مبيعات الجملة هيبعتلك كشف الأسعار اليومي المحدث فوراً.</p>'
    }
  };

  var extraCss = `
/* ===== SEARCH AUTOCOMPLETE DROPDOWN ===== */
header form, header > div > div[style*="flex:1 1 360px"] { position: relative !important; }
#sr-search-dd {
  position: absolute; top: calc(100% + 10px); right: 0; left: 0; z-index: 950;
  background: #fff; border: 1.5px solid #D2C27A; border-radius: 22px;
  box-shadow: 0 28px 60px -16px rgba(20,32,26,.32); padding: 14px;
  font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif;
  display: none; max-height: 74vh; overflow-y: auto;
}
#sr-search-dd.open { display: block; animation: srHeroUp .22s ease-out; }
.sr-sdd-pills { display: flex; flex-wrap: wrap; gap: 6px; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #ECE6D3; }
.sr-sdd-pill {
  padding: 5px 12px; border-radius: 999px; background: #FAF7EE; border: 1px solid #E4DDC6;
  font-size: 12.5px; font-weight: 600; color: #2A4D38; cursor: pointer; transition: all .18s ease;
}
.sr-sdd-pill:hover { background: #2A4D38; color: #D2C27A; border-color: #2A4D38; }
.sr-sdd-item {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 12px; border-radius: 14px; transition: background .18s ease; text-decoration: none; color: #14201A;
}
.sr-sdd-item:hover { background: #FAF7EE; }

/* ===== SLIDE-OUT MINI-CART & WISHLIST DRAWERS ===== */
.sr-side-bg {
  position: fixed; inset: 0; z-index: 9992; background: rgba(10,18,13,.62);
  backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px);
  opacity: 0; pointer-events: none; transition: opacity .3s ease;
}
.sr-side-bg.open { opacity: 1; pointer-events: auto; }
.sr-side-panel {
  position: fixed; top: 0; left: 0; bottom: 0; width: min(410px, 92vw); z-index: 9996;
  background: #FAF7EE; color: #14201A; font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif;
  transform: translateX(-105%); transition: transform .36s cubic-bezier(.22,1,.36,1), visibility .36s;
  display: flex; flex-direction: column; box-shadow: none; visibility: hidden; pointer-events: none;
}
.sr-side-bg.open + .sr-side-panel { transform: translateX(0); box-shadow: 24px 0 60px rgba(0,0,0,.42); visibility: visible; pointer-events: auto; }

/* ===== PRODUCT COMPARE BUTTON & FLOATING BAR ===== */
.sr-cmp-btn {
  position: absolute; bottom: 12px; right: 12px; z-index: 4;
  height: 34px; padding: 0 12px; border-radius: 999px;
  background: rgba(255,255,255,.95); border: 1.5px solid #E4DDC6; color: #2A4D38;
  font-family: 'IBM Plex Sans Arabic', sans-serif; font-size: 12.5px; font-weight: 700;
  display: inline-flex; align-items: center; gap: 5px; cursor: pointer;
  box-shadow: 0 6px 14px rgba(0,0,0,.08); transition: all .2s ease;
}
.sr-cmp-btn:hover { border-color: #2A4D38; transform: translateY(-2px); }
.sr-cmp-btn.active { background: #2A4D38 !important; color: #D2C27A !important; border-color: #D2C27A !important; }
.sr-fav-active { background: #FEE2E2 !important; color: #DC2626 !important; border-color: #FCA5A5 !important; }
.sr-fav-active svg { fill: #DC2626 !important; stroke: #DC2626 !important; }

#sr-compare-bar {
  position: fixed; bottom: 22px; right: 24px; z-index: 940;
  background: #14201A; color: #FAF7EE; border: 1.5px solid #B5A45C;
  border-radius: 22px; padding: 12px 18px; display: none; align-items: center; gap: 14px;
  box-shadow: 0 24px 54px rgba(0,0,0,.5); font-family: 'IBM Plex Sans Arabic', sans-serif;
  max-width: calc(100vw - 32px); flex-wrap: wrap;
}
#sr-compare-bar.show { display: flex; animation: srHeroUp .28s ease-out; }

/* ===== UNIVERSAL MODAL (ARTICLES, POLICIES, TRACK ORDER, COMPARE TABLE) ===== */
#sr-modal-bg {
  position: fixed; inset: 0; z-index: 9998; background: rgba(10,18,13,.7);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  display: none; align-items: center; justify-content: center; padding: 18px;
}
#sr-modal-bg.open { display: flex; }
#sr-modal {
  background: #FAF7EE; color: #14201A; width: min(760px, 96vw); max-height: 88vh;
  border-radius: 28px; border: 1.5px solid #D2C27A; overflow: hidden;
  display: flex; flex-direction: column; box-shadow: 0 32px 70px rgba(0,0,0,.55);
  font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif; animation: srHeroUp .26s ease-out;
}
#sr-modal-body { padding: 24px 26px; overflow-y: auto; line-height: 1.85; font-size: 15.5px; color: #2F3B34; }
#sr-modal-body h4 { color: #14201A; font-size: 17px; margin: 18px 0 8px; font-weight: 800; }
#sr-modal-body ul { padding-right: 20px; margin: 8px 0 14px; }
#sr-modal-body li { margin-bottom: 7px; }
.sr-cmp-table { width: 100%; border-collapse: collapse; font-size: 14px; background: #fff; border-radius: 16px; overflow: hidden; }
.sr-cmp-table th, .sr-cmp-table td { padding: 12px 14px; border: 1px solid #ECE6D3; text-align: right; vertical-align: top; }
.sr-cmp-table th { background: #F1ECDD; color: #6F6329; font-weight: 700; width: 22%; }

/* ===== MOBILE STICKY PRODUCT BAR (product.html) ===== */
#sr-pbar { display: none; }
@media (max-width: 860px) {
  #sr-compare-bar { bottom: 76px; right: 12px; left: 12px; justify-content: space-between; padding: 10px 14px; }
  #sr-pbar {
    display: flex; position: fixed; left: 0; right: 0; bottom: 63px; z-index: 895;
    background: rgba(255,255,255,.97); backdrop-filter: blur(14px);
    border-top: 1.5px solid #D2C27A; padding: 10px 14px; align-items: center; justify-content: space-between; gap: 10px;
    box-shadow: 0 -10px 28px rgba(20,32,26,.15); font-family: 'IBM Plex Sans Arabic', sans-serif;
  }
}
`;

  function getStoreList(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(v) ? v : fallback;
    } catch (e) { return fallback; }
  }
  function setStoreList(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {}
  }

  function findProductFromCard(card) {
    if (!card) return CATALOG[0];
    var title = '';
    var candidates = card.querySelectorAll('h3, a[href="product.html"]');
    for (var i = 0; i < candidates.length; i++) {
      var txt = (candidates[i].textContent || '').trim().replace(/\s+/g, ' ');
      if (txt.length > 2) { title = txt; break; }
      var al = (candidates[i].getAttribute('aria-label') || '').trim();
      if (al.length > 2) { title = al; }
    }
    var match = CATALOG.filter(function (p) {
      return title && (p.name === title || p.name.indexOf(title) !== -1 || title.indexOf(p.name) !== -1);
    })[0];
    if (match) return match;

    var prEl = card.querySelector('[style*="font-size:24px"], [style*="font-size:23px"], [style*="font-size:22px"]');
    var pr = prEl ? parseInt(prEl.textContent.replace(/[^0-9]/g, ''), 10) || 28900 : 28900;
    var brEl = card.querySelector('[style*="color:#6F6329"]');
    var br = brEl ? brEl.textContent.trim() : 'محمد سراج';
    return {
      id: 'c_' + (title || pr),
      name: title || 'ثلاجة سامسونج نوفروست بابين 450 لتر',
      brand: br,
      cat: 'أجهزة منزلية',
      price: pr,
      old: Math.round(pr * 1.14),
      cap: 'مقاس قياسي معتمد',
      tech: 'انفرتر موفر للطاقة',
      warranty: '5 – 10 سنوات ضمان الوكيل',
      origin: 'مصر — فرز أول بضمان رسمي'
    };
  }

  function syncBadges() {
    var cart = getStoreList('serag_cart', [
      { id: 'p1', name: CATALOG[0].name, brand: CATALOG[0].brand, price: CATALOG[0].price, qty: 1 },
      { id: 'p2', name: CATALOG[1].name, brand: CATALOG[1].brand, price: CATALOG[1].price, qty: 1 }
    ]);
    var totalQty = cart.reduce(function (s, i) { return s + (i.qty || 1); }, 0);
    document.querySelectorAll('header a[href="cart.html"] span[style*="border-radius:999px"]').forEach(function (b) {
      b.textContent = totalQty;
    });
    var favs = getStoreList('serag_favs', []);
    document.querySelectorAll('header a[aria-label="المفضلة"]').forEach(function (a) {
      a.style.position = 'relative';
      var dot = a.querySelector('.sr-fav-dot');
      if (favs.length > 0) {
        if (!dot) {
          dot = document.createElement('span');
          dot.className = 'sr-fav-dot';
          dot.style.cssText = 'position:absolute;top:-4px;left:-4px;min-width:19px;height:19px;border-radius:999px;background:#E4572E;color:#fff;font-family:Outfit,sans-serif;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px;border:2px solid #fff';
          a.appendChild(dot);
        }
        dot.textContent = favs.length;
      } else if (dot) {
        dot.remove();
      }
    });
  }

  function addToMiniCart(prod) {
    var cart = getStoreList('serag_cart', [
      { id: 'p1', name: CATALOG[0].name, brand: CATALOG[0].brand, price: CATALOG[0].price, qty: 1 },
      { id: 'p2', name: CATALOG[1].name, brand: CATALOG[1].brand, price: CATALOG[1].price, qty: 1 }
    ]);
    var ex = cart.filter(function (i) { return i.id === prod.id || i.name === prod.name; })[0];
    if (ex) ex.qty = (ex.qty || 1) + 1;
    else cart.push({ id: prod.id, name: prod.name, brand: prod.brand, price: prod.price, qty: 1 });
    setStoreList('serag_cart', cart);
    syncBadges();
    renderCartDrawer();
  }

  function toggleFav(prod, btnEl) {
    var favs = getStoreList('serag_favs', []);
    var idx = -1;
    favs.forEach(function (f, i) { if (f.id === prod.id || f.name === prod.name) idx = i; });
    if (idx >= 0) {
      favs.splice(idx, 1);
      if (btnEl) btnEl.classList.remove('sr-fav-active');
      showToast('تمت الإزالة من المفضلة');
    } else {
      favs.push({ id: prod.id, name: prod.name, brand: prod.brand, price: prod.price });
      if (btnEl) btnEl.classList.add('sr-fav-active');
      showToast('تمت الإضافة للمفضلة ♥');
    }
    setStoreList('serag_favs', favs);
    syncBadges();
    renderWishDrawer();
  }

  function ensureDrawersAndModals() {
    if (!document.getElementById('sr-extra-css')) {
      var st = document.createElement('style');
      st.id = 'sr-extra-css';
      st.textContent = extraCss;
      document.head.appendChild(st);
    }

    // 1. Mini-Cart Drawer
    if (!document.getElementById('sr-cart-drawer')) {
      var cbg = document.createElement('div');
      cbg.id = 'sr-cart-bg'; cbg.className = 'sr-side-bg';
      var cdr = document.createElement('aside');
      cdr.id = 'sr-cart-drawer'; cdr.className = 'sr-side-panel';
      cdr.setAttribute('aria-label', 'سلة المشتريات السريعة');
      document.body.appendChild(cbg);
      document.body.appendChild(cdr);
      cbg.addEventListener('click', function () { cbg.classList.remove('open'); });
    }

    // 2. Wishlist Drawer
    if (!document.getElementById('sr-wish-drawer')) {
      var wbg = document.createElement('div');
      wbg.id = 'sr-wish-bg'; wbg.className = 'sr-side-bg';
      var wdr = document.createElement('aside');
      wdr.id = 'sr-wish-drawer'; wdr.className = 'sr-side-panel';
      wdr.setAttribute('aria-label', 'قائمة المفضلة');
      document.body.appendChild(wbg);
      document.body.appendChild(wdr);
      wbg.addEventListener('click', function () { wbg.classList.remove('open'); });
    }

    // 3. Compare Floating Bar
    if (!document.getElementById('sr-compare-bar')) {
      var cbar = document.createElement('div');
      cbar.id = 'sr-compare-bar';
      document.body.appendChild(cbar);
    }

    // 4. Universal Modal (Articles, Policies, Order Tracker, Compare Table)
    if (!document.getElementById('sr-modal-bg')) {
      var mbg = document.createElement('div');
      mbg.id = 'sr-modal-bg';
      mbg.innerHTML =
        '<div id="sr-modal" role="dialog" aria-modal="true">' +
          '<div style="background:#16291E;color:#FAF7EE;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(210,194,122,.28)">' +
            '<div>' +
              '<div id="sr-modal-sub" style="font-size:12px;font-weight:700;color:#D2C27A"></div>' +
              '<h3 id="sr-modal-title" style="margin:2px 0 0;font-family:Lalezar,sans-serif;font-size:25px;font-weight:400;line-height:1.15"></h3>' +
            '</div>' +
            '<button type="button" id="sr-modal-close" aria-label="إغلاق" style="width:38px;height:38px;border-radius:50%;border:1px solid rgba(250,247,238,.25);background:transparent;color:#FAF7EE;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center">×</button>' +
          '</div>' +
          '<div id="sr-modal-body"></div>' +
          '<div style="padding:14px 22px;background:#F1ECDD;border-top:1px solid #E4DDC6;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">' +
            '<span style="font-size:13px;color:#5E6861;font-weight:600">محمد سراج للأجهزة الكهربائية — ثقة من 1972</span>' +
            '<div style="display:flex;gap:8px">' +
              '<a href="shop.html" style="padding:9px 16px;border-radius:12px;background:#2A4D38;color:#FAF7EE;font-size:13.5px;font-weight:700;text-decoration:none">تصفّح الأجهزة</a>' +
              '<button type="button" id="sr-modal-ok" style="padding:9px 18px;border-radius:12px;border:1px solid #C8BA7B;background:#fff;color:#14201A;font-size:13.5px;font-weight:700;cursor:pointer">إغلاق</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(mbg);
      var closeM = function () { mbg.classList.remove('open'); };
      mbg.addEventListener('click', function (e) { if (e.target === mbg) closeM(); });
      mbg.querySelector('#sr-modal-close').addEventListener('click', closeM);
      mbg.querySelector('#sr-modal-ok').addEventListener('click', closeM);
    }

    // 5. Sticky Mobile Bar on product.html
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (path === 'product.html' && !document.getElementById('sr-pbar')) {
      var pbar = document.createElement('div');
      pbar.id = 'sr-pbar';
      pbar.innerHTML =
        '<div>' +
          '<div style="font-size:11px;color:#5E6861;font-weight:700">ثلاجة سامسونج 450 لتر انفرتر</div>' +
          '<div style="font-family:Outfit,sans-serif;font-weight:800;font-size:20px;color:#2A4D38;line-height:1.1">28,900 <span style="font-family:\'IBM Plex Sans Arabic\',sans-serif;font-size:12px;font-weight:700">ج.م</span></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex:1;justify-content:flex-end">' +
          '<button type="button" id="sr-pbar-add" style="height:44px;padding:0 16px;border-radius:13px;border:0;background:#2A4D38;color:#FAF7EE;font-weight:800;font-size:13.5px;display:inline-flex;align-items:center;gap:6px">أضف للسلة</button>' +
          '<button type="button" data-wa-product="1" style="height:44px;padding:0 13px;border-radius:13px;border:1.5px solid #16A34A;background:#EAFBF0;color:#15803D;font-weight:800;font-size:13px">واتساب</button>' +
        '</div>';
      document.body.appendChild(pbar);
      pbar.querySelector('#sr-pbar-add').addEventListener('click', function () {
        addToMiniCart(CATALOG[0]);
        openCartDrawer();
      });
    }

    renderCartDrawer();
    renderWishDrawer();
    syncBadges();
  }

  function renderCartDrawer() {
    var cdr = document.getElementById('sr-cart-drawer');
    if (!cdr) return;
    var cart = getStoreList('serag_cart', [
      { id: 'p1', name: CATALOG[0].name, brand: CATALOG[0].brand, price: CATALOG[0].price, qty: 1 },
      { id: 'p2', name: CATALOG[1].name, brand: CATALOG[1].brand, price: CATALOG[1].price, qty: 1 }
    ]);
    var subtotal = cart.reduce(function (s, i) { return s + (i.price * (i.qty || 1)); }, 0);
    var count = cart.reduce(function (s, i) { return s + (i.qty || 1); }, 0);

    var itemsHtml = cart.length === 0
      ? '<div style="text-align:center;padding:48px 20px;color:#5E6861"><div style="font-size:40px;margin-bottom:10px">🛒</div><div style="font-weight:700;font-size:17px;color:#14201A">سلة المشتريات فارغة حالياً</div><p style="font-size:14px">تصفّح عروض محمد سراج وضيف أجهزتك المفضلة.</p><a href="shop.html" style="display:inline-block;margin-top:10px;padding:11px 22px;border-radius:14px;background:#2A4D38;color:#FAF7EE;font-weight:700;text-decoration:none">تصفّح المتجر</a></div>'
      : cart.map(function (it, idx) {
          return '<div style="background:#fff;border:1px solid #ECE6D3;border-radius:18px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:11.5px;color:#6F6329;font-weight:700">' + (it.brand || 'محمد سراج') + '</div>' +
              '<a href="product.html" style="font-size:14px;font-weight:700;color:#14201A;text-decoration:none;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + it.name + '</a>' +
              '<div style="font-family:Outfit,sans-serif;font-weight:800;font-size:16px;color:#2A4D38;margin-top:4px">' + (it.price * (it.qty || 1)).toLocaleString('en-US') + ' <span style="font-family:\'IBM Plex Sans Arabic\',sans-serif;font-size:12px">ج.م</span></div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;background:#FAF7EE;border:1px solid #E4DDC6;border-radius:12px;padding:4px 6px">' +
              '<button type="button" data-cact="dec" data-cidx="' + idx + '" style="width:26px;height:26px;border:0;background:#fff;border-radius:8px;font-weight:800;cursor:pointer">−</button>' +
              '<span style="font-family:Outfit,sans-serif;font-weight:700;min-width:18px;text-align:center">' + (it.qty || 1) + '</span>' +
              '<button type="button" data-cact="inc" data-cidx="' + idx + '" style="width:26px;height:26px;border:0;background:#fff;border-radius:8px;font-weight:800;cursor:pointer">+</button>' +
            '</div>' +
            '<button type="button" data-cact="del" data-cidx="' + idx + '" aria-label="حذف" style="border:0;background:transparent;color:#B91C1C;font-size:18px;cursor:pointer;padding:4px">×</button>' +
          '</div>';
        }).join('');

    cdr.innerHTML =
      '<div style="background:#16291E;color:#FAF7EE;padding:20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(210,194,122,.25)">' +
        '<div><div style="font-family:Lalezar,sans-serif;font-size:24px;line-height:1">سلة المشتريات (' + count + ')</div><div style="font-size:12px;color:#D2C27A;margin-top:3px">شحن سريع بضمان الوكيل الرسمي</div></div>' +
        '<button type="button" id="sr-cart-x" style="width:36px;height:36px;border-radius:50%;border:1px solid rgba(250,247,238,.25);background:transparent;color:#FAF7EE;font-size:20px;cursor:pointer">×</button>' +
      '</div>' +
      '<div style="padding:14px 16px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px">' + itemsHtml + '</div>' +
      '<div style="padding:16px;background:#F1ECDD;border-top:1px solid #E4DDC6;display:flex;flex-direction:column;gap:10px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:16px">' +
          '<span>الإجمالي الفرعي:</span>' +
          '<span style="font-family:Outfit,sans-serif;font-size:22px;color:#2A4D38">' + subtotal.toLocaleString('en-US') + ' ج.م</span>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1.2fr;gap:8px">' +
          '<a href="cart.html" style="height:46px;border-radius:14px;border:1.5px solid #2A4D38;color:#2A4D38;font-weight:700;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:14px">عرض السلة</a>' +
          '<a href="checkout.html" style="height:46px;border-radius:14px;background:#2A4D38;color:#FAF7EE;font-weight:800;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:14.5px">إتمام الطلب ←</a>' +
        '</div>' +
      '</div>';

    cdr.querySelector('#sr-cart-x').addEventListener('click', function () {
      document.getElementById('sr-cart-bg').classList.remove('open');
    });
    cdr.querySelectorAll('[data-cact]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-cact');
        var idx = +b.getAttribute('data-cidx');
        var list = getStoreList('serag_cart', []);
        if (!list[idx]) return;
        if (act === 'inc') list[idx].qty = (list[idx].qty || 1) + 1;
        else if (act === 'dec') {
          if ((list[idx].qty || 1) > 1) list[idx].qty -= 1;
          else list.splice(idx, 1);
        } else if (act === 'del') list.splice(idx, 1);
        setStoreList('serag_cart', list);
        syncBadges();
        renderCartDrawer();
      });
    });
  }

  function openCartDrawer() {
    renderCartDrawer();
    var bg = document.getElementById('sr-cart-bg');
    if (bg) bg.classList.add('open');
  }

  function renderWishDrawer() {
    var wdr = document.getElementById('sr-wish-drawer');
    if (!wdr) return;
    var favs = getStoreList('serag_favs', []);
    var html = favs.length === 0
      ? '<div style="text-align:center;padding:48px 20px;color:#5E6861"><div style="font-size:40px;margin-bottom:10px">♥</div><div style="font-weight:700;font-size:17px;color:#14201A">قائمة المفضلة فارغة</div><p style="font-size:14px">اضغط على علامة القلب ♥ على أي جهاز لحفظه هنا ومقارنته لاحقاً.</p><a href="shop.html" style="display:inline-block;margin-top:10px;padding:11px 22px;border-radius:14px;background:#2A4D38;color:#FAF7EE;font-weight:700;text-decoration:none">استكشف الأجهزة</a></div>'
      : favs.map(function (it, idx) {
          return '<div style="background:#fff;border:1px solid #ECE6D3;border-radius:18px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:11.5px;color:#6F6329;font-weight:700">' + (it.brand || 'محمد سراج') + '</div>' +
              '<a href="product.html" style="font-size:14px;font-weight:700;color:#14201A;text-decoration:none;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + it.name + '</a>' +
              '<div style="font-family:Outfit,sans-serif;font-weight:800;font-size:16px;color:#2A4D38;margin-top:4px">' + (it.price || 28900).toLocaleString('en-US') + ' ج.م</div>' +
            '</div>' +
            '<button type="button" data-wadd="' + idx + '" style="padding:7px 12px;border-radius:10px;border:0;background:#2A4D38;color:#FAF7EE;font-size:12.5px;font-weight:700;cursor:pointer">+ للسلة</button>' +
            '<button type="button" data-wdel="' + idx + '" style="border:0;background:transparent;color:#B91C1C;font-size:18px;cursor:pointer">×</button>' +
          '</div>';
        }).join('');

    wdr.innerHTML =
      '<div style="background:#16291E;color:#FAF7EE;padding:20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(210,194,122,.25)">' +
        '<div><div style="font-family:Lalezar,sans-serif;font-size:24px;line-height:1">المفضلة (' + favs.length + ')</div><div style="font-size:12px;color:#D2C27A;margin-top:3px">الأجهزة اللي حفظتها للمقارنة والشراء</div></div>' +
        '<button type="button" id="sr-wish-x" style="width:36px;height:36px;border-radius:50%;border:1px solid rgba(250,247,238,.25);background:transparent;color:#FAF7EE;font-size:20px;cursor:pointer">×</button>' +
      '</div>' +
      '<div style="padding:14px 16px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px">' + html + '</div>';

    wdr.querySelector('#sr-wish-x').addEventListener('click', function () {
      document.getElementById('sr-wish-bg').classList.remove('open');
    });
    wdr.querySelectorAll('[data-wadd]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = +b.getAttribute('data-wadd');
        var list = getStoreList('serag_favs', []);
        if (list[idx]) {
          addToMiniCart(list[idx]);
          document.getElementById('sr-wish-bg').classList.remove('open');
          openCartDrawer();
        }
      });
    });
    wdr.querySelectorAll('[data-wdel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = +b.getAttribute('data-wdel');
        var list = getStoreList('serag_favs', []);
        list.splice(idx, 1);
        setStoreList('serag_favs', list);
        syncBadges();
        renderWishDrawer();
      });
    });
  }

  function openModal(sub, title, bodyHtml) {
    var mbg = document.getElementById('sr-modal-bg');
    if (!mbg) return;
    document.getElementById('sr-modal-sub').textContent = sub || 'محمد سراج للأجهزة الكهربائية';
    document.getElementById('sr-modal-title').textContent = title || '';
    document.getElementById('sr-modal-body').innerHTML = bodyHtml || '';
    mbg.classList.add('open');
  }

  function openTrackOrderModal() {
    var savedOrder = null;
    try { savedOrder = JSON.parse(localStorage.getItem('serag_order') || 'null'); } catch (e) {}
    var code = (savedOrder && savedOrder.id) || 'SR-2026-0123';
    var cname = (savedOrder && savedOrder.customer && savedOrder.customer.name) || 'عميل محمد سراج';
    var gov = (savedOrder && savedOrder.customer && savedOrder.customer.gov) || 'المنصورة';

    var html =
      '<div style="background:#fff;border:1px solid #ECE6D3;border-radius:18px;padding:16px;margin-bottom:18px">' +
        '<label style="font-size:13px;font-weight:700;color:#2F3B34;display:block;margin-bottom:8px">أدخل رقم الطلب أو رقم الموبايل للمتابعة الفورية:</label>' +
        '<div style="display:flex;gap:8px">' +
          '<input id="sr-trk-in" type="text" value="' + code + '" style="flex:1;padding:10px 14px;border-radius:12px;border:1.5px solid #D9D1B8;font-family:Outfit,sans-serif;font-weight:700;font-size:15px" />' +
          '<button type="button" id="sr-trk-btn" style="padding:0 18px;border-radius:12px;border:0;background:#2A4D38;color:#FAF7EE;font-weight:700;cursor:pointer">تتبّع الآن</button>' +
        '</div>' +
      '</div>' +
      '<div id="sr-trk-res" style="background:#fff;border:1.5px solid #2A4D38;border-radius:20px;padding:18px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding-bottom:12px;border-bottom:1px solid #ECE6D3">' +
          '<div><span style="font-size:12px;color:#5E6861">رقم الطلب:</span> <strong id="sr-trk-code" style="font-family:Outfit,sans-serif;color:#2A4D38">' + code + '</strong> · <span style="font-size:13px;font-weight:700">' + cname + ' (' + gov + ')</span></div>' +
          '<span style="background:#EAFBF0;color:#15803D;padding:4px 12px;border-radius:999px;font-size:12.5px;font-weight:800">جاري التجهيز والفحص الفني</span>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px;text-align:center;font-size:12.5px">' +
          '<div style="padding:10px 6px;border-radius:12px;background:#EAFBF0;color:#15803D;font-weight:700">✓ 1. استلام الطلب</div>' +
          '<div style="padding:10px 6px;border-radius:12px;background:#EAFBF0;color:#15803D;font-weight:700">✓ 2. تأكيد تليفوني</div>' +
          '<div style="padding:10px 6px;border-radius:12px;background:#2A4D38;color:#D2C27A;font-weight:800">● 3. فحص وتجهيز</div>' +
          '<div style="padding:10px 6px;border-radius:12px;background:#FAF7EE;color:#7A847D;font-weight:600">4. خرج للتوصيل</div>' +
        '</div>' +
        '<div style="margin-top:14px;font-size:13.5px;color:#5E6861;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
          '<span>مندوب التوصيل هيتواصل معاك قبل التحرك بـ 60 دقيقة.</span>' +
          '<a href="' + C.waLink('السلام عليكم، بتابع حالة طلبي رقم: ' + code) + '" target="_blank" rel="noopener" style="color:#15803D;font-weight:800;text-decoration:none">استفسر عبر واتساب ←</a>' +
        '</div>' +
      '</div>';

    openModal('خدمة متابعة الشحنات', 'تتبّع حالة طلبك لحظة بلحظة', html);
    var btn = document.getElementById('sr-trk-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        var v = (document.getElementById('sr-trk-in').value || '').trim() || 'SR-2026-0123';
        document.getElementById('sr-trk-code').textContent = v;
        showToast('تم تحديث حالة الطلب رقم ' + v);
      });
    }
  }

  // Product Compare Engine
  var compareList = [];

  function syncCompareButtons() {
    document.querySelectorAll('.pcard').forEach(function (card) {
      var btn = card.querySelector('.sr-cmp-btn');
      if (!btn) return;
      var prod = findProductFromCard(card);
      var isIn = compareList.some(function (x) { return x.id === prod.id || x.name === prod.name; });
      btn.classList.toggle('active', isIn);
      btn.innerHTML = isIn ? '✓ مقارن' : '⇄ قارن';
    });
  }

  function renderCompareBar() {
    var bar = document.getElementById('sr-compare-bar');
    syncCompareButtons();
    if (!bar) return;
    if (compareList.length === 0) {
      bar.classList.remove('show');
      return;
    }
    bar.classList.add('show');
    bar.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<span style="background:#B5A45C;color:#14201A;font-weight:800;font-size:12.5px;padding:4px 10px;border-radius:999px">مقارنة الأجهزة (' + compareList.length + '/3)</span>' +
        compareList.map(function (p, i) {
          return '<span style="font-size:12.5px;background:rgba(250,247,238,.12);border:1px solid rgba(210,194,122,.3);padding:4px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:6px">' +
            '<span style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + p.name.split('—')[0] + '</span>' +
            '<button type="button" data-cmp-rm="' + i + '" style="border:0;background:transparent;color:#D2C27A;cursor:pointer;font-weight:800;padding:0;line-height:1">×</button>' +
          '</span>';
        }).join('') +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button type="button" id="sr-cmp-open" style="padding:7px 16px;border-radius:12px;border:0;background:#D2C27A;color:#14201A;font-weight:800;font-size:13px;cursor:pointer">قارن المواصفات الآن (' + compareList.length + ')</button>' +
        '<button type="button" id="sr-cmp-clear" style="padding:7px 10px;border-radius:12px;border:1px solid rgba(250,247,238,.25);background:transparent;color:#FAF7EE;font-size:12px;cursor:pointer">مسح</button>' +
      '</div>';

    bar.querySelector('#sr-cmp-open').addEventListener('click', openCompareModal);
    bar.querySelector('#sr-cmp-clear').addEventListener('click', function () {
      compareList = [];
      renderCompareBar();
    });
    bar.querySelectorAll('[data-cmp-rm]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = +b.getAttribute('data-cmp-rm');
        compareList.splice(idx, 1);
        renderCompareBar();
      });
    });
  }

  function openCompareModal() {
    if (compareList.length === 0) return;
    var cols = compareList;
    var row = function (label, fn) {
      return '<tr><th>' + label + '</th>' + cols.map(function (p) { return '<td>' + fn(p) + '</td>'; }).join('') + '</tr>';
    };
    var table =
      '<div style="overflow-x:auto"><table class="sr-cmp-table">' +
        row('الجهاز', function (p) { return '<strong style="color:#14201A;font-size:14.5px">' + p.name + '</strong>'; }) +
        row('الماركة', function (p) { return '<span style="color:#6F6329;font-weight:700">' + p.brand + '</span>'; }) +
        row('السعر الكاش', function (p) { return '<strong style="font-family:Outfit,sans-serif;font-size:18px;color:#2A4D38">' + p.price.toLocaleString('en-US') + ' ج.م</strong>'; }) +
        row('السعة / المقاس', function (p) { return p.cap; }) +
        row('التكنولوجيا والتبريد', function (p) { return p.tech; }) +
        row('الضمان المعتمد', function (p) { return '<span style="color:#15803D;font-weight:700">✓ ' + p.warranty + '</span>'; }) +
        row('بلد المنشأ', function (p) { return p.origin; }) +
        row('إجراء سريع', function (p) { return '<button type="button" data-cmp-add="' + p.id + '" style="width:100%;padding:9px;border-radius:10px;border:0;background:#2A4D38;color:#FAF7EE;font-weight:700;cursor:pointer">أضف للسلة</button>'; }) +
      '</table></div>';
    openModal('مقارنة فنية دقيقة (' + cols.length + ' أجهزة)', 'مقارنة المواصفات والأسعار جنباً إلى جنب', table);
    document.querySelectorAll('[data-cmp-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var pid = b.getAttribute('data-cmp-add');
        var prod = compareList.filter(function (x) { return x.id === pid; })[0] || CATALOG.filter(function (x) { return x.id === pid; })[0] || compareList[0];
        addToMiniCart(prod);
        document.getElementById('sr-modal-bg').classList.remove('open');
        openCartDrawer();
      });
    });
  }

  function enhanceProductCards() {
    var favs = getStoreList('serag_favs', []);
    document.querySelectorAll('.pcard').forEach(function (card) {
      if (card.closest('#guides')) return;
      var imgBox = card.querySelector('div:first-child');
      if (!imgBox) return;
      imgBox.style.position = 'relative';

      if (!imgBox.querySelector('.sr-cmp-btn')) {
        var cbtn = document.createElement('button');
        cbtn.type = 'button';
        cbtn.className = 'sr-cmp-btn';
        cbtn.innerHTML = '⇄ قارن';
        cbtn.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          var curProd = findProductFromCard(card);
          var idx = -1;
          compareList.forEach(function (x, i) { if (x.id === curProd.id || x.name === curProd.name) idx = i; });
          if (idx >= 0) {
            compareList.splice(idx, 1);
            showToast('تمت إزالة «' + curProd.name.slice(0, 22) + '» من المقارنة');
          } else {
            if (compareList.length >= 3) {
              showToast('يمكنك مقارنة 3 أجهزة كحد أقصى — احذف جهازاً لإضافة آخر');
              return;
            }
            compareList.push(curProd);
            showToast('تمت إضافة «' + curProd.name.slice(0, 22) + '» للمقارنة (' + compareList.length + '/3)');
          }
          renderCompareBar();
        });
        imgBox.appendChild(cbtn);
      }

      // Wire heart button inside card
      var heartBtn = imgBox.querySelector('button[aria-label*="مفضلة"]');
      if (heartBtn && !heartBtn._srWired) {
        heartBtn._srWired = true;
        heartBtn.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          var curProd = findProductFromCard(card);
          toggleFav(curProd, heartBtn);
        });
      }
      if (heartBtn) {
        var pNow = findProductFromCard(card);
        heartBtn.classList.toggle('sr-fav-active', favs.some(function (f) { return f.id === pNow.id || f.name === pNow.name; }));
      }
    });
    syncCompareButtons();
  }

  function setupLiveSearch() {
    var inp = document.querySelector('header input[type="search"]');
    if (!inp || inp._srSearchWired) return;
    inp._srSearchWired = true;
    var wrap = inp.closest('form') || inp.parentElement;
    if (!wrap) return;

    var dd = document.createElement('div');
    dd.id = 'sr-search-dd';
    wrap.appendChild(dd);

    function renderResults(q) {
      var term = (q || '').trim().toLowerCase();
      var list = CATALOG.filter(function (p) {
        if (!term) return true;
        return p.name.toLowerCase().indexOf(term) !== -1 ||
               p.brand.toLowerCase().indexOf(term) !== -1 ||
               p.cat.toLowerCase().indexOf(term) !== -1;
      }).slice(0, 5);

      var pills = ['ثلاجات', 'غسالات', 'شاشات', 'تكييفات', 'بوتاجازات', 'سامسونج', 'إل جي', 'توشيبا'];
      dd.innerHTML =
        '<div class="sr-sdd-pills">' +
          pills.map(function (pl) { return '<button type="button" class="sr-sdd-pill" data-spill="' + pl + '">' + pl + '</button>'; }).join('') +
        '</div>' +
        (list.length === 0
          ? '<div style="padding:18px;text-align:center;color:#5E6861;font-size:14px">لا توجد نتائج مطابقة لـ "' + q + '" — جرّب البحث باسم الماركة أو القسم.</div>'
          : list.map(function (p) {
              return '<div class="sr-sdd-item">' +
                '<a href="product.html" style="flex:1;text-decoration:none;color:inherit;min-width:0">' +
                  '<div style="font-size:11.5px;color:#6F6329;font-weight:700">' + p.brand + ' · ' + p.cat + '</div>' +
                  '<div style="font-size:14px;font-weight:700;color:#14201A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + p.name + '</div>' +
                '</a>' +
                '<div style="display:flex;align-items:center;gap:8px;flex:none">' +
                  '<span style="font-family:Outfit,sans-serif;font-weight:800;font-size:15px;color:#2A4D38">' + p.price.toLocaleString('en-US') + ' ج.م</span>' +
                  '<button type="button" data-sadd="' + p.id + '" style="padding:6px 10px;border-radius:10px;border:0;background:#2A4D38;color:#FAF7EE;font-size:12px;font-weight:700;cursor:pointer">+ للسلة</button>' +
                '</div>' +
              '</div>';
            }).join('')) +
        '<div style="padding-top:10px;margin-top:6px;border-top:1px solid #ECE6D3;display:flex;justify-content:space-between;align-items:center;font-size:13px">' +
          '<span style="color:#5E6861">نتائج فورية من كتالوج محمد سراج</span>' +
          '<a href="shop.html" style="color:#2A4D38;font-weight:800;text-decoration:none">عرض كل الأجهزة (96) ←</a>' +
        '</div>';

      dd.querySelectorAll('[data-spill]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.preventDefault();
          var val = b.getAttribute('data-spill');
          inp.value = val;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          renderResults(val);
        });
      });
      dd.querySelectorAll('[data-sadd]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          var pid = b.getAttribute('data-sadd');
          var prod = CATALOG.filter(function (x) { return x.id === pid; })[0] || CATALOG[0];
          addToMiniCart(prod);
          dd.classList.remove('open');
          openCartDrawer();
        });
      });
    }

    inp.addEventListener('focus', function () {
      renderResults(inp.value);
      dd.classList.add('open');
    });
    inp.addEventListener('input', function () {
      renderResults(inp.value);
      dd.classList.add('open');
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) dd.classList.remove('open');
    });
  }

  // Scroll Progress + Sticky Header state
  window.addEventListener('scroll', function () {
    var y = window.scrollY || document.documentElement.scrollTop;
    document.body.classList.toggle('sr-scrolled', y > 24);
    var prog = document.getElementById('sr-prog');
    if (prog) {
      var h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      prog.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
    }
  }, { passive: true });

  // Global Delegated Click Interactions
  document.addEventListener('click', function (e) {
    // 1. Article & Policy Modal links
    var artLink = e.target.closest('[data-article]');
    if (artLink) {
      e.preventDefault();
      var key = artLink.getAttribute('data-article');
      var art = ARTICLES[key];
      if (art) openModal(art.badge, art.title, art.body);
      return;
    }

    // 2. Order Tracking Modal links
    var trkLink = e.target.closest('[data-track-order]');
    if (trkLink) {
      e.preventDefault();
      openTrackOrderModal();
      return;
    }

    // 3. Header Wishlist button opens Wishlist Drawer
    var wishLink = e.target.closest('header a[aria-label="المفضلة"]');
    if (wishLink) {
      e.preventDefault();
      renderWishDrawer();
      var wbg = document.getElementById('sr-wish-bg');
      if (wbg) wbg.classList.add('open');
      return;
    }

    // 4. WhatsApp Product Inquiry
    var waProd = e.target.closest('[data-wa-product]');
    if (waProd) {
      e.preventDefault();
      var card = waProd.closest('.pcard');
      var pInfo = card ? findProductFromCard(card) : null;
      var name = pInfo ? pInfo.name : (document.querySelector('h1') ? document.querySelector('h1').textContent.trim().replace(/\s+/g, ' ') : CATALOG[0].name);
      var price = pInfo ? pInfo.price.toLocaleString('en-US') : '28,900';
      window.open(C.waLink('السلام عليكم، عايز أسأل على:\n' + name + '\nالسعر: ' + price + ' ج.م\nهل متاح حالياً؟'), '_blank');
      return;
    }

    // 5. General WhatsApp Inquiry
    if (e.target.closest('[data-wa-general]')) {
      e.preventDefault();
      window.open(C.waLink('السلام عليكم، عندي استفسار من موقع محمد سراج 👋'), '_blank');
      return;
    }

    // 6. Add to Cart buttons on cards
    var addBtn = e.target.closest('.btn-add, .round-add');
    if (addBtn) {
      var c = addBtn.closest('.pcard');
      var prod = findProductFromCard(c);
      addToMiniCart(prod);
      showToast('تمت الإضافة للسلة ✓ · ' + prod.name.slice(0, 24));
      var lbl = addBtn.querySelector('span');
      if (lbl && !addBtn._srBusy) {
        addBtn._srBusy = true;
        var orig = lbl.textContent;
        addBtn.style.background = '#15803D';
        lbl.textContent = '✓ تمت الإضافة';
        setTimeout(function () {
          lbl.textContent = orig;
          addBtn.style.background = '#2A4D38';
          addBtn._srBusy = false;
        }, 1300);
      }
    }
  });

  function boot() {
    injectStyles();
    setTimeout(function () {
      setupChrome();
      setupAnimations();
      ensureDrawersAndModals();
      setupLiveSearch();
      enhanceProductCards();

      // Observe React re-renders inside #dc-root (e.g. filtering in shop.html)
      var root = document.getElementById('dc-root');
      if (root && 'MutationObserver' in window) {
        var tmr = null;
        var mo = new MutationObserver(function () {
          clearTimeout(tmr);
          tmr = setTimeout(function () {
            setupLiveSearch();
            enhanceProductCards();
            syncBadges();
          }, 120);
        });
        mo.observe(root, { childList: true, subtree: true });
      }
    }, 240);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


