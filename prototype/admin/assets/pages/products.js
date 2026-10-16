/* المنتجات والمخزون — table, filters, editor with live storefront-card preview */
(function () {
  var A = window.Admin, S = A.store, esc = A.esc, fmt = A.fmt;
  var view = document.getElementById('view');
  var LOW = 5;
  var TILES = {
    'ثلاجات وفريزر': 'linear-gradient(135deg,#DDE6DA,#F1ECDD)',
    'غسالات': 'linear-gradient(135deg,#DCE6EC,#EEF1F1)',
    'شاشات وتلفزيونات': 'linear-gradient(135deg,#D9D6E6,#EFEDF3)',
    'تكييفات': 'linear-gradient(135deg,#D6E8EC,#EEF4F4)',
    'بوتاجازات': 'linear-gradient(135deg,#EADFC0,#F6F0DD)'
  };
  var DEFAULT_TILE = 'linear-gradient(135deg,#F0D9CE,#F8EEE8)';
  var state = { cat: 'all', q: '', sel: null, draft: null };

  function cats(list) { return list.map(function (p) { return p.cat; }).filter(function (c, i, a) { return a.indexOf(c) === i; }); }
  function brands(list) { return list.map(function (p) { return p.brand; }).filter(function (c, i, a) { return a.indexOf(c) === i; }); }
  function short(cat) { return (cat || '؟').charAt(0); }
  function disc(p) { return p.old > p.price && p.old ? Math.round((p.old - p.price) / p.old * 100) : 0; }
  function dirty() {
    if (!state.draft) return false;
    var saved = S.products.get(state.draft.id);
    return !saved || JSON.stringify(saved) !== JSON.stringify(state.draft);
  }
  function select(id) {
    if (dirty() && !confirm('فيه تعديلات مش محفوظة على «' + state.draft.name + '». تسيبها؟')) return false;
    state.sel = id;
    var p = S.products.get(id);
    state.draft = p ? JSON.parse(JSON.stringify(p)) : null;
    return true;
  }

  function readHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (h === 'new') addNew();
    else if (h === 'low') { state.cat = 'low'; }
    else if (h && S.products.get(h)) { state.cat = 'all'; state.q = ''; select(h); state.flash = h; }
  }

  function addNew() {
    if (dirty() && !confirm('فيه تعديلات مش محفوظة. تسيبها؟')) return;
    var all = S.products.list();
    var p = { id: S.products.nextId(), name: 'منتج جديد', brand: brands(all)[0] || '', cat: cats(all)[0] || '', price: 0, old: 0, stock: 0, active: false, flash: false, cap: '', warranty: '', desc: '' };
    S.products.create(p);
    state.cat = 'all'; state.q = '';
    state.sel = p.id; state.draft = JSON.parse(JSON.stringify(p));
    history.replaceState(null, '', '#' + p.id);
    A.toast('اتضاف منتج جديد مخفي عن الموقع، كمّل بياناته واحفظ');
    setTimeout(function () { var n = document.getElementById('p-name'); if (n) { n.focus(); n.select(); } }, 50);
  }

  function render() {
    var all = S.products.list();
    if (!state.draft || !all.some(function (p) { return p.id === state.sel; })) {
      state.sel = all[0] ? all[0].id : null;
      state.draft = all[0] ? JSON.parse(JSON.stringify(all[0])) : null;
    }
    var q = state.q.trim();
    var rows = all.filter(function (p) {
      var inCat = state.cat === 'all' || (state.cat === 'low' ? p.stock <= LOW : p.cat === state.cat);
      return inCat && (!q || A.matches(p.name + ' ' + p.brand + ' ' + p.cat + ' ' + p.id, q));
    });
    var low = all.filter(function (p) { return p.stock <= LOW; }).length;
    var focusId = document.activeElement && document.activeElement.id;
    var caret = focusId && document.activeElement.selectionStart;

    var chipList = [['all', 'الكل']].concat(cats(all).map(function (c) { return [c, c]; })).concat([['low', 'قارب يخلص']]);

    view.innerHTML =
      '<div class="grid-auto" style="--min:190px">' + [
        ['إجمالي المنتجات', all.length, ''],
        ['ظاهر في الموقع', all.filter(function (p) { return p.active; }).length, 'color:var(--st-done-fg)'],
        ['مخزون قارب يخلص', low, low ? 'color:var(--danger)' : ''],
        ['في عروض الفلاش', all.filter(function (p) { return p.flash; }).length, 'color:var(--gold-ink)']
      ].map(function (s) {
        return '<div class="card" style="padding:18px 20px;border-radius:22px;display:flex;flex-direction:column;gap:6px"><span style="font-size:13.5px;color:var(--muted);font-weight:600">' + s[0] +
          '</span><span class="num" style="font-weight:800;font-size:30px;line-height:1;' + s[2] + '">' + s[1] + '</span></div>';
      }).join('') + '</div>' +

      '<div class="toolbar">' +
        '<div class="chips" role="group" aria-label="الأقسام">' + chipList.map(function (c) {
          return '<button type="button" class="chip" data-act="cat" data-c="' + esc(c[0]) + '" aria-pressed="' + (state.cat === c[0]) + '">' + esc(c[1]) + '</button>';
        }).join('') + '</div>' +
        '<label class="search">' + A.icon('search', 18, 2) + '<span class="sr-only">بحث في المنتجات</span><input id="p-q" data-act="q" value="' + esc(state.q) + '" placeholder="اسم المنتج أو الماركة" autocomplete="off"></label>' +
        '<button type="button" class="btn btn-gold" data-act="add">' + A.icon('plus', 18, 2.2) + 'منتج جديد</button>' +
      '</div>' +

      '<div class="row">' +
        '<section class="card table-card grow" aria-label="قائمة المنتجات">' +
          '<div class="table-scroll"><div style="min-width:600px;--cols:2.4fr .9fr 1.2fr .7fr">' +
            '<div class="t-head"><span>المنتج</span><span>السعر</span><span>المخزون</span><span>الظهور</span></div>' +
            (rows.length ? rows.map(function (p) {
              var isLow = p.stock <= LOW;
              return '<div class="t-row hoverable' + (state.flash === p.id ? ' flash-new' : '') + '" aria-current="' + (p.id === state.sel) + '">' +
                '<button type="button" data-act="pick" data-id="' + esc(p.id) + '" style="border:none;background:transparent;text-align:right;display:flex;align-items:center;gap:12px;padding:0;min-width:0;min-height:44px">' +
                  '<span class="tile" style="background:' + (TILES[p.cat] || DEFAULT_TILE) + '" aria-hidden="true">' + esc(short(p.cat)) + '</span>' +
                  '<span class="cell-main"><b style="line-height:1.4">' + esc(p.name) + '</b><small>' + esc(p.brand) + ' · ' + esc(p.cat) + '</small></span></button>' +
                '<span><span class="num" style="font-weight:700">' + fmt(p.price) + '</span>' + (disc(p) ? '<br><small class="num" style="color:var(--st-done-fg);font-weight:700">-' + disc(p) + '%</small>' : '') + '</span>' +
                '<span style="display:flex;flex-direction:column;gap:6px"><span class="num" style="font-weight:700;font-size:14px;' + (isLow ? 'color:var(--danger)' : '') + '">' + p.stock +
                  (isLow ? ' <span style="font-family:var(--f-body)">· قارب يخلص</span>' : '') + '</span>' +
                  '<span class="bar' + (isLow ? ' low' : '') + '" style="height:6px"><span style="width:' + Math.min(100, p.stock * 3) + '%"></span></span></span>' +
                '<button type="button" class="switch" role="switch" data-act="toggle" data-id="' + esc(p.id) + '" aria-checked="' + p.active + '" aria-label="ظهور ' + esc(p.name) + ' في الموقع"></button>' +
              '</div>';
            }).join('') : '<div class="empty">مفيش منتجات بالشكل ده.<button type="button" class="btn btn-line btn-sm" data-act="clear">امسح الفلتر</button></div>') +
          '</div></div>' +
        '</section>' +
        '<section class="card side-panel sticky-panel stack" aria-label="تعديل المنتج" id="editor">' + editor() + '</section>' +
      '</div>';

    if (focusId) {
      var el = document.getElementById(focusId);
      if (el) { el.focus(); if (caret != null && el.setSelectionRange && el.type !== 'number') try { el.setSelectionRange(caret, caret); } catch (e) {} }
    }
    state.flash = null;
  }

  function editor() {
    var e = state.draft;
    if (!e) return '<div class="empty">مفيش منتجات. ابدأ بإضافة أول منتج.<button type="button" class="btn btn-gold btn-sm" data-act="add">منتج جديد</button></div>';
    var all = S.products.list(), d = disc(e), isDirty = dirty();
    var opt = function (list, v) {
      if (list.indexOf(v) < 0) list = list.concat([v]);
      return list.map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
    };
    return previewOnly(e, d, isDirty) +
      '<div class="field"><label for="p-name">اسم المنتج</label><input id="p-name" data-act="set" data-k="name" value="' + esc(e.name) + '"></div>' +
      '<div class="fields-2">' +
        '<div class="field"><label for="p-brand">الماركة</label><select id="p-brand" data-act="set" data-k="brand">' + opt(brands(all), e.brand) + '</select></div>' +
        '<div class="field"><label for="p-cat">القسم</label><select id="p-cat" data-act="set" data-k="cat">' + opt(cats(all), e.cat) + '</select></div>' +
      '</div>' +
      '<div class="fields-3">' +
        '<div class="field"><label for="p-price">السعر</label><input id="p-price" class="num" inputmode="numeric" data-act="num" data-k="price" value="' + e.price + '"></div>' +
        '<div class="field"><label for="p-old">قبل الخصم</label><input id="p-old" class="num" inputmode="numeric" data-act="num" data-k="old" value="' + e.old + '"></div>' +
        '<div class="field"><label for="p-stock">المخزون</label><input id="p-stock" class="num" inputmode="numeric" data-act="num" data-k="stock" value="' + e.stock + '"></div>' +
      '</div>' +
      '<div class="fields-2">' +
        '<div class="field"><label for="p-cap">السعة / المقاس</label><input id="p-cap" data-act="set" data-k="cap" value="' + esc(e.cap) + '"></div>' +
        '<div class="field"><label for="p-war">الضمان</label><input id="p-war" data-act="set" data-k="warranty" value="' + esc(e.warranty) + '"></div>' +
      '</div>' +
      '<div class="field"><label for="p-desc">المميزات</label><textarea id="p-desc" rows="3" data-act="set" data-k="desc">' + esc(e.desc) + '</textarea></div>' +
      '<div class="toggle-row"><span><b>يظهر في الموقع</b><small>لو مقفول المنتج مش هيبان للزوار</small></span><button type="button" class="switch" role="switch" data-act="draftToggle" data-k="active" aria-checked="' + e.active + '" aria-label="يظهر في الموقع"></button></div>' +
      '<div class="toggle-row"><span><b>يظهر في عروض الفلاش</b><small>بيتسحب تلقائي لقسم الفلاش في الصفحة الرئيسية</small></span><button type="button" class="switch" role="switch" data-act="draftToggle" data-k="flash" aria-checked="' + e.flash + '" aria-label="يظهر في عروض الفلاش"></button></div>' +
      (e.old && e.old <= e.price ? '<p class="note" style="margin:0;color:var(--danger)">السعر قبل الخصم لازم يكون أكبر من السعر عشان الخصم يظهر.</p>' : '') +
      '<div style="display:flex;flex-wrap:wrap;gap:10px">' +
        '<button type="button" class="btn btn-gold btn-block" data-act="save"' + (isDirty ? '' : ' disabled') + '>حفظ التعديلات</button>' +
        (isDirty ? '<button type="button" class="btn btn-line" style="flex:0 1 110px" data-act="revert">تجاهل</button>' : '') +
        '<button type="button" class="btn btn-danger" style="flex:0 1 110px" data-act="del">حذف</button>' +
      '</div>';
  }

  function previewOnly(e, d, isDirty) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 class="card-title" style="font-size:27px">تعديل المنتج</h2>' +
        (isDirty ? '<span class="pill s-new">مش محفوظ</span>' : '<span class="num muted" style="font-size:12.5px">ID ' + esc(e.id) + '</span>') + '</div>' +
      '<div class="soft" id="p-preview" style="display:flex;gap:14px;align-items:center;border-radius:22px" aria-label="معاينة كارت المنتج في الموقع">' +
        '<div class="tile" style="position:relative;width:96px;height:96px;border-radius:18px;font-size:34px;background:' + (TILES[e.cat] || DEFAULT_TILE) + '" aria-hidden="true">' + esc(short(e.cat)) +
          (d ? '<span class="num" style="position:absolute;top:-8px;right:-8px;background:var(--hot);color:#fff;font-weight:800;font-size:13px;padding:3px 9px;border-radius:999px">-' + d + '%</span>' : '') + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span style="font-size:12.5px;color:var(--faint)">' + esc(e.brand) + (e.cap ? ' · ' + esc(e.cap) : '') + '</span>' +
          '<b style="font-size:15px;line-height:1.5">' + esc(e.name || 'بدون اسم') + '</b>' +
          '<span style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><span><b class="num" style="font-weight:800;font-size:21px;color:var(--heading)">' + fmt(e.price) + '</b><span class="cur" style="color:var(--ink)">ج.م</span></span>' +
          (d ? '<s class="num muted" style="font-size:13px">' + fmt(e.old) + '</s>' : '') + '</span>' +
          (!e.active ? '<span class="pill s-grey" style="margin-top:2px">مخفي عن الموقع</span>' : '') +
        '</div></div>';
  }

  // Typing only refreshes the preview + save state, so the field keeps focus without a full re-render.
  function refreshEditorBits() {
    var ed = document.getElementById('editor');
    var focusId = document.activeElement && document.activeElement.id;
    var caret = focusId && document.activeElement.selectionStart;
    ed.innerHTML = editor();
    if (focusId) { var el = document.getElementById(focusId); if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (e) {} } }
  }

  A.delegate(view, {
    cat: function (el) { state.cat = el.dataset.c; render(); },
    q: function (el) { state.q = el.value; render(); },
    clear: function () { state.cat = 'all'; state.q = ''; render(); },
    pick: function (el) {
      if (select(el.dataset.id)) {
        history.replaceState(null, '', '#' + el.dataset.id); render();
        if (window.innerWidth <= 960) document.getElementById('editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    toggle: function (el) {
      var p = S.products.get(el.dataset.id);
      if (state.draft && state.draft.id === p.id) state.draft.active = !p.active;
      S.products.update(p.id, { active: !p.active });
      A.toast(p.active ? 'اتخفى «' + p.name + '» من الموقع' : 'بقى «' + p.name + '» ظاهر في الموقع');
    },
    set: function (el) { state.draft[el.dataset.k] = el.value; refreshEditorBits(); },
    num: function (el) {
      var clean = el.value.replace(/[^\d]/g, '');
      if (clean !== el.value) el.value = clean;
      state.draft[el.dataset.k] = Number(clean) || 0; refreshEditorBits();
    },
    draftToggle: function (el) { state.draft[el.dataset.k] = !state.draft[el.dataset.k]; refreshEditorBits(); },
    save: function () {
      if (!state.draft.name.trim()) { A.toast('اكتب اسم المنتج الأول'); document.getElementById('p-name').focus(); return; }
      S.products.update(state.draft.id, state.draft);
      A.toast('اتحفظ «' + state.draft.name + '»' + (state.draft.active ? ' وبقى ظاهر بالتعديلات في الموقع' : ''));
    },
    revert: function () { state.draft = JSON.parse(JSON.stringify(S.products.get(state.sel))); render(); },
    del: function () {
      var p = S.products.get(state.sel), all = S.products.list(), i = all.findIndex(function (x) { return x.id === p.id; });
      if (!confirm('هتحذف «' + p.name + '» نهائي من المتجر. متأكد؟')) return;
      var next = all[i + 1] || all[i - 1];
      state.sel = next ? next.id : null;
      state.draft = next ? JSON.parse(JSON.stringify(next)) : null;
      S.products.remove(p.id);
      A.toast('اتحذف «' + p.name + '»', { undo: function () { S.products.create(p); state.sel = p.id; state.draft = JSON.parse(JSON.stringify(p)); render(); } });
    },
    add: addNew
  });

  window.addEventListener('hashchange', function () { readHash(); render(); });
  window.addEventListener('beforeunload', function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  S.on(function (kind) {
    if (kind !== 'products' && kind !== 'reset') return;
    if (state.draft && !dirty()) { var p = S.products.get(state.draft.id); state.draft = p ? JSON.parse(JSON.stringify(p)) : null; }
    render();
  });
  readHash();
  render();
})();
