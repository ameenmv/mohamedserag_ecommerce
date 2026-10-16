/* العملاء والتجّار — B2B approvals + customer list */
(function () {
  var A = window.Admin, S = A.store, esc = A.esc, fmt = A.fmt;
  var view = document.getElementById('view');
  var LIMITS = [50000, 100000, 250000];
  var TRADER = {
    pending: { label: 'بانتظار المراجعة', cls: 's-new' },
    approved: { label: 'معتمد', cls: 's-done' },
    rejected: { label: 'مرفوض', cls: 's-bad' }
  };
  var TIER = { 'فضي': 's-grey', 'ذهبي': 's-new', 'بلاتيني': 's-prep' };
  var state = { tab: 'traders', q: '', mark: null, scrollMark: false, focus: null, sort: null, dir: 'desc' };

  function readHash() {
    var h = '';
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { h = location.hash.slice(1); }
    state.mark = null;
    state.scrollMark = false;
    if (!h) { state.tab = 'traders'; return; }
    if (S.traders.get(h)) { state.tab = 'traders'; state.q = ''; state.mark = h; state.scrollMark = true; }
    else if (S.customers.get(h)) { state.tab = 'customers'; state.q = ''; state.mark = h; state.scrollMark = true; }
    else if (h === 'traders' || h === 'customers') state.tab = h;
  }

  function tierPill(tier) {
    var cls = TIER[tier];
    return cls
      ? '<span class="pill ' + cls + '">' + esc(tier) + '</span>'
      : '<span class="pill" style="background:var(--tint);color:var(--muted)">' + esc(tier) + '</span>';
  }

  function sortHead(key, label) {
    var active = state.sort === key;
    var ariaSort = active ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none';
    var arrow = active ? (state.dir === 'asc' ? '↑' : '↓') : '↕';
    return '<span role="columnheader" aria-sort="' + ariaSort + '">' +
      '<button type="button" id="sort-' + key + '" data-act="sort" data-s="' + key + '" ' +
        'aria-label="ترتيب حسب ' + label + '" ' +
        'style="border:none;background:transparent;padding:6px 8px;margin:-10px -8px;border-radius:8px;font-weight:700;color:' + (active ? 'var(--heading)' : 'inherit') + ';display:inline-flex;align-items:center;gap:4px;min-height:44px">' +
        label + ' <span class="num" aria-hidden="true" style="opacity:' + (active ? '1' : '.45') + '">' + arrow + '</span>' +
      '</button></span>';
  }

  function traderCard(t) {
    var id = esc(t.id);
    var st = TRADER[t.status] || TRADER.pending;
    var marked = state.mark === t.id;
    var body = t.status === 'pending'
      ? '<div class="stack" style="gap:8px"><span style="font-size:13.5px;font-weight:700;color:var(--muted)" id="lim-' + id + '">الحد الائتماني</span>' +
          '<div class="chips" role="group" aria-labelledby="lim-' + id + '">' + LIMITS.map(function (l) {
            return '<button type="button" class="chip num" id="chip-' + id + '-' + l + '" style="min-height:44px" data-act="limit" data-id="' + id + '" data-l="' + l + '" aria-pressed="' + (t.limit === l) + '" aria-label="' + fmt(l) + ' ج.م">' + fmt(l) + '</button>';
          }).join('') + '</div></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px">' +
          '<button type="button" class="btn btn-gold" id="approve-' + id + '" style="flex:1 1 160px" data-act="approve" data-id="' + id + '" aria-label="اعتماد حساب ' + esc(t.company) + '">اعتماد الحساب</button>' +
          '<button type="button" class="btn btn-danger" id="reject-' + id + '" style="flex:0 0 100px" data-act="reject" data-id="' + id + '" aria-label="رفض طلب ' + esc(t.company) + '">رفض</button></div>'
      : '<div class="note dashed" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;font-size:14px;color:var(--muted)">' +
          '<span>' + (t.status === 'approved'
            ? 'تم اعتماد الحساب بحد ائتماني <span class="num">' + fmt(t.limit) + '</span> ج.م وإرسال بيانات الدخول للتاجر.'
            : 'تم رفض الطلب وإبلاغ المتقدم.') + '</span>' +
          '<button type="button" class="reset-btn" id="reopen-' + id + '" style="min-height:44px;padding:0 14px;font-size:13px" data-act="reopen" data-id="' + id + '" aria-label="إرجاع طلب ' + esc(t.company) + ' للمراجعة">رجّعه للمراجعة</button></div>';
    return '<article class="card stack' + (marked ? ' flash-new' : '') + '" id="card-' + id + '" tabindex="-1"' +
      (marked ? ' aria-current="true" style="animation:glow 2.4s ease 2;border-color:var(--gold)"' : '') +
      ' aria-labelledby="tn-' + id + '">' +
      '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:10px">' +
        '<div style="display:flex;gap:14px;align-items:center;min-width:0;flex:1 1 200px"><span class="avatar" style="width:56px;height:56px;border-radius:18px;font-size:28px" aria-hidden="true">' + esc(t.company.charAt(0)) + '</span>' +
          '<span class="cell-main"><b id="tn-' + id + '" style="font-size:17px;line-height:1.4">' + esc(t.company) + '</b><small style="font-size:13.5px">' + esc(t.type) + ' · ' + esc(t.city) + '</small></span></div>' +
        '<span class="pill ' + st.cls + '">' + esc(st.label) + '</span></div>' +
      '<div class="fields-2" style="font-size:13.5px">' +
        '<div class="soft" style="padding:12px 14px;border-radius:14px"><span class="muted">السجل التجاري</span><br><b class="num">' + esc(t.cr) + '</b></div>' +
        '<div class="soft" style="padding:12px 14px;border-radius:14px"><span class="muted">حجم الشراء المتوقع</span><br><b>' + esc(t.volume) + '</b></div></div>' +
      body + '</article>';
  }

  function render() {
    var traders = S.traders.list(), customers = S.customers.list();
    var pending = traders.filter(function (t) { return t.status === 'pending'; }).length;
    var q = state.q.trim();
    var activeEl = document.activeElement;
    var focusId = state.focus || (activeEl && view.contains(activeEl) && activeEl.id);
    var caret = !state.focus && activeEl && activeEl.id === 'c-q' ? activeEl.selectionStart : null;
    state.focus = null;

    var isT = state.tab === 'traders';
    var tRows = traders.filter(function (t) { return !q || A.matches(t.company + ' ' + t.city + ' ' + t.type + ' ' + t.cr, q); })
      .sort(function (a, b) { return (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1); });
    var cRows = customers.filter(function (c) { return !q || A.matches(c.name + ' ' + c.city + ' ' + c.type + ' ' + c.tier, q); });
    if (state.sort) {
      var k = state.sort, mul = state.dir === 'asc' ? 1 : -1;
      cRows = cRows.slice().sort(function (a, b) { return ((a[k] || 0) - (b[k] || 0)) * mul; });
    }

    var emptyHtml = '<div class="empty">مفيش نتائج.' +
      (q ? '<button type="button" class="btn btn-line btn-sm" data-act="clear">امسح البحث</button>' : '') +
      '</div>';

    view.innerHTML =
      '<div class="toolbar" style="justify-content:space-between">' +
        '<div class="seg on-surface" role="group" aria-label="القسم">' +
          '<button type="button" id="tab-traders" style="min-height:44px" data-act="tab" data-t="traders" aria-pressed="' + isT + '">طلبات التجّار' +
            (pending ? ' <span class="badge num" style="margin-inline-start:6px" aria-label="' + fmt(pending) + ' بانتظار المراجعة">' + fmt(pending) + '</span>' : '') + '</button>' +
          '<button type="button" id="tab-customers" style="min-height:44px" data-act="tab" data-t="customers" aria-pressed="' + !isT + '">كل العملاء</button></div>' +
        '<label class="search">' + A.icon('search', 18, 2) + '<span class="sr-only">ابحث بالاسم أو اسم الشركة أو المدينة</span>' +
          '<input id="c-q" type="search" data-act="q" value="' + esc(state.q) + '" placeholder="ابحث بالاسم أو اسم الشركة" autocomplete="off"></label>' +
      '</div>' +
      (isT
        ? (tRows.length ? '<div class="grid-auto" style="--min:min(330px, 100%);gap:18px">' + tRows.map(traderCard).join('') + '</div>' : '<div class="card">' + emptyHtml + '</div>')
        : '<section class="card table-card" aria-label="كل العملاء"><div class="table-scroll"><div role="table" aria-label="جدول العملاء" style="min-width:640px;--cols:2fr 1fr 1fr 1.2fr 1fr">' +
            '<div class="t-head" role="row">' +
              '<span role="columnheader">العميل</span>' +
              '<span role="columnheader">النوع</span>' +
              sortHead('orders', 'الطلبات') +
              sortHead('spent', 'إجمالي المشتريات') +
              '<span role="columnheader">الولاء</span>' +
            '</div>' +
            (cRows.length ? cRows.map(function (c) {
              var cid = esc(c.id), marked = state.mark === c.id;
              return '<div class="t-row hoverable' + (marked ? ' flash-new' : '') + '" role="row"' + (marked ? ' aria-current="true"' : '') + ' id="row-' + cid + '" tabindex="-1">' +
                '<span role="cell" style="display:flex;align-items:center;gap:12px;min-width:0"><span class="avatar" style="width:42px;height:42px;background:var(--tint);color:var(--heading)" aria-hidden="true">' + esc(c.name.charAt(0)) + '</span>' +
                  '<span class="cell-main"><b>' + esc(c.name) + '</b><small>' + esc(c.city) + '</small></span></span>' +
                '<span role="cell" style="font-size:13.5px;color:var(--ink-2)">' + esc(c.type) + '</span>' +
                '<span role="cell" class="num" style="font-weight:700">' + fmt(c.orders) + '</span>' +
                '<span role="cell"><span class="num" style="font-weight:700">' + fmt(c.spent) + '</span><span class="cur">ج.م</span></span>' +
                '<span role="cell">' + tierPill(c.tier) + '</span></div>';
            }).join('') : emptyHtml) +
          '</div></div></section>');

    if (focusId) {
      var el = document.getElementById(focusId);
      if (el) {
        el.focus();
        if (caret != null) { try { el.setSelectionRange(caret, caret); } catch (e) {} }
      }
    }
    if (state.mark && state.scrollMark) {
      state.scrollMark = false;
      var target = document.getElementById('card-' + state.mark) || document.getElementById('row-' + state.mark);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!focusId) target.focus({ preventScroll: true });
      }
    }
  }

  function decide(id, status) {
    var t = S.traders.get(id);
    if (!t) return;
    var prev = t.status;
    state.focus = (status === 'pending' ? 'approve-' : 'reopen-') + id;
    S.traders.update(id, { status: status });
    var msg = status === 'approved'
      ? 'اتعتمد حساب ' + t.company
      : status === 'rejected'
        ? 'اترفض طلب ' + t.company
        : 'اترجع طلب ' + t.company + ' للمراجعة';
    A.toast(msg, {
      undo: function () {
        state.focus = (prev === 'pending' ? 'approve-' : 'reopen-') + id;
        S.traders.update(id, { status: prev });
      }
    });
  }

  A.delegate(view, {
    tab: function (el) { state.tab = el.dataset.t; state.mark = null; history.replaceState(null, '', '#' + state.tab); render(); },
    q: function (el) { state.q = el.value; state.mark = null; render(); },
    clear: function () { state.q = ''; state.focus = 'c-q'; render(); },
    sort: function (el) {
      var k = el.dataset.s;
      if (state.sort === k) {
        if (state.dir === 'desc') state.dir = 'asc';
        else { state.sort = null; state.dir = 'desc'; }
      } else {
        state.sort = k;
        state.dir = 'desc';
      }
      render();
    },
    limit: function (el) {
      S.traders.update(el.dataset.id, { limit: Number(el.dataset.l) });
    },
    approve: function (el) { decide(el.dataset.id, 'approved'); },
    reject: function (el) { decide(el.dataset.id, 'rejected'); },
    reopen: function (el) { decide(el.dataset.id, 'pending'); }
  });

  window.addEventListener('hashchange', function () { readHash(); render(); });
  S.on(function (kind) { if (kind === 'traders' || kind === 'customers' || kind === 'reset') render(); });
  readHash();
  render();
})();

