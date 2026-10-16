/* محرر الموقع — homepage sections: reorder, hide, edit, preview, publish, versions */
(function () {
  var A = window.Admin, S = A.store, esc = A.esc;
  var view = document.getElementById('view');

  var DEFS = {
    announce: { label: 'شريط الإعلان', f: [['text', 'text', 'نص الإعلان'], ['link', 'text', 'نص الرابط']] },
    hero: { label: 'الهيرو الرئيسي', f: [['eyebrow', 'text', 'السطر العلوي'], ['title1', 'text', 'العنوان - الجزء الأول'], ['title2', 'text', 'العنوان - الجزء الملوّن'], ['sub', 'long', 'الوصف'], ['cta1', 'text', 'زر أساسي'], ['cta2', 'text', 'زر ثانوي'], ['badge', 'text', 'نص الختم الدائري'], ['theme', 'swatch', 'ثيم الهيرو']] },
    categories: { label: 'التصنيفات', f: [['title', 'text', 'عنوان القسم'], ['sub', 'long', 'وصف القسم']] },
    flash: { label: 'عروض الفلاش', f: [['title', 'text', 'عنوان القسم'], ['sub', 'long', 'وصف القسم'], ['hours', 'text', 'ساعات العد التنازلي']] },
    bridal: { label: 'باقات جهاز العروسة', f: [['title', 'text', 'عنوان القسم'], ['sub', 'long', 'وصف القسم'], ['tier1', 'text', 'اسم الباقة 1'], ['tier2', 'text', 'اسم الباقة 2'], ['tier3', 'text', 'اسم الباقة 3']] },
    b2b: { label: 'قسم الشركات والتجّار', f: [['title', 'text', 'عنوان القسم'], ['sub', 'long', 'وصف القسم'], ['cta', 'text', 'نص الزر']] },
    about: { label: 'من نحن', f: [['title', 'text', 'عنوان القسم'], ['p1', 'long', 'الفقرة الأولى'], ['p2', 'long', 'الفقرة الثانية'], ['since', 'text', 'سنة التأسيس']] },
    footer: { label: 'الفوتر', f: [['tagline', 'long', 'الوصف المختصر'], ['whatsapp', 'text', 'رقم الواتساب'], ['address', 'text', 'العنوان']] }
  };
  var THEMES = [
    { name: 'أخضر ملكي', bg: '#16291E', fg: '#FAF7EE', acc: '#D2C27A', btn: '#B5A45C', btnFg: '#14201A' },
    { name: 'كريمي', bg: '#F1ECDD', fg: '#14201A', acc: '#6F6329', btn: '#2A4D38', btnFg: '#FAF7EE' },
    { name: 'ذهبي', bg: '#B5A45C', fg: '#14201A', acc: '#2A4D38', btn: '#14201A', btnFg: '#FAF7EE' },
    { name: 'فحمي', bg: '#1C1F1D', fg: '#FAF7EE', acc: '#D2C27A', btn: '#D2C27A', btnFg: '#14201A' }
  ];
  var ui = { sel: 'hero', tab: 'edit', device: 'desktop' };
  var c = S.cms.get();

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function changedIn(id) {
    return Object.keys(c.draft[id]).filter(function (k) { return c.draft[id][k] !== c.published[id][k]; }).length;
  }
  function layoutChanges() {
    var n = 0, pl = c.publishedLayout || { order: c.order, hidden: {} };
    if (pl.order.join() !== c.order.join()) n++;
    c.order.forEach(function (id) { if (!!pl.hidden[id] !== !!c.hidden[id]) n++; });
    return n;
  }
  function totalChanges() { return c.order.reduce(function (a, id) { return a + changedIn(id); }, 0) + layoutChanges(); }
  function persist() { S.cms.saveDraft(c.draft, c.order, c.hidden); }

  /* ---------- left column ---------- */
  function sectionsCard() {
    return '<section class="card stack" style="padding:20px;gap:4px" aria-labelledby="secs-h">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:0 4px 8px;flex-wrap:wrap"><h2 class="card-title" id="secs-h" style="font-size:25px">أقسام الصفحة</h2><span class="card-sub">رتّب، أخفي، أو افتح للتعديل</span></div>' +
      c.order.map(function (id, i) {
        var on = !c.hidden[id], n = changedIn(id), d = DEFS[id];
        return '<div class="sec" aria-current="' + (id === ui.sel) + '">' +
          '<span class="mv"><button type="button" data-act="up" data-id="' + id + '" aria-label="طلّع ' + d.label + ' لفوق"' + (i === 0 ? ' disabled' : '') + '>' + chev('up') + '</button>' +
          '<button type="button" data-act="down" data-id="' + id + '" aria-label="نزّل ' + d.label + ' لتحت"' + (i === c.order.length - 1 ? ' disabled' : '') + '>' + chev('down') + '</button></span>' +
          '<button type="button" class="open' + (on ? '' : ' off') + '" data-act="pick" data-id="' + id + '"><span class="no">' + (i + 1) + '</span>' +
            '<span class="cell-main"><b style="font-size:15.5px">' + d.label + '</b><small>' + (on ? d.f.length + ' حقول' : 'مخفي عن الزوار') + '</small></span></button>' +
          (n ? '<span class="chg" aria-label="' + n + ' تعديل">' + n + '</span>' : '') +
          '<button type="button" class="switch" role="switch" data-act="hide" data-id="' + id + '" aria-checked="' + on + '" aria-label="إظهار ' + d.label + '"></button>' +
        '</div>';
      }).join('') + '</section>';
  }
  function chev(dir) {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
      (dir === 'up' ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6') + '"/></svg>';
  }

  function editorCard() {
    var d = DEFS[ui.sel];
    var head = '<div style="display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap">' +
      '<div style="display:flex;flex-direction:column;gap:3px"><h2 class="card-title" style="font-size:27px">' + d.label + '</h2><span class="field-key" style="text-align:right">content.' + ui.sel + '</span></div>' +
      '<div class="seg" role="group" aria-label="طريقة العرض"><button type="button" data-act="tab" data-t="edit" aria-pressed="' + (ui.tab === 'edit') + '">تحرير</button><button type="button" data-act="tab" data-t="json" aria-pressed="' + (ui.tab === 'json') + '">API</button></div></div>';
    if (ui.tab === 'json') {
      var json = JSON.stringify({ section: ui.sel, visible: !c.hidden[ui.sel], position: c.order.indexOf(ui.sel) + 1, updated_by: 'admin', fields: c.draft[ui.sel] }, null, 2);
      return '<section class="card stack" style="padding:22px" id="editor">' + head +
        '<pre class="code" aria-label="شكل البيانات اللي هتتبعت للـ API">' + esc(json) + '</pre>' +
        '<button type="button" class="btn btn-line btn-sm" data-act="copy" style="align-self:flex-start">انسخ الـ JSON</button></section>';
    }
    return '<section class="card stack" style="padding:22px;gap:18px" id="editor">' + head +
      d.f.map(function (f) {
        var key = f[0], kind = f[1], label = f[2], val = c.draft[ui.sel][key], changed = val !== c.published[ui.sel][key], id = 'f-' + ui.sel + '-' + key;
        var top = '<div class="field-top"><' + (kind === 'swatch' ? 'span class="label"' : 'label for="' + id + '"') + '>' + label + '</' + (kind === 'swatch' ? 'span' : 'label') + '>' +
          '<span style="display:flex;align-items:center;gap:8px">' + (changed ? '<button type="button" class="reset-btn" data-act="reset" data-k="' + key + '">رجّع الأصلي</button>' : '') +
          '<span class="field-key">' + key + '</span></span></div>';
        var input;
        if (kind === 'swatch') {
          input = '<div class="swatches" role="group" aria-label="' + label + '">' + THEMES.map(function (t, ti) {
            return '<button type="button" class="swatch" data-act="theme" data-i="' + ti + '" aria-pressed="' + (ti === val) + '"><i style="background:' + t.bg + ';color:' + t.acc + '" aria-hidden="true">أب</i><span>' + t.name + '</span></button>';
          }).join('') + '</div>';
        } else if (kind === 'long') {
          input = '<textarea id="' + id + '" rows="3" data-act="field" data-k="' + key + '">' + esc(val) + '</textarea>';
        } else {
          input = '<input id="' + id + '" data-act="field" data-k="' + key + '" value="' + esc(val) + '">';
        }
        return '<div class="field' + (changed ? ' changed' : '') + '">' + top + input + (kind !== 'swatch' ? '<span class="counter"><span class="num">' + String(val).length + '</span> حرف</span>' : '') + '</div>';
      }).join('') +
      '<p class="note dashed" style="margin:0;display:flex;gap:10px;align-items:flex-start">كل حقل هنا ليه مفتاح ثابت في الـ API، فالموقع بيقرأ النص من الباك إند مباشرة وأي تعديل بيظهر للزوار بعد النشر.</p>' +
    '</section>';
  }

  function versionsCard() {
    return '<section class="card" style="padding:20px" aria-labelledby="ver-h"><h2 class="card-title" id="ver-h" style="font-size:25px;padding:0 4px 8px">سجل النسخ</h2>' +
      c.versions.map(function (v, i) {
        return '<div class="ver' + (i === 0 ? ' live' : '') + '"><span class="v">v' + v.n + '</span><span class="cell-main" style="flex:1"><b style="font-size:14.5px">' + esc(v.label) + '</b><small>' +
          esc(A.ago(v.at)) + (i === 0 ? ' · المنشورة دلوقتي' : '') + '</small></span>' +
          (i === 0 ? '' : '<button type="button" class="btn btn-line btn-sm" data-act="restore" data-n="' + v.n + '">استرجاع</button>') + '</div>';
      }).join('') + '</section>';
  }

  /* ---------- preview ---------- */
  function preview() {
    var p = c.draft, th = THEMES[p.hero.theme] || THEMES[0];
    var blocks = {
      announce: '<div class="s-ann"><span>' + esc(p.announce.text) + '</span><u>' + esc(p.announce.link) + '</u></div>',
      hero: '<div class="s-hero" style="background:' + th.bg + ';color:' + th.fg + '"><div style="flex:1 1 240px;display:flex;flex-direction:column;gap:14px">' +
        '<span class="s-eyebrow" style="border-color:' + th.acc + ';color:' + th.acc + '">' + esc(p.hero.eyebrow) + '</span>' +
        '<h3>' + esc(p.hero.title1) + ' <span style="color:' + th.acc + '">' + esc(p.hero.title2) + '</span></h3>' +
        '<p style="margin:0;line-height:1.9;opacity:.85;max-width:460px">' + esc(p.hero.sub) + '</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px"><span class="s-btn" style="background:' + th.btn + ';color:' + th.btnFg + '">' + esc(p.hero.cta1) + '</span><span class="s-btn" style="border:1.5px solid ' + th.fg + '">' + esc(p.hero.cta2) + '</span></div></div>' +
        '<div class="s-seal" style="border-color:' + th.acc + '"><span class="num" style="font-weight:800;font-size:14px;letter-spacing:.12em;color:' + th.acc + '">' + esc(p.hero.badge) + '</span><span style="font-family:var(--f-display);font-size:50px;line-height:1">' +
          (new Date().getFullYear() - (parseInt(p.about.since, 10) || 1972)) + '</span><span style="font-size:13px;opacity:.8">سنة ثقة</span></div></div>',
      categories: '<div class="s-sec"><h4>' + esc(p.categories.title) + '</h4><p>' + esc(p.categories.sub) + '</p><div class="s-grid">' +
        ['ثلاجات', 'غسالات', 'شاشات', 'تكييفات'].map(function (x, i) { return '<div class="s-box"><div class="ph" style="background:' + ['#DDE6DA', '#DCE6EC', '#D9D6E6', '#D6E8EC'][i] + '"></div><b>' + x + '</b></div>'; }).join('') + '</div></div>',
      flash: '<div class="s-sec" style="background:#F1ECDD"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><h4>' + esc(p.flash.title) + '</h4>' +
        '<span class="s-count"><span>' + esc(String(p.flash.hours).padStart(2, '0')) + '</span>:<span>00</span>:<span>00</span></span></div><p>' + esc(p.flash.sub) + '</p><div class="s-grid">' +
        S.products.list().filter(function (x) { return x.flash && x.active; }).slice(0, 4).map(function (x) {
          return '<div class="s-box"><div class="ph" style="background:#fff;border:1px dashed #E1DAC0"></div><b style="line-height:1.4">' + esc(x.name) + '</b><span class="num" style="font-weight:800;color:#2A4D38">' + A.fmt(x.price) + ' ج.م</span></div>';
        }).join('') + '</div></div>',
      bridal: '<div class="s-sec"><h4>' + esc(p.bridal.title) + '</h4><p>' + esc(p.bridal.sub) + '</p><div class="s-grid3">' +
        [p.bridal.tier1, p.bridal.tier2, p.bridal.tier3].map(function (t, i) { return '<div class="s-box" style="' + (i === 1 ? 'border-color:#B5A45C;background:#FBF7E6' : '') + '"><b style="font-size:16px">' + esc(t) + '</b><span style="color:#5B665F">[سعر الباقة]</span></div>'; }).join('') + '</div></div>',
      b2b: '<div class="s-sec s-b2b"><h4>' + esc(p.b2b.title) + '</h4><p>' + esc(p.b2b.sub) + '</p><span class="s-btn" style="align-self:flex-start;background:#B5A45C;color:#14201A">' + esc(p.b2b.cta) + '</span></div>',
      about: '<div class="s-sec"><h4>' + esc(p.about.title) + '</h4><p>' + esc(p.about.p1) + '</p><p>' + esc(p.about.p2) + '</p><span class="num" style="font-weight:800;font-size:40px;color:#B5A45C;line-height:1">' + esc(p.about.since) + '</span></div>',
      footer: '<div class="s-foot"><span>' + esc(p.footer.tagline) + '</span><span>واتساب: ' + esc(p.footer.whatsapp) + ' · ' + esc(p.footer.address) + '</span></div>'
    };
    var shown = c.order.filter(function (id) { return !c.hidden[id]; });
    return '<div class="stage-head"><span class="dots" aria-hidden="true"><i style="background:#E4572E"></i><i style="background:#D2C27A"></i><i style="background:#5BD08A"></i></span>معاينة حيّة للمسودة · اضغط على أي قسم لتعديله</div>' +
      '<div class="stage"><div class="frame' + (ui.device === 'mobile' ? ' mobile' : '') + '"><div class="site">' +
      (shown.length ? shown.map(function (id) {
        return '<div class="pv' + (id === ui.sel ? ' sel' : '') + '" data-pv="' + id + '"><button type="button" class="hit" data-act="pick" data-id="' + id + '" aria-label="عدّل ' + DEFS[id].label + '"></button>' +
          (id === ui.sel ? '<span class="tag">' + DEFS[id].label + '</span>' : '') + blocks[id] + '</div>';
      }).join('') : '<div class="empty" style="color:#5B665F">كل الأقسام مخفية. شغّل قسم واحد على الأقل من القائمة.</div>') +
      '</div></div></div>';
  }

  /* ---------- page ---------- */
  function bar() {
    var n = totalChanges();
    return '<section class="card cms-bar" aria-label="حالة النشر">' +
      '<div style="display:flex;flex-direction:column;gap:2px;flex:1 1 220px"><b style="font-size:17px">الصفحة الرئيسية</b><span class="field-key" style="text-align:right">GET /api/content/home</span></div>' +
      '<div class="seg" role="group" aria-label="مقاس المعاينة"><button type="button" data-act="device" data-d="desktop" aria-pressed="' + (ui.device === 'desktop') + '">كمبيوتر</button><button type="button" data-act="device" data-d="mobile" aria-pressed="' + (ui.device === 'mobile') + '">موبايل</button></div>' +
      (n ? '<span class="pill s-new" style="padding:8px 14px"><span class="num">' + n + '</span>&nbsp;تعديل غير منشور</span>'
         : '<span class="pill s-done" style="padding:8px 14px">كل حاجة منشورة · ' + esc(A.ago(c.publishedAt)) + '</span>') +
      '<button type="button" class="btn btn-line btn-sm" data-act="discard"' + (n ? '' : ' disabled') + '>تجاهل التعديلات</button>' +
      '<button type="button" class="btn btn-gold btn-sm" data-act="publish"' + (n ? '' : ' disabled') + ' title="Ctrl + Enter">انشر على الموقع</button>' +
    '</section>';
  }

  function render() {
    var focusId = document.activeElement && document.activeElement.id, caret = focusId && document.activeElement.selectionStart;
    view.innerHTML = bar() + '<div class="cms-cols"><div class="cms-left">' + sectionsCard() + editorCard() + versionsCard() + '</div>' +
      '<div class="cms-right" id="stage">' + preview() + '</div></div>';
    if (focusId) { var el = document.getElementById(focusId); if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (e) {} } }
  }

  // Typing: patch only the bits that change so the field keeps focus and the preview stays smooth.
  function softRender() {
    var focusId = document.activeElement && document.activeElement.id, caret = focusId && document.activeElement.selectionStart;
    view.querySelector('.cms-bar').outerHTML = bar();
    view.querySelector('.cms-left section').outerHTML = sectionsCard();
    document.getElementById('editor').outerHTML = editorCard();
    document.getElementById('stage').innerHTML = preview();
    if (focusId) { var el = document.getElementById(focusId); if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (e) {} } }
  }

  function move(id, d) {
    var i = c.order.indexOf(id), j = i + d;
    if (j < 0 || j >= c.order.length) return;
    c.order.splice(i, 1); c.order.splice(j, 0, id);
    persist(); render();
    var b = view.querySelector('[data-act="' + (d < 0 ? 'up' : 'down') + '"][data-id="' + id + '"]');
    if (b && !b.disabled) b.focus(); else { b = view.querySelector('[data-act="pick"][data-id="' + id + '"]'); if (b) b.focus(); }
  }

  function publish() {
    var n = totalChanges();
    if (!n) return;
    c = S.cms.publish(n + ' تعديل منشور');
    render();
    A.toast('اتنشر ' + n + ' تعديل على الموقع');
  }

  A.delegate(view, {
    pick: function (el) {
      ui.sel = el.dataset.id; ui.tab = 'edit'; render();
      var first = document.querySelector('#editor input, #editor textarea, #editor .swatch');
      if (el.classList.contains('hit')) { document.getElementById('editor').scrollIntoView({ behavior: 'smooth', block: 'start' }); if (first) first.focus({ preventScroll: true }); }
      else { var pv = view.querySelector('[data-pv="' + ui.sel + '"]'); if (pv) pv.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    },
    up: function (el) { move(el.dataset.id, -1); },
    down: function (el) { move(el.dataset.id, 1); },
    hide: function (el) {
      var id = el.dataset.id; c.hidden[id] = !c.hidden[id]; persist(); render();
      A.toast(c.hidden[id] ? 'اتخفى «' + DEFS[id].label + '» من المسودة' : 'رجع «' + DEFS[id].label + '» للمسودة');
    },
    tab: function (el) { ui.tab = el.dataset.t; render(); },
    device: function (el) { ui.device = el.dataset.d; render(); },
    field: function (el) { c.draft[ui.sel][el.dataset.k] = el.value; persist(); softRender(); },
    theme: function (el) { c.draft.hero.theme = Number(el.dataset.i); persist(); softRender(); },
    reset: function (el) { c.draft[ui.sel][el.dataset.k] = c.published[ui.sel][el.dataset.k]; persist(); render(); },
    copy: function () {
      var t = view.querySelector('.code').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { A.toast('اتنسخ الـ JSON'); }, function () { A.toast('النسخ مش متاح هنا، حدد النص وانسخه'); });
    },
    discard: function () {
      var before = { draft: clone(c.draft), order: c.order.slice(), hidden: clone(c.hidden) };
      c.draft = clone(c.published);
      c.order = c.publishedLayout.order.slice(); c.hidden = clone(c.publishedLayout.hidden);
      persist(); render();
      A.toast('اترجعت كل التعديلات', { undo: function () { c.draft = before.draft; c.order = before.order; c.hidden = before.hidden; persist(); render(); } });
    },
    publish: publish,
    restore: function (el) {
      var v = c.versions.find(function (x) { return x.n === Number(el.dataset.n); });
      c.draft = clone(v.snap.content); c.order = v.snap.order.slice(); c.hidden = clone(v.snap.hidden);
      persist(); render();
      A.toast('اترجعت النسخة v' + v.n + ' كمسودة، انشرها عشان تتأكد');
    }
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); publish(); }
  });
  S.on(function (kind, d) { if ((kind === 'cms' && d.op === 'external') || kind === 'reset') { c = S.cms.get(); render(); } });
  render();
})();
