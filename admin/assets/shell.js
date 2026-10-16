/* =========================================================
   Admin shell — sidebar, header, command palette (Ctrl/⌘+K),
   "g then key" shortcuts, theme, notifications, toasts, helpers.
   Every page: <body data-page="orders"> + <div id="view"></div>
   ========================================================= */
(function () {
  var S = window.SeragStore;

  /* ---------- helpers ---------- */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
  function ago(ts) {
    var d = Date.now() - ts, m = Math.round(d / 60000), h = Math.round(d / 3600000), days = Math.floor(d / 86400000);
    var t = new Date(ts).toLocaleTimeString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' });
    if (m < 1) return 'دلوقتي';
    if (m < 60) return 'من ' + m + ' دقيقة';
    if (days === 0 && new Date(ts).getDate() === new Date().getDate()) return 'النهارده · ' + t;
    if (days <= 1) return 'امبارح · ' + t;
    if (days === 2) return 'من يومين';
    return 'من ' + days + ' أيام';
  }
  // Arabic-aware matching: ignore hamza forms, taa marbuta, alef maqsura, diacritics and case.
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[ً-ْـ]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  }
  function matches(hay, q) {
    var h = norm(hay);
    return norm(q).split(/\s+/).filter(Boolean).every(function (t) { return h.indexOf(t) >= 0; });
  }

  var STATUS = {
    new: { label: 'جديد', cls: 's-new' },
    prep: { label: 'قيد التجهيز', cls: 's-prep' },
    ship: { label: 'خرج للتوصيل', cls: 's-ship' },
    done: { label: 'تم التسليم', cls: 's-done' },
    cancel: { label: 'ملغي', cls: 's-bad' }
  };
  var PAY = {
    cod: 'الدفع عند الاستلام', instapay: 'إنستا باي', vfcash: 'فودافون كاش', fawry: 'فوري',
    bank: 'تحويل بنكي', credit: 'آجل (حد ائتماني)'
  };

  var ICONS = {
    overview: 'M4 13h6V4H4v9zM4 20h6v-5H4v5zM14 20h6v-9h-6v9zM14 4v5h6V4h-6z',
    cms: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
    orders: 'M6 7h12l-1 12H7L6 7zM9 7a3 3 0 0 1 6 0',
    products: 'M4 8l8-4 8 4v8l-8 4-8-4V8zM4 8l8 4 8-4M12 12v8',
    customers: 'M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 19v-1a3 3 0 0 0-2-2.8M16 5.2a3 3 0 0 1 0 5.6',
    settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5',
    bell: 'M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15L6 17zM10 21h4',
    moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
    sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    menu: 'M4 7h16M4 12h16M4 17h16',
    plus: 'M12 5v14M5 12h14',
    store: 'M4 10l1.5-5h13L20 10M4 10v9h16v-9M4 10h16M9 19v-5h6v5',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    box: 'M4 8l8-4 8 4v8l-8 4-8-4V8z',
    reset: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
    print: 'M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v6H7v-6z',
    alert: 'M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    arrow: 'M15 6l-6 6 6 6'
  };
  function icon(name, size, sw) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.8) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[name] + '"></path></svg>';
  }

  var toastsEl;
  function toast(msg, opts) {
    opts = opts || {};
    var t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.innerHTML = '<span class="t-ic">' + icon('check', 15, 3) + '</span><span>' + esc(msg) + '</span>' +
      (opts.undo ? '<button type="button">تراجع</button>' : '');
    if (opts.undo) t.querySelector('button').onclick = function () { opts.undo(); t.remove(); };
    toastsEl.appendChild(t);
    setTimeout(function () { t.remove(); }, opts.undo ? 5000 : 2600);
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function csv(rows) {
    // BOM so Excel opens Arabic text as UTF-8
    return '﻿' + rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
  }

  // Event delegation: <button data-act="save" data-id="s1">
  function delegate(root, handlers) {
    ['click', 'input', 'change'].forEach(function (type) {
      root.addEventListener(type, function (e) {
        var el = e.target.closest('[data-act]');
        if (!el || !root.contains(el)) return;
        var isField = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
        if (type === 'click' && isField) return;
        if (type !== 'click' && !isField) return;
        if (type === 'change' && el.tagName !== 'SELECT' && el.type !== 'checkbox') return;
        var fn = handlers[el.dataset.act];
        if (fn) fn(el, e);
      });
    });
  }

  /* ---------- theme ---------- */
  function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'light'; }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('serag_admin_theme', t); } catch (e) {}
    var b = document.getElementById('theme-btn');
    if (b) { b.innerHTML = icon(t === 'dark' ? 'sun' : 'moon', 20); b.setAttribute('aria-label', t === 'dark' ? 'الوضع الفاتح' : 'الوضع الليلي'); }
    document.dispatchEvent(new CustomEvent('admin:theme', { detail: t }));
  }

  /* ---------- pages ---------- */
  var PAGES = [
    { group: 'الرئيسية' },
    { id: 'overview', href: 'index.html', label: 'نظرة عامة', key: 'h' },
    { group: 'المحتوى' },
    { id: 'cms', href: 'cms.html', label: 'محرر الموقع', key: 'e' },
    { group: 'المتجر' },
    { id: 'orders', href: 'orders.html', label: 'الطلبات', key: 'o' },
    { id: 'products', href: 'products.html', label: 'المنتجات', key: 'p' },
    { id: 'customers', href: 'customers.html', label: 'العملاء والتجّار', key: 'c' },
    { group: 'النظام' },
    { id: 'settings', href: 'settings.html', label: 'الإعدادات', key: 's' }
  ];
  var TITLES = { overview: null, cms: 'محرر الموقع', orders: 'الطلبات', products: 'المنتجات والمخزون', customers: 'العملاء والتجّار', settings: 'الإعدادات' };

  function counts() {
    var orders = S.orders.list(), products = S.products.list(), traders = S.traders.list();
    return {
      newOrders: orders.filter(function (o) { return o.status === 'new'; }).length,
      pendingTraders: traders.filter(function (t) { return t.status === 'pending'; }).length,
      lowStock: products.filter(function (p) { return p.stock <= 5; }).length,
      live: orders.filter(function (o) { return o.source === 'storefront' && o.status === 'new'; })
    };
  }

  function greeting() {
    var h = new Date().getHours();
    return h < 12 ? 'صباح الخير يا مدير' : 'مساء الخير يا مدير';
  }

  var page = document.body.dataset.page;
  var view = document.getElementById('view');

  function renderNav() {
    var c = counts();
    var badge = { orders: c.newOrders, customers: c.pendingTraders };
    return PAGES.map(function (p) {
      if (p.group) return '<div class="nav-group">' + p.group + '</div>';
      var cur = p.id === page ? ' aria-current="page"' : '';
      var b = badge[p.id] ? '<span class="badge" aria-label="' + badge[p.id] + ' بانتظارك">' + badge[p.id] + '</span>' : '<kbd>G ' + p.key.toUpperCase() + '</kbd>';
      return '<a href="' + p.href + '"' + cur + '>' + icon(p.id, 21) + '<span class="lbl">' + p.label + '</span>' + b + '</a>';
    }).join('');
  }

  function renderPop() {
    var c = counts(), items = [];
    c.live.forEach(function (o) {
      items.push({ href: 'orders.html#' + o.id, ic: 'store', t: 'طلب جديد من الموقع ' + o.id, s: ago(o.createdAt) });
    });
    if (c.newOrders) items.push({ href: 'orders.html#new', ic: 'orders', t: c.newOrders + ' طلب مستني تأكيدك', s: 'راجعهم وابدأ التجهيز' });
    if (c.pendingTraders) items.push({ href: 'customers.html', ic: 'customers', t: c.pendingTraders + ' طلبات تسجيل تجّار', s: 'محتاجين مراجعة وحد ائتماني' });
    if (c.lowStock) items.push({ href: 'products.html#low', ic: 'alert', t: c.lowStock + ' منتجات المخزون بتاعها قارب يخلص', s: '5 قطع أو أقل' });
    if (!items.length) return '<div class="empty" style="padding:28px 10px">مفيش حاجة مستنياك. كله تمام.</div>';
    return items.map(function (i) {
      return '<a href="' + i.href + '"><span class="pop-ic">' + icon(i.ic, 18) + '</span><span><b>' + esc(i.t) + '</b><small>' + esc(i.s) + '</small></span></a>';
    }).join('');
  }

  function build() {
    var title = TITLES[page] || greeting();
    var crumb = (PAGES.find(function (p) { return p.id === page; }) || {}).label || '';
    var cms = S.cms.get();
    var app = document.createElement('div');
    app.className = 'app';
    app.innerHTML =
      '<aside class="side" id="side" aria-label="القائمة الرئيسية">' +
        '<div class="brand"><div class="brand-mark" aria-hidden="true">س</div><div><div class="brand-name">محمد سراج</div><div class="brand-sub">ADMIN · SINCE 1972</div></div></div>' +
        '<nav class="nav" id="nav">' + renderNav() + '</nav>' +
        '<div class="side-card"><div class="live"><span class="dot-live"></span>الموقع منشور وشغال</div>' +
          '<p id="pub-note">آخر نشر ' + esc(ago(cms.publishedAt)) + '</p>' +
          '<a class="btn btn-gold btn-sm" href="../index.html" target="_blank" rel="noopener">افتح الموقع في تاب جديد</a></div>' +
      '</aside>' +
      '<div class="scrim" id="scrim"></div>' +
      '<div class="main">' +
        '<header class="topbar">' +
          '<button class="icon-btn menu-btn" id="menu-btn" type="button" aria-label="افتح القائمة" aria-controls="side" aria-expanded="false">' + icon('menu', 20) + '</button>' +
          '<div class="topbar-title"><span class="crumb">لوحة التحكم / ' + esc(crumb) + '</span><h1 id="page-title">' + esc(title) + '</h1></div>' +
          '<button class="search-trigger" id="search-btn" type="button" aria-haspopup="dialog">' + icon('search', 19, 2) + '<span>ابحث عن طلب، منتج، عميل...</span><kbd class="kbd kbd-hint">Ctrl K</kbd></button>' +
          '<button class="icon-btn" id="theme-btn" type="button"></button>' +
          '<div style="position:relative">' +
            '<button class="icon-btn" id="bell-btn" type="button" aria-label="الإشعارات" aria-expanded="false" aria-controls="pop">' + icon('bell', 21) + '<span class="ping" id="bell-ping"></span></button>' +
            '<div class="pop" id="pop" role="region" aria-label="الإشعارات">' + renderPop() + '</div>' +
          '</div>' +
          '<div class="me"><span class="avatar" aria-hidden="true">م</span><span><b>مدير المتجر</b><small>صلاحية كاملة</small></span></div>' +
        '</header>' +
      '</div>';
    var skip = document.createElement('a');
    skip.className = 'skip'; skip.href = '#view'; skip.textContent = 'انتقل للمحتوى';
    document.body.insertBefore(skip, document.body.firstChild);
    document.body.insertBefore(app, view);
    view.classList.add('content', 'intro');
    // Entrance motion plays once per page load, not on every re-render.
    setTimeout(function () { view.classList.remove('intro'); }, 600);
    view.setAttribute('tabindex', '-1');
    view.setAttribute('role', 'main');
    app.querySelector('.main').appendChild(view);

    toastsEl = document.createElement('div');
    toastsEl.className = 'toasts';
    toastsEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastsEl);

    setTheme(currentTheme());
    document.getElementById('theme-btn').onclick = function () { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); };

    var menuBtn = document.getElementById('menu-btn');
    function setNav(open) { document.body.classList.toggle('nav-open', open); menuBtn.setAttribute('aria-expanded', String(open)); }
    menuBtn.onclick = function () { setNav(!document.body.classList.contains('nav-open')); };
    document.getElementById('scrim').onclick = function () { setNav(false); };

    var bell = document.getElementById('bell-btn'), pop = document.getElementById('pop');
    bell.onclick = function (e) {
      e.stopPropagation();
      var open = !pop.classList.contains('open');
      pop.classList.toggle('open', open); bell.setAttribute('aria-expanded', String(open));
    };
    document.addEventListener('click', function (e) {
      if (!pop.contains(e.target)) { pop.classList.remove('open'); bell.setAttribute('aria-expanded', 'false'); }
    });
    refreshChrome();

    document.getElementById('search-btn').onclick = function () { palette.open(); };

    if (!S.persistent) setTimeout(function () { toast('المتصفح مانع الحفظ، التعديلات هتتمسح لما تقفل الصفحة'); }, 600);
    if (S.incoming) setTimeout(function () { toast('وصل طلب جديد من الموقع: ' + S.incoming.id); }, 500);
  }

  function refreshChrome() {
    document.getElementById('nav').innerHTML = renderNav();
    document.getElementById('pop').innerHTML = renderPop();
    var c = counts();
    document.getElementById('bell-ping').style.display = (c.newOrders || c.pendingTraders || c.lowStock) ? '' : 'none';
    var note = document.getElementById('pub-note');
    if (note) note.textContent = 'آخر نشر ' + ago(S.cms.get().publishedAt);
  }

  /* ---------- command palette ---------- */
  var palette = (function () {
    var back, input, list, items = [], sel = 0, lastFocus;

    function sources() {
      var out = [];
      PAGES.forEach(function (p) {
        if (!p.group) out.push({ g: 'الصفحات', ic: p.id, t: p.label, s: 'G ثم ' + p.key.toUpperCase(), go: p.href });
      });
      out.push({ g: 'أوامر', ic: 'plus', t: 'منتج جديد', s: 'يفتح محرر منتج فاضي', go: 'products.html#new' });
      out.push({ g: 'أوامر', ic: 'orders', t: 'الطلبات الجديدة', s: 'اعرض اللي مستني تأكيد', go: 'orders.html#new' });
      out.push({ g: 'أوامر', ic: currentTheme() === 'dark' ? 'sun' : 'moon', t: currentTheme() === 'dark' ? 'الوضع الفاتح' : 'الوضع الليلي', s: 'بدّل شكل اللوحة', run: function () { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); } });
      out.push({ g: 'أوامر', ic: 'store', t: 'افتح الموقع', s: 'في تاب جديد', run: function () { window.open('../index.html', '_blank', 'noopener'); } });
      out.push({ g: 'أوامر', ic: 'reset', t: 'استرجاع البيانات التجريبية', s: 'يمسح تعديلاتك ويرجّع البداية', run: function () {
        if (confirm('هترجع كل البيانات للبداية وتمسح تعديلاتك. متأكد؟')) { S.reset(); toast('اترجعت البيانات التجريبية'); setTimeout(function () { location.reload(); }, 600); }
      } });
      S.orders.list().forEach(function (o) {
        out.push({ g: 'الطلبات', ic: 'orders', t: o.id + ' · ' + o.customer, s: STATUS[o.status].label + ' · ' + fmt(S.orders.total(o)) + ' ج.م', go: 'orders.html#' + o.id });
      });
      S.products.list().forEach(function (p) {
        out.push({ g: 'المنتجات', ic: 'products', t: p.name, s: p.brand + ' · ' + fmt(p.price) + ' ج.م · مخزون ' + p.stock, go: 'products.html#' + p.id });
      });
      S.customers.list().forEach(function (c) {
        out.push({ g: 'العملاء', ic: 'customers', t: c.name, s: c.type + ' · ' + c.city, go: 'customers.html#' + c.id });
      });
      S.traders.list().filter(function (t) { return t.status === 'pending'; }).forEach(function (t) {
        out.push({ g: 'طلبات التجّار', ic: 'customers', t: t.company, s: 'بانتظار المراجعة · ' + t.city, go: 'customers.html#' + t.id });
      });
      return out;
    }

    function render() {
      var q = input.value.trim();
      var all = sources();
      items = q ? all.filter(function (i) { return matches(i.t + ' ' + i.s + ' ' + i.g, q); }).slice(0, 40)
                : all.filter(function (i) { return i.g === 'الصفحات' || i.g === 'أوامر'; });
      sel = Math.min(sel, Math.max(0, items.length - 1));
      if (!items.length) { list.innerHTML = '<div class="empty">مفيش نتيجة لـ «' + esc(q) + '». جرّب رقم طلب أو اسم منتج.</div>'; return; }
      var html = '', g = null;
      items.forEach(function (i, k) {
        if (i.g !== g) { g = i.g; html += '<div class="cmdk-group" role="presentation">' + esc(g) + '</div>'; }
        html += '<div class="cmdk-item" role="option" id="cmdk-' + k + '" data-k="' + k + '" aria-selected="' + (k === sel) + '"><span class="ic">' + icon(i.ic, 18) +
          '</span><span class="tx"><b>' + esc(i.t) + '</b><small>' + esc(i.s) + '</small></span></div>';
      });
      list.innerHTML = html;
      input.setAttribute('aria-activedescendant', 'cmdk-' + sel);
      var cur = document.getElementById('cmdk-' + sel);
      if (cur) cur.scrollIntoView({ block: 'nearest' });
    }

    function choose(k) {
      var i = items[k];
      if (!i) return;
      close();
      if (i.run) i.run();
      else {
        var target = new URL(i.go, location.href);
        if (target.pathname === location.pathname) {
          location.hash = target.hash;
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        } else location.href = i.go;
      }
    }

    function open() {
      lastFocus = document.activeElement;
      back.classList.add('open'); input.value = ''; sel = 0; render(); input.focus();
    }
    function close() { back.classList.remove('open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }

    function init() {
      back = document.createElement('div');
      back.className = 'cmdk-back';
      back.innerHTML =
        '<div class="cmdk" role="dialog" aria-modal="true" aria-label="البحث والأوامر">' +
          '<div class="cmdk-in">' + icon('search', 22, 2) + '<input id="cmdk-input" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" autocomplete="off" placeholder="اكتب رقم طلب، منتج، عميل، أو أمر..."></div>' +
          '<div class="cmdk-list" id="cmdk-list" role="listbox"></div>' +
          '<div class="cmdk-foot"><span><kbd class="kbd">↑↓</kbd> تنقّل</span><span><kbd class="kbd">Enter</kbd> افتح</span><span><kbd class="kbd">Esc</kbd> اقفل</span><span><kbd class="kbd">G</kbd> ثم حرف الصفحة للانتقال السريع</span></div>' +
        '</div>';
      document.body.appendChild(back);
      input = back.querySelector('input');
      list = back.querySelector('.cmdk-list');
      input.addEventListener('input', function () { sel = 0; render(); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); render(); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
        else if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'Tab') { e.preventDefault(); }
      });
      list.addEventListener('click', function (e) {
        var el = e.target.closest('.cmdk-item');
        if (el) choose(Number(el.dataset.k));
      });
      list.addEventListener('mousemove', function (e) {
        var el = e.target.closest('.cmdk-item');
        if (el && Number(el.dataset.k) !== sel) { sel = Number(el.dataset.k); render(); }
      });
      back.addEventListener('click', function (e) { if (e.target === back) close(); });
    }
    return { init: init, open: open, close: close, isOpen: function () { return back.classList.contains('open'); } };
  })();

  /* ---------- keyboard ---------- */
  var gPending = 0;
  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); palette.isOpen() ? palette.close() : palette.open(); return; }
    if (e.key === 'Escape') {
      document.body.classList.remove('nav-open');
      var pop = document.getElementById('pop'); if (pop) pop.classList.remove('open');
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey || palette.isOpen()) return;
    if (e.key === '/') { e.preventDefault(); palette.open(); return; }
    var k = e.key.toLowerCase();
    if (k === 'g') { gPending = Date.now(); return; }
    if (gPending && Date.now() - gPending < 1200) {
      gPending = 0;
      var p = PAGES.find(function (x) { return x.key === k; });
      if (p) { e.preventDefault(); location.href = p.href; }
    }
  });

  build();
  palette.init();
  S.on(function () { refreshChrome(); });

  window.Admin = {
    esc: esc, fmt: fmt, ago: ago, matches: matches, icon: icon, toast: toast, download: download, csv: csv,
    delegate: delegate, STATUS: STATUS, PAY: PAY, store: S, refresh: refreshChrome,
    setTitle: function (t) { document.getElementById('page-title').textContent = t; },
    theme: currentTheme
  };
})();
