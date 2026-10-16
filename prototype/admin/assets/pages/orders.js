/* الطلبات — list, detail, status flow, export, invoice */
(function () {
  var A = window.Admin, S = A.store, esc = A.esc, fmt = A.fmt;
  var view = document.getElementById('view');
  var FLOW = ['new', 'prep', 'ship', 'done'];
  var NEXT = { new: 'أكّد وابدأ التجهيز', prep: 'اشحن الطلب', ship: 'تم التسليم' };
  var state = { filter: 'all', q: '', sel: null };

  function sorted() { return S.orders.list().slice().sort(function (a, b) { return b.createdAt - a.createdAt; }); }
  function visible(all) {
    return all.filter(function (o) {
      return (state.filter === 'all' || o.status === state.filter) &&
        (!state.q || A.matches(o.id + ' ' + o.customer + ' ' + o.city, state.q));
    });
  }

  function readHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (!h) return;
    if (A.STATUS[h]) { state.filter = h; state.sel = null; }
    else if (S.orders.get(h)) { state.sel = h; state.filter = 'all'; state.q = ''; state.flash = h; }
  }

  function render() {
    var all = sorted(), rows = visible(all);
    if (!state.sel || !all.some(function (o) { return o.id === state.sel; })) state.sel = (rows[0] || all[0] || {}).id || null;
    var cur = S.orders.get(state.sel);
    var searchHadFocus = document.activeElement && document.activeElement.id === 'o-q';
    var caret = searchHadFocus ? document.activeElement.selectionStart : 0;

    var filters = [['all', 'الكل']].concat(Object.keys(A.STATUS).map(function (k) { return [k, A.STATUS[k].label]; }));
    var count = function (k) { return k === 'all' ? all.length : all.filter(function (o) { return o.status === k; }).length; };

    view.innerHTML =
      '<div class="toolbar">' +
        '<div class="chips" role="group" aria-label="فلترة حسب الحالة">' + filters.map(function (f) {
          return '<button type="button" class="chip" data-act="filter" data-f="' + f[0] + '" aria-pressed="' + (state.filter === f[0]) + '">' + f[1] + '<span class="n">' + count(f[0]) + '</span></button>';
        }).join('') + '</div>' +
        '<label class="search">' + A.icon('search', 18, 2) + '<span class="sr-only">بحث في الطلبات</span><input id="o-q" data-act="q" value="' + esc(state.q) + '" placeholder="رقم الطلب أو اسم العميل" autocomplete="off"></label>' +
        '<button type="button" class="btn btn-line" data-act="export">تصدير Excel</button>' +
      '</div>' +
      '<div class="row">' +
        '<section class="card table-card grow" aria-label="قائمة الطلبات">' +
          '<div class="table-scroll"><div style="min-width:580px;--cols:1.2fr 1.5fr .9fr 1fr 1fr">' +
            '<div class="t-head"><span>رقم الطلب</span><span>العميل</span><span>القناة</span><span>الإجمالي</span><span>الحالة</span></div>' +
            (rows.length ? rows.map(function (o) {
              var st = A.STATUS[o.status];
              return '<button type="button" class="t-row' + (state.flash === o.id ? ' flash-new' : '') + '" data-act="pick" data-id="' + esc(o.id) + '" aria-current="' + (o.id === state.sel) + '">' +
                '<span class="num" style="font-weight:700;font-size:14.5px">' + esc(o.id) + '</span>' +
                '<span class="cell-main"><b>' + esc(o.customer) + '</b><small>' + esc(A.ago(o.createdAt)) + '</small></span>' +
                '<span style="font-size:13.5px;color:var(--ink-2)">' + (o.source === 'storefront' ? '<span class="live-tag">من الموقع</span>' : esc(o.channel)) + '</span>' +
                '<span><span class="num" style="font-weight:700">' + fmt(S.orders.total(o)) + '</span><span class="cur">ج.م</span></span>' +
                '<span class="pill ' + st.cls + '">' + st.label + '</span></button>';
            }).join('') : '<div class="empty">مفيش طلبات بالشكل ده.<button type="button" class="btn btn-line btn-sm" data-act="clear">امسح الفلتر</button></div>') +
          '</div></div>' +
        '</section>' +
        '<section class="card side-panel sticky-panel stack" aria-label="تفاصيل الطلب" id="detail">' + (cur ? detail(cur) : '<div class="empty">اختار طلب من القائمة.</div>') + '</section>' +
      '</div>';

    if (searchHadFocus) { var q = document.getElementById('o-q'); q.focus(); q.setSelectionRange(caret, caret); }
    state.flash = null;
  }

  function detail(o) {
    var st = A.STATUS[o.status], idx = FLOW.indexOf(o.status);
    var when = {};
    (o.history || []).forEach(function (h) { when[h.status] = h.at; });
    return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">' +
        '<div style="display:flex;flex-direction:column;gap:4px"><span class="detail-id">' + esc(o.id) + '</span><span class="card-sub">' + esc(A.ago(o.createdAt)) + ' · ' + esc(o.channel) + '</span></div>' +
        '<span class="pill ' + st.cls + '">' + st.label + '</span></div>' +
      (o.source === 'storefront' ? '<span class="live-tag" style="align-self:flex-start">جاي من صفحة إتمام الشراء في الموقع</span>' : '') +
      '<div class="soft" style="display:flex;flex-direction:column;gap:2px"><b style="font-size:16px">' + esc(o.customer) + '</b>' +
        '<span style="font-size:14px;color:var(--muted)">' + esc(o.city) + ' · ' + esc(o.phone) + '</span>' +
        '<span style="font-size:14px;color:var(--muted)">' + esc(A.PAY[o.pay] || o.pay) + '</span></div>' +
      '<div><span class="label-sm">المنتجات</span>' +
        o.items.map(function (i) {
          return '<div class="line-item"><span>' + esc(i.name) + ' <span class="muted">× ' + i.qty + '</span></span><span class="num" style="font-weight:700">' + fmt(i.price * i.qty) + '</span></div>';
        }).join('') +
        '<div class="line-item" style="color:var(--muted)"><span>التوصيل</span><span>' + (o.ship ? '<span class="num" style="font-weight:700">' + fmt(o.ship) + '</span><span class="cur">ج.م</span>' : 'مجاني') + '</span></div>' +
        '<div class="total-row"><b style="font-size:16px">الإجمالي</b><span><b class="num">' + fmt(S.orders.total(o)) + '</b><span class="cur">ج.م</span></span></div></div>' +
      '<div><span class="label-sm">مسار الطلب</span><div class="timeline">' +
        (o.status === 'cancel'
          ? '<div class="tl-step"><div class="tl-rail"><span class="tl-dot" style="background:var(--danger);border-color:var(--danger)"></span></div><div class="tl-text"><b style="color:var(--danger);font-weight:700">الطلب اتلغى</b><small>' + esc(A.ago(when.cancel || o.createdAt)) + '</small></div></div>'
          : FLOW.map(function (k, i) {
            var done = i <= idx;
            return '<div class="tl-step' + (done ? ' done' : '') + (i < idx ? ' before' : '') + (i === idx ? ' now' : '') + '"><div class="tl-rail"><span class="tl-dot">' +
              (done ? A.icon('check', 12, 4) : '') + '</span><span class="tl-line"></span></div><div class="tl-text"><b>' + A.STATUS[k].label + '</b>' +
              (done && when[k] ? '<small>' + esc(A.ago(when[k])) + '</small>' : '') + '</div></div>';
          }).join('')) +
      '</div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px">' +
        (idx >= 0 && idx < 3 ? '<button type="button" class="btn btn-gold btn-block" data-act="advance">' + NEXT[o.status] + '</button>' : '') +
        (o.status === 'new' || o.status === 'prep' ? '<button type="button" class="btn btn-danger" style="flex:1 1 120px" data-act="cancel">إلغاء الطلب</button>' : '') +
        '<button type="button" class="btn btn-line" style="flex:1 1 120px" data-act="print">' + A.icon('print', 18) + 'طباعة الفاتورة</button>' +
      '</div>';
  }

  function setStatus(o, next, msg) {
    var prev = { status: o.status, history: o.history };
    S.orders.setStatus(o.id, next);
    A.toast(msg, { undo: function () { S.orders.update(o.id, prev); A.toast('اترجع الطلب ' + o.id + ' لـ ' + A.STATUS[prev.status].label); } });
  }

  function printInvoice(o) {
    var store = S.settings.get().store;
    var inv = document.createElement('div');
    inv.className = 'invoice';
    inv.innerHTML = '<h2>' + esc(store.name) + '</h2><div>فاتورة رقم <b>' + esc(o.id) + '</b> · ' + esc(new Date(o.createdAt).toLocaleDateString('ar-EG-u-nu-latn')) + '</div>' +
      '<div>العميل: ' + esc(o.customer) + ' · ' + esc(o.city) + ' · ' + esc(o.phone) + '</div><div>طريقة الدفع: ' + esc(A.PAY[o.pay] || o.pay) + '</div>' +
      '<table><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>' +
      o.items.map(function (i) { return '<tr><td>' + esc(i.name) + '</td><td>' + i.qty + '</td><td>' + fmt(i.price) + '</td><td>' + fmt(i.price * i.qty) + '</td></tr>'; }).join('') +
      '<tr><td colspan="3">التوصيل</td><td>' + fmt(o.ship) + '</td></tr><tr><td colspan="3"><b>الإجمالي</b></td><td><b>' + fmt(S.orders.total(o)) + ' ج.م</b></td></tr></tbody></table>' +
      '<p>' + esc(store.phone) + ' · ' + esc(store.address) + '</p>';
    document.body.appendChild(inv);
    document.body.classList.add('printing-invoice');
    var done = function () { document.body.classList.remove('printing-invoice'); inv.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1000);
  }

  A.delegate(view, {
    filter: function (el) { state.filter = el.dataset.f; state.sel = null; history.replaceState(null, '', state.filter === 'all' ? location.pathname : '#' + state.filter); render(); },
    q: function (el) { state.q = el.value; render(); },
    clear: function () { state.filter = 'all'; state.q = ''; render(); },
    pick: function (el) {
      state.sel = el.dataset.id; history.replaceState(null, '', '#' + state.sel); render();
      if (window.innerWidth <= 960) document.getElementById('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    advance: function () {
      var o = S.orders.get(state.sel), next = FLOW[FLOW.indexOf(o.status) + 1];
      setStatus(o, next, 'الطلب ' + o.id + ' بقى: ' + A.STATUS[next].label);
    },
    cancel: function () { var o = S.orders.get(state.sel); setStatus(o, 'cancel', 'اتلغى الطلب ' + o.id); },
    print: function () { printInvoice(S.orders.get(state.sel)); },
    export: function () {
      var rows = visible(sorted());
      var data = [['رقم الطلب', 'التاريخ', 'العميل', 'المدينة', 'القناة', 'الدفع', 'الحالة', 'المنتجات', 'التوصيل', 'الإجمالي']].concat(rows.map(function (o) {
        return [o.id, new Date(o.createdAt).toISOString().slice(0, 16).replace('T', ' '), o.customer, o.city, o.channel, A.PAY[o.pay] || o.pay, A.STATUS[o.status].label,
          o.items.map(function (i) { return i.name + ' × ' + i.qty; }).join(' + '), o.ship, S.orders.total(o)];
      }));
      A.download('serag-orders-' + new Date().toISOString().slice(0, 10) + '.csv', A.csv(data), 'text/csv;charset=utf-8');
      A.toast('اتنزّل ملف فيه ' + rows.length + ' طلب');
    }
  });

  window.addEventListener('hashchange', function () { readHash(); render(); });
  S.on(function (kind, d) {
    if (kind === 'orders' || kind === 'reset') {
      if (d && d.op === 'incoming') { state.flash = d.id; A.toast('وصل طلب جديد من الموقع: ' + d.id); }
      render();
    }
  });
  if (S.incoming) state.flash = S.incoming.id;
  readHash();
  render();
})();
