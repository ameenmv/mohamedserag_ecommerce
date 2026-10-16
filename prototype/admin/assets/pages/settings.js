/* الإعدادات — store info, delivery & payment, team, brand, data */
(function () {
  var A = window.Admin, S = A.store, esc = A.esc, fmt = A.fmt;
  var view = document.getElementById('view');
  var TABS = [['store', 'بيانات المتجر'], ['shipping', 'الشحن والدفع'], ['team', 'الفريق والصلاحيات'], ['brand', 'الهوية واللون'], ['data', 'البيانات']];
  var STORE_FIELDS = [['name', 'اسم المتجر'], ['since', 'سنة التأسيس'], ['phone', 'التليفون'], ['whatsapp', 'واتساب'], ['email', 'الإيميل'], ['address', 'العنوان']];
  var PAYMENTS = [
    ['cod', 'الدفع عند الاستلام', 'يظهر في صفحة إتمام الشراء'],
    ['instapay', 'إنستا باي', 'تحويل مصاريف الشحن مقدماً'],
    ['vfcash', 'فودافون كاش', 'تحويل من المحفظة على رقم المتجر'],
    ['fawry', 'فوري', 'الدفع بكود من أي فرع أو تطبيق فوري'],
    ['pickup', 'الاستلام من المعرض', 'خيار بدون رسوم توصيل'],
    ['installments', 'التقسيط', 'يتفعّل بعد ربط شركة التمويل'],
    ['b2b', 'تسجيل التجّار', 'نموذج تسجيل الشركات في الموقع']
  ];
  var ROLES = ['مدير', 'محتوى', 'طلبات'];
  var PALETTES = [
    { name: 'أخضر سراج', main: '#16291E', acc: '#B5A45C' },
    { name: 'أخضر زيتي', main: '#2F3E2A', acc: '#D2C27A' },
    { name: 'أزرق ليلي', main: '#14263D', acc: '#D2C27A' },
    { name: 'فحمي', main: '#1C1F1D', acc: '#B5A45C' }
  ];

  var tab = TABS.some(function (t) { return '#' + t[0] === location.hash; }) ? location.hash.slice(1) : 'store';
  var saved = S.settings.get();
  var draft = JSON.parse(JSON.stringify(saved));
  function dirty() { return JSON.stringify(saved) !== JSON.stringify(draft); }

  function panel() {
    if (tab === 'store') {
      return '<h2 class="card-title" style="font-size:30px">بيانات المتجر</h2>' +
        '<div class="grid-auto" style="--min:240px;gap:18px">' + STORE_FIELDS.map(function (f) {
          return '<div class="field"><label for="st-' + f[0] + '">' + f[1] + '</label><input id="st-' + f[0] + '" data-act="store" data-k="' + f[0] + '" value="' + esc(draft.store[f[0]]) + '"' +
            (f[0] === 'email' ? ' type="email"' : '') + (f[0] === 'phone' || f[0] === 'whatsapp' ? ' inputmode="tel"' : '') + '></div>';
        }).join('') + '</div>' +
        '<div class="dashed stack" style="gap:10px"><span class="label" style="font-weight:700">لوجو المتجر</span>' +
          '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap"><span class="avatar" style="width:84px;height:84px;border-radius:24px;font-size:50px;padding-bottom:6px" aria-hidden="true">س</span>' +
          '<label class="btn btn-line" style="cursor:pointer">رفع لوجو جديد<input type="file" accept="image/png,image/svg+xml" class="sr-only" data-act="logo"></label>' +
          '<span class="note">PNG أو SVG بخلفية شفافة</span></div></div>';
    }
    if (tab === 'shipping') {
      return '<h2 class="card-title" style="font-size:30px">الشحن والدفع</h2>' +
        '<div><span class="label-sm">مناطق التوصيل (نفس اللي بتظهر للعميل في صفحة إتمام الشراء)</span>' +
        '<div class="table-scroll"><div style="min-width:520px;--cols:1fr 1.6fr .8fr">' +
          '<div class="t-head" style="padding-inline:0"><span>المنطقة</span><span>بتشمل</span><span>السعر (ج.م)</span></div>' +
          draft.zones.map(function (z, i) {
            return '<div class="t-row" style="padding-inline:0">' +
              '<input class="input" aria-label="اسم المنطقة ' + (i + 1) + '" data-act="zone" data-i="' + i + '" data-k="name" id="z-' + i + '-name" value="' + esc(z.name) + '">' +
              '<input class="input" aria-label="المدن في المنطقة ' + (i + 1) + '" data-act="zone" data-i="' + i + '" data-k="desc" id="z-' + i + '-desc" value="' + esc(z.desc) + '">' +
              '<input class="input num" inputmode="numeric" aria-label="سعر التوصيل للمنطقة ' + (i + 1) + '" data-act="zone" data-i="' + i + '" data-k="price" id="z-' + i + '-price" value="' + z.price + '">' +
            '</div>';
          }).join('') +
        '</div></div></div>' +
        '<div class="field" style="max-width:280px"><label for="free-over">شحن مجاني فوق (ج.م)</label><input id="free-over" class="num" inputmode="numeric" data-act="freeOver" value="' + draft.freeOver + '"></div>' +
        '<div class="dashed stack" style="gap:10px"><span class="label-sm" style="padding:0">طرق الدفع والاستلام</span>' + PAYMENTS.map(function (p) {
          return '<div class="toggle-row"><span><b>' + p[1] + '</b><small>' + p[2] + '</small></span><button type="button" class="switch" role="switch" data-act="pay" data-k="' + p[0] + '" aria-checked="' + !!draft.payments[p[0]] + '" aria-label="' + p[1] + '"></button></div>';
        }).join('') + '</div>';
    }
    if (tab === 'team') {
      return '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><h2 class="card-title" style="font-size:30px">الفريق والصلاحيات</h2>' +
          '<button type="button" class="btn btn-gold btn-sm" data-act="invite">' + A.icon('plus', 18, 2.2) + 'دعوة عضو</button></div>' +
        draft.team.map(function (m) {
          return '<div class="t-row hoverable" style="display:flex;flex-wrap:wrap;align-items:center;gap:14px">' +
            '<span class="avatar" style="width:46px;height:46px;font-size:23px" aria-hidden="true">' + esc(m.name.charAt(0)) + '</span>' +
            '<span class="cell-main" style="flex:1 1 180px"><b style="font-size:15.5px">' + esc(m.name) + '</b><small>' + esc(m.scope) + '</small></span>' +
            '<div class="seg" role="group" aria-label="صلاحية ' + esc(m.name) + '">' + ROLES.map(function (r, i) {
              return '<button type="button" data-act="role" data-id="' + m.id + '" data-r="' + i + '" aria-pressed="' + (m.role === i) + '"' + (m.id === 1 && i !== 0 ? ' disabled title="لازم يفضل فيه مدير واحد على الأقل"' : '') + '>' + r + '</button>';
            }).join('') + '</div></div>';
        }).join('');
    }
    if (tab === 'brand') {
      var p = PALETTES[draft.palette] || PALETTES[0];
      return '<h2 class="card-title" style="font-size:30px">الهوية واللون</h2>' +
        '<div class="stack" style="gap:10px"><span class="label" style="font-weight:700">اللون الأساسي للموقع</span><div class="swatches" role="group" aria-label="اللون الأساسي">' +
          PALETTES.map(function (x, i) {
            return '<button type="button" class="swatch" style="width:108px" data-act="palette" data-i="' + i + '" aria-pressed="' + (draft.palette === i) + '"><i style="background:' + x.main + ';justify-content:flex-end;align-items:flex-end;padding:6px;height:46px"><b style="width:18px;height:18px;border-radius:50%;background:' + x.acc + '"></b></i><span>' + x.name + '</span></button>';
          }).join('') + '</div></div>' +
        '<div style="background:' + p.main + ';border-radius:24px;padding:30px;display:flex;flex-wrap:wrap;gap:18px;align-items:center;justify-content:space-between">' +
          '<div style="display:flex;flex-direction:column;gap:6px"><span style="font-family:var(--f-display);font-size:36px;color:#FAF7EE;line-height:1.1">معاينة الألوان</span><span style="font-size:15px;color:#FAF7EE;opacity:.85">زي ما هتظهر الأزرار والخلفيات في الموقع</span></div>' +
          '<span style="height:50px;padding:0 28px;border-radius:999px;background:' + p.acc + ';color:#14201A;font-weight:700;font-size:16px;display:flex;align-items:center">تسوّق دلوقتي</span></div>' +
        '<p class="note" style="margin:0">اللون بيتطبق على الموقع بعد ربط الإعدادات بالباك إند.</p>';
    }
    return '<h2 class="card-title" style="font-size:30px">البيانات</h2>' +
      '<p style="margin:0;color:var(--muted);line-height:1.8">اللوحة دلوقتي بتحفظ كل حاجة في المتصفح ده بس' + (S.persistent ? '' : ' (والمتصفح مانع الحفظ، فالتعديلات هتتمسح لما تقفل الصفحة)') + '، لحد ما تتربط بالباك إند.</p>' +
      '<div class="toggle-row"><span><b>نسخة احتياطية</b><small>ملف JSON فيه الطلبات والمنتجات والعملاء والمحتوى والإعدادات</small></span><button type="button" class="btn btn-line btn-sm" data-act="backup">تنزيل نسخة احتياطية</button></div>' +
      '<div class="toggle-row"><span><b>استرجاع البيانات التجريبية</b><small>بيمسح كل تعديلاتك ويرجّع اللوحة لأول مرة</small></span><button type="button" class="btn btn-danger btn-sm" data-act="reset">استرجاع</button></div>';
  }

  function render() {
    var focusId = document.activeElement && document.activeElement.id, caret = focusId && document.activeElement.selectionStart;
    var d = dirty();
    view.innerHTML =
      '<div class="row">' +
        '<nav class="card" style="flex:0 1 250px;min-width:200px;padding:14px;display:flex;flex-direction:column;gap:4px" aria-label="أقسام الإعدادات">' +
          TABS.map(function (t) {
            return '<button type="button" class="chip" style="width:100%;border:none;justify-content:flex-start;height:50px;border-radius:16px;font-size:15.5px" data-act="tab" data-t="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>';
          }).join('') + '</nav>' +
        '<div style="flex:999 1 560px;min-width:0;display:flex;flex-direction:column;gap:18px">' +
          '<section class="card stack" style="gap:20px;padding:28px">' + panel() + '</section>' +
          (tab === 'data' ? '' :
          '<div style="display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:12px">' +
            (d ? '<span class="pill s-new">تعديلات غير محفوظة</span><button type="button" class="btn btn-line" data-act="discard">تجاهل</button>' : '') +
            '<button type="button" class="btn btn-gold" data-act="save"' + (d ? '' : ' disabled') + '>حفظ الإعدادات</button></div>') +
        '</div>' +
      '</div>';
    if (focusId) { var el = document.getElementById(focusId); if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (e) {} } }
  }

  function digits(el) { var v = el.value.replace(/[^\d]/g, ''); if (v !== el.value) el.value = v; return Number(v) || 0; }
  function refocus(sel) { var b = view.querySelector(sel); if (b) b.focus(); }

  A.delegate(view, {
    tab: function (el) { tab = el.dataset.t; history.replaceState(null, '', '#' + tab); render(); refocus('[data-act="tab"][data-t="' + tab + '"]'); },
    store: function (el) { draft.store[el.dataset.k] = el.value; render(); },
    zone: function (el) {
      var z = draft.zones[Number(el.dataset.i)];
      z[el.dataset.k] = el.dataset.k === 'price' ? digits(el) : el.value; render();
    },
    freeOver: function (el) { draft.freeOver = digits(el); render(); },
    pay: function (el) { draft.payments[el.dataset.k] = !draft.payments[el.dataset.k]; render(); refocus('[data-act="pay"][data-k="' + el.dataset.k + '"]'); },
    role: function (el) {
      draft.team = draft.team.map(function (m) { return m.id === Number(el.dataset.id) ? Object.assign({}, m, { role: Number(el.dataset.r) }) : m; });
      render(); refocus('[data-act="role"][data-id="' + el.dataset.id + '"][data-r="' + el.dataset.r + '"]');
    },
    palette: function (el) { draft.palette = Number(el.dataset.i); render(); refocus('[data-act="palette"][data-i="' + el.dataset.i + '"]'); },
    invite: function () { A.toast('اتبعت رابط دعوة للعضو الجديد'); },
    save: function () { saved = S.settings.set(draft); draft = JSON.parse(JSON.stringify(saved)); render(); A.toast('اتحفظت الإعدادات'); },
    discard: function () { draft = JSON.parse(JSON.stringify(saved)); render(); },
    backup: function () {
      var data = { exportedAt: new Date().toISOString(), orders: S.orders.list(), products: S.products.list(), traders: S.traders.list(), customers: S.customers.list(), cms: S.cms.get(), settings: S.settings.get() };
      A.download('serag-admin-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(data, null, 2), 'application/json');
      A.toast('اتنزّلت النسخة الاحتياطية');
    },
    reset: function () {
      if (!confirm('هترجع كل البيانات للبداية وتمسح تعديلاتك. متأكد؟')) return;
      S.reset(); A.toast('اترجعت البيانات التجريبية'); setTimeout(function () { location.reload(); }, 600);
    }
  });

  // File input sits inside a <label>, so listen for its change directly.
  view.addEventListener('change', function (e) {
    if (e.target.matches('input[type="file"][data-act="logo"]') && e.target.files[0]) A.toast('اتختار «' + e.target.files[0].name + '»، هيترفع لما الباك إند يتربط');
  });

  window.addEventListener('beforeunload', function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  S.on(function (kind) { if ((kind === 'settings' && !dirty()) || kind === 'reset') { saved = S.settings.get(); draft = JSON.parse(JSON.stringify(saved)); render(); } });
  render();
})();
