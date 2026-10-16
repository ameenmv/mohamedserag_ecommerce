/* =========================================================
   SeragStore — the only place the admin reads or writes data.
   Each method is named after the endpoint that will replace it:
     orders.list()            GET    /api/orders
     orders.update(id, p)     PATCH  /api/orders/:id
     products.create(p)       POST   /api/products
     products.remove(id)      DELETE /api/products/:id
     cms.publish()            POST   /api/content/home/publish
   Today it persists to localStorage (falls back to memory).
   ========================================================= */
(function () {
  var PREFIX = 'serag_admin_';
  var SEED = window.SERAG_SEED;
  var listeners = [];
  var mem = {};
  var persistent = true;

  try {
    localStorage.setItem(PREFIX + 'probe', '1');
    localStorage.removeItem(PREFIX + 'probe');
  } catch (e) { persistent = false; }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function read(key) {
    if (!persistent) return mem[key] === undefined ? null : clone(mem[key]);
    try { return JSON.parse(localStorage.getItem(PREFIX + key) || 'null'); } catch (e) { return null; }
  }
  function write(key, val) {
    if (!persistent) { mem[key] = clone(val); return; }
    try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch (e) { mem[key] = clone(val); }
  }
  function emit(kind, detail) {
    listeners.forEach(function (fn) { try { fn(kind, detail); } catch (e) { console.error(e); } });
  }

  /* ---------- seeding ---------- */
  function seedAll() {
    var now = Date.now();
    var byId = {};
    SEED.products.forEach(function (p) { byId[p.id] = p; });
    write('products', SEED.products);
    write('orders', SEED.orders.map(function (o) {
      var c = clone(o);
      c.createdAt = now - o.createdAgo;
      delete c.createdAgo;
      c.items = o.items.map(function (i) {
        var p = byId[i.pid];
        return { pid: i.pid, name: p ? p.name : i.pid, qty: i.qty, price: p ? p.price : 0 };
      });
      c.history = [{ status: c.status, at: c.createdAt }];
      return c;
    }));
    write('traders', SEED.traders);
    write('customers', SEED.customers);
    var cms = clone(SEED.cms);
    var base = cms.content;
    cms.published = clone(base);
    cms.draft = clone(base);
    cms.publishedAt = now - cms.publishedAgo;
    cms.publishedLayout = { order: clone(cms.order), hidden: clone(cms.hidden) };
    cms.versions = cms.versions.map(function (v) {
      var snap = clone(base);
      Object.keys(v.patch).forEach(function (sec) { Object.assign(snap[sec], v.patch[sec]); });
      return { n: v.n, label: v.label, at: now - v.ago, snap: { content: snap, order: clone(cms.order), hidden: {} } };
    });
    delete cms.content; delete cms.publishedAgo;
    write('cms', cms);
    write('settings', SEED.settings);
    write('meta', { version: SEED.version, seededAt: now });
  }
  var meta = read('meta');
  if (!meta || meta.version !== SEED.version) seedAll();

  /* ---------- storefront bridge ----------
     checkout.html saves the last order to localStorage.serag_order.
     Same origin, so we can pick it up as a real incoming order. */
  function syncStorefrontOrder() {
    var raw;
    try { raw = JSON.parse(localStorage.getItem('serag_order') || 'null'); } catch (e) { raw = null; }
    if (!raw || !raw.no) return null;
    var orders = read('orders') || [];
    if (orders.some(function (o) { return o.id === raw.no; })) return null;
    var products = read('products') || [];
    var zones = (read('settings') || SEED.settings).zones;
    var names = Array.isArray(raw.items) ? raw.items : [];
    var items = names.map(function (n) {
      var p = products.find(function (x) { return x.name === n; });
      return { pid: p ? p.id : null, name: n, qty: 1, price: p ? p.price : Math.round((raw.subtotal || 0) / Math.max(1, names.length)) };
    });
    var zone = zones[raw.zone] || zones[0];
    var o = {
      id: raw.no, createdAt: Date.now(), customer: 'عميل من الموقع', phone: '[رقم الموبايل]', channel: 'أفراد',
      city: raw.ship === 'pickup' ? 'استلام من المعرض' : zone.name, pay: raw.method || 'cod', status: 'new',
      items: items, ship: raw.ship === 'pickup' ? 0 : (raw.shipCost || 0), source: 'storefront',
      history: [{ status: 'new', at: Date.now() }]
    };
    orders.unshift(o);
    write('orders', orders);
    return o;
  }
  var incoming = syncStorefrontOrder();

  /* ---------- generic collection ---------- */
  function collection(key) {
    return {
      list: function () { return read(key) || []; },
      get: function (id) { return (read(key) || []).find(function (x) { return x.id === id; }) || null; },
      update: function (id, patch) {
        var all = read(key) || [];
        var out = null;
        all = all.map(function (x) {
          if (x.id !== id) return x;
          out = Object.assign({}, x, patch);
          return out;
        });
        write(key, all); emit(key, { op: 'update', id: id });
        return out;
      },
      create: function (item) {
        var all = read(key) || [];
        all.unshift(item);
        write(key, all); emit(key, { op: 'create', id: item.id });
        return item;
      },
      remove: function (id) {
        write(key, (read(key) || []).filter(function (x) { return x.id !== id; }));
        emit(key, { op: 'remove', id: id });
      }
    };
  }

  var orders = collection('orders');
  orders.setStatus = function (id, status) {
    var o = orders.get(id);
    if (!o) return null;
    var history = (o.history || []).concat([{ status: status, at: Date.now() }]);
    return orders.update(id, { status: status, history: history });
  };
  orders.total = function (o) {
    return o.items.reduce(function (a, i) { return a + i.price * i.qty; }, 0) + (o.ship || 0);
  };

  var products = collection('products');
  products.nextId = function () {
    var n = (read('products') || []).reduce(function (m, p) {
      var k = parseInt(String(p.id).replace(/\D/g, ''), 10) || 0;
      return Math.max(m, k);
    }, 0);
    return 'p' + (n + 1);
  };

  window.SeragStore = {
    persistent: persistent,
    incoming: incoming,
    orders: orders,
    products: products,
    traders: collection('traders'),
    customers: collection('customers'),
    cms: {
      get: function () { return read('cms'); },
      saveDraft: function (draft, order, hidden) {
        var c = read('cms');
        c.draft = draft; if (order) c.order = order; if (hidden) c.hidden = hidden;
        write('cms', c); emit('cms', { op: 'draft' });
        return c;
      },
      publish: function (label) {
        var c = read('cms');
        var n = c.versions.length ? c.versions[0].n + 1 : 1;
        c.published = clone(c.draft);
        c.publishedLayout = { order: clone(c.order), hidden: clone(c.hidden) };
        c.publishedAt = Date.now();
        c.versions = [{ n: n, label: label, at: Date.now(), snap: { content: clone(c.draft), order: clone(c.order), hidden: clone(c.hidden) } }].concat(c.versions).slice(0, 8);
        write('cms', c); emit('cms', { op: 'publish' });
        return c;
      }
    },
    settings: {
      get: function () { return read('settings'); },
      set: function (patch) {
        var s = Object.assign({}, read('settings'), patch);
        write('settings', s); emit('settings', { op: 'update' });
        return s;
      }
    },
    on: function (fn) { listeners.push(fn); },
    reset: function () { seedAll(); emit('reset', {}); }
  };

  // Another tab (or the storefront checkout) changed storage: re-sync and tell the page.
  window.addEventListener('storage', function (e) {
    if (e.key === 'serag_order') {
      var o = syncStorefrontOrder();
      if (o) { window.SeragStore.incoming = o; emit('orders', { op: 'incoming', id: o.id }); }
    } else if (e.key && e.key.indexOf(PREFIX) === 0) {
      emit(e.key.slice(PREFIX.length), { op: 'external' });
    }
  });
})();
