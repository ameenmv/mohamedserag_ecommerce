/* نظرة عامة — morning overview */
(function () {
  var A = window.Admin, S = A.store, esc = A.esc, fmt = A.fmt;
  var view = document.getElementById('view');
  var state = { range: 30 };

  // Demo revenue (thousands EGP per point) until the reports API exists.
  function series(range) {
    var pts = range === 90 ? 13 : range, out = [];
    for (var i = 0; i < pts; i++) {
      var t = i / (pts - 1);
      out.push(Math.round(34 + t * 22 + Math.sin(i * 0.9) * 7 + (i % 4) * 2.5));
    }
    return out;
  }
  var X_LABELS = {
    7: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
    30: ['قبل 30 يوم', 'قبل 22', 'قبل 15', 'قبل 7', 'النهارده'],
    90: ['يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر']
  };
  function pointLabel(range, i, n) {
    if (range === 7) return X_LABELS[7][i];
    if (range === 90) return 'الأسبوع ' + (i + 1);
    var back = n - 1 - i;
    return back === 0 ? 'النهارده' : 'قبل ' + back + ' يوم';
  }

  // RTL charts: oldest point on the right, newest on the left.
  function path(vals, w, h, pad, top) {
    var mx = top || Math.max.apply(null, vals), mn = top ? 0 : Math.min.apply(null, vals);
    return vals.map(function (v, i) {
      var x = w - pad - i / (vals.length - 1) * (w - pad * 2);
      var y = h - pad - (v - mn) / (mx - mn || 1) * (h - pad * 2);
      return [x, y];
    });
  }
  function d(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }

  function kpi(label, value, unit, delta, up, vals) {
    var pts = path(vals, 200, 46, 4);
    return '<div class="kpi"><div class="kpi-top"><span class="kpi-label">' + label + '</span><span class="kpi-delta ' + (up ? 'delta-up' : 'delta-down') + '">' + delta + '</span></div>' +
      '<div class="kpi-value">' + value + '<small>' + unit + '</small></div>' +
      '<svg viewBox="0 0 200 46" preserveAspectRatio="none" aria-hidden="true"><path d="' + d(pts) + '" fill="none" stroke="' + (up ? 'var(--green)' : 'var(--hot)') +
      '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg></div>';
  }

  function render() {
    var orders = S.orders.list().slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    var products = S.products.list();
    var traders = S.traders.list();
    var newCount = orders.filter(function (o) { return o.status === 'new'; }).length;
    var pending = traders.filter(function (t) { return t.status === 'pending'; }).length;
    var low = products.filter(function (p) { return p.stock <= 5; }).length;

    var R = state.range, vals = series(R);
    var sum = vals.reduce(function (a, b) { return a + b; }, 0) * (R === 90 ? 7 : 1) * 1000;
    var count = Math.round(sum / 8200);
    var mx = Math.max.apply(null, vals), top = Math.ceil(mx / 20) * 20;
    var W = 720, H = 258;
    var pts = path(vals, W, H, 12, top);
    var line = d(pts);
    var area = line + ' L12,' + H + ' L' + (W - 12) + ',' + H + ' Z';
    var last = pts[pts.length - 1];

    // Channel split from real orders (cancelled excluded)
    var ch = { 'أفراد': 0, 'تجّار': 0, 'جهاز عروسة': 0 }, chTotal = 0;
    orders.forEach(function (o) {
      if (o.status === 'cancel') return;
      var t = S.orders.total(o); ch[o.channel] = (ch[o.channel] || 0) + t; chTotal += t;
    });
    var CH = [
      { k: 'أفراد', label: 'أفراد (B2C)', color: 'var(--green)' },
      { k: 'تجّار', label: 'شركات وتجّار (B2B)', color: 'var(--gold)' },
      { k: 'جهاز عروسة', label: 'باقات العروسة', color: '#D9CFA5' }
    ];
    var C = 2 * Math.PI * 44, off = 0;
    var arcs = CH.map(function (c) {
      var share = chTotal ? ch[c.k] / chTotal : 0, len = share * C;
      var s = '<circle cx="60" cy="60" r="44" fill="none" stroke="' + c.color + '" stroke-width="16" stroke-dasharray="' + len.toFixed(1) + ' ' + C.toFixed(1) +
        '" stroke-dashoffset="' + (-off).toFixed(1) + '" transform="rotate(-90 60 60)"/>';
      off += len; c.pct = Math.round(share * 100);
      return s;
    }).join('');

    // Best sellers from real order lines
    var sold = {};
    orders.forEach(function (o) { if (o.status !== 'cancel') o.items.forEach(function (i) { sold[i.name] = (sold[i.name] || 0) + i.qty; }); });
    var best = Object.keys(sold).map(function (k) { return { name: k, n: sold[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
    var bestMax = best.length ? best[0].n : 1;

    var today = new Date().toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var lines = [];
    if (pending) lines.push('<a href="customers.html">' + pending + ' طلبات تسجيل تجّار</a> محتاجة مراجعة');
    if (low) lines.push('<a href="products.html#low">' + low + ' منتجات</a> المخزون بتاعها قارب يخلص');

    view.innerHTML =
      '<section class="hero" aria-labelledby="hero-h">' +
        '<span class="hero-year" aria-hidden="true">1972</span>' +
        '<div class="hero-text"><span class="hero-date">' + esc(today) + '</span>' +
          '<h2 id="hero-h">' + (newCount ? 'النهارده عندك <span class="gold">' + newCount + ' طلب جديد</span> مستنيين تأكيدك' : 'مفيش طلبات مستنية تأكيد. يوم هادي') + '</h2>' +
          (lines.length ? '<p>و' + lines.join('، و') + '.</p>' : '') +
        '</div>' +
        '<div class="actions"><a class="btn btn-gold" href="orders.html#new">راجع الطلبات</a><a class="btn btn-line" href="cms.html">عدّل الموقع</a></div>' +
      '</section>' +

      '<div class="grid-auto" style="--min:230px">' +
        kpi('إيرادات الفترة', fmt(sum), 'ج.م', '+12.4%', true, vals) +
        kpi('عدد الطلبات', fmt(count), 'طلب', '+8.1%', true, vals.map(function (v, i) { return v + (i % 3) * 4; })) +
        kpi('متوسط قيمة الطلب', '8,200', 'ج.م', '+3.2%', true, vals.map(function (v, i) { return 40 + Math.sin(i) * 6 + i * .4; })) +
        kpi('عملاء جدد', fmt(Math.round(count * 0.34)), 'عميل', '-2.6%', false, vals.map(function (v, i) { return 60 - i * .6 + Math.cos(i * 1.3) * 5; })) +
      '</div>' +

      '<div class="row" style="align-items:stretch">' +
        '<section class="card grow" aria-labelledby="rev-h">' +
          '<div class="card-head"><div><h2 class="card-title" id="rev-h">الإيرادات</h2><span class="card-sub">إجمالي <span class="num">' + fmt(sum) + '</span> ج.م · أعلى يوم <span class="num">' + mx + '</span> ألف</span></div>' +
            '<div class="seg" role="group" aria-label="الفترة">' + [7, 30, 90].map(function (r) {
              return '<button type="button" data-act="range" data-r="' + r + '" aria-pressed="' + (r === R) + '">' + (r === 7 ? '7 أيام' : r + (r === 30 ? ' يوم' : ' يوم')) + '</button>';
            }).join('') + '</div></div>' +
          '<div class="chart-wrap"><div class="chart-y"><span>' + top + 'k</span><span>' + Math.round(top * 2 / 3) + 'k</span><span>' + Math.round(top / 3) + 'k</span><span>0</span></div>' +
            '<div class="chart-box" id="chart-box">' +
              '<svg viewBox="0 0 720 260" role="img" aria-label="رسم الإيرادات لآخر ' + R + ' يوم، أعلى قيمة ' + mx + ' ألف جنيه">' +
                '<defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B5A45C" stop-opacity=".45"/><stop offset="1" stop-color="#B5A45C" stop-opacity="0"/></linearGradient></defs>' +
                [2, 88, 174].map(function (y) { return '<line x1="0" y1="' + y + '" x2="720" y2="' + y + '" stroke="var(--line-3)"/>'; }).join('') +
                '<line x1="0" y1="258" x2="720" y2="258" stroke="var(--line-2)"/>' +
                '<path d="' + area + '" fill="url(#rev)"/>' +
                '<path d="' + line + '" fill="none" stroke="var(--heading)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<line id="cross" x1="0" x2="0" y1="0" y2="258" stroke="var(--gold)" stroke-dasharray="4 4" style="display:none"/>' +
                '<circle id="cdot" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="7" fill="#B5A45C" stroke="var(--surface)" stroke-width="3"/>' +
                '<rect id="hit" x="0" y="0" width="720" height="260" fill="transparent"/>' +
              '</svg>' +
              '<div class="chart-tip" id="tip" aria-hidden="true"></div>' +
              '<div class="chart-x">' + X_LABELS[R].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
            '</div></div>' +
        '</section>' +

        '<section class="card side-panel stack" aria-labelledby="ch-h" style="flex:1 1 300px">' +
          '<h2 class="card-title" id="ch-h">مبيعات حسب القناة</h2>' +
          '<div class="donut"><svg viewBox="0 0 120 120" width="190" height="190" role="img" aria-label="توزيع المبيعات حسب القناة">' +
            '<circle cx="60" cy="60" r="44" fill="none" stroke="var(--tint)" stroke-width="16"/>' + arcs + '</svg>' +
            '<div class="donut-center"><b class="num">' + fmt(Math.round(chTotal / 1000)) + 'k</b><small>ج.م من الطلبات</small></div></div>' +
          '<div class="legend">' + CH.map(function (c) {
            return '<div><i style="background:' + c.color + '"></i><span>' + c.label + '</span><b>' + c.pct + '%</b></div>';
          }).join('') + '</div>' +
        '</section>' +
      '</div>' +

      '<div class="row">' +
        '<section class="card table-card grow" aria-labelledby="rec-h">' +
          '<div class="card-head" style="padding:12px 12px 0"><h2 class="card-title" id="rec-h">آخر الطلبات</h2><a class="btn btn-line btn-sm" href="orders.html">كل الطلبات</a></div>' +
          '<div class="table-scroll"><div style="min-width:520px;--cols:1.1fr 1.4fr 1fr 1fr">' +
            orders.slice(0, 5).map(function (o) {
              var st = A.STATUS[o.status];
              return '<a class="t-row" href="orders.html#' + esc(o.id) + '">' +
                '<span class="num" style="font-weight:700">' + esc(o.id) + '</span>' +
                '<span class="cell-main"><b>' + esc(o.customer) + '</b><small>' + esc(A.ago(o.createdAt)) + (o.source === 'storefront' ? ' · <span class="live-tag">من الموقع</span>' : '') + '</small></span>' +
                '<span><span class="num" style="font-weight:700">' + fmt(S.orders.total(o)) + '</span><span class="cur">ج.م</span></span>' +
                '<span class="pill ' + st.cls + '">' + st.label + '</span></a>';
            }).join('') +
          '</div></div>' +
        '</section>' +

        '<section class="card side-panel stack" aria-labelledby="best-h" style="flex:1 1 320px">' +
          '<h2 class="card-title" id="best-h">الأكثر مبيعاً</h2>' +
          (best.length ? best.map(function (b) {
            return '<div style="display:flex;flex-direction:column;gap:7px"><div style="display:flex;justify-content:space-between;gap:10px;font-size:14.5px;font-weight:600"><span>' + esc(b.name) +
              '</span><span class="num" style="font-weight:700">' + b.n + '</span></div><div class="bar gold"><span style="width:' + Math.round(b.n / bestMax * 100) + '%"></span></div></div>';
          }).join('') : '<div class="empty">لسه مفيش مبيعات.</div>') +
          '<p class="note dashed" style="margin:0">الإيرادات والمؤشرات أرقام تجريبية لحد ما يتربط التقارير بالباك إند. القنوات والأكثر مبيعاً محسوبين من الطلبات الفعلية في اللوحة.</p>' +
        '</section>' +
      '</div>';

    bindChart(vals, pts, R);
  }

  function bindChart(vals, pts, R) {
    var box = document.getElementById('chart-box'), svg = box.querySelector('svg'), tip = document.getElementById('tip');
    var cross = document.getElementById('cross'), dot = document.getElementById('cdot');
    function show(clientX) {
      var r = svg.getBoundingClientRect();
      var x = (clientX - r.left) / r.width * 720;
      var k = 0, best = Infinity;
      pts.forEach(function (p, i) { var dd = Math.abs(p[0] - x); if (dd < best) { best = dd; k = i; } });
      var p = pts[k];
      cross.setAttribute('x1', p[0]); cross.setAttribute('x2', p[0]); cross.style.display = '';
      dot.setAttribute('cx', p[0]); dot.setAttribute('cy', p[1]);
      tip.innerHTML = esc(pointLabel(R, k, vals.length)) + ' · <b>' + vals[k] + 'k</b> ج.م';
      tip.style.display = 'block';
      tip.style.right = (100 - p[0] / 720 * 100) + '%';
      tip.style.top = (p[1] / 260 * r.height - 40) + 'px';
    }
    function hide() {
      var p = pts[pts.length - 1];
      cross.style.display = 'none'; tip.style.display = 'none';
      dot.setAttribute('cx', p[0]); dot.setAttribute('cy', p[1]);
    }
    svg.addEventListener('pointermove', function (e) { show(e.clientX); });
    svg.addEventListener('pointerleave', hide);
  }

  A.delegate(view, {
    range: function (el) { state.range = Number(el.dataset.r); render(); var b = view.querySelector('[data-act="range"][data-r="' + state.range + '"]'); if (b) b.focus(); }
  });
  S.on(function (kind) { if (kind === 'orders' || kind === 'products' || kind === 'traders' || kind === 'reset') render(); });
  render();
})();
