/* =========================================================
   Demo data for the admin. Replaced by API responses later.
   Products are generated from the storefront CATALOG in /config.js
   (same ids, names, brands, categories and prices).
   ========================================================= */
(function () {
  var MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

  function order(id, ago, customer, channel, city, pay, status, items, ship) {
    return { id: id, createdAgo: ago, customer: customer, phone: '[رقم الموبايل]', channel: channel, city: city, pay: pay, status: status, items: items, ship: ship, source: 'seed' };
  }
  function it(pid, qty) { return { pid: pid, qty: qty }; }

  window.SERAG_SEED = {
    version: 2,

    products: [
    {"id":"s1","name":"ثلاجة نوفروست بابين 450 لتر","brand":"Samsung · سامسونج","cat":"ثلاجات وفريزر","price":28900,"old":32500,"stock":14,"active":true,"flash":true,"cap":"450 لتر (16 قدم)","warranty":"10 سنوات ضمان سامسونج","desc":"ديجيتال انفرتر · Twin Cooling"},
    {"id":"s2","name":"ثلاجة ديفروست 350 لتر","brand":"Toshiba · توشيبا","cat":"ثلاجات وفريزر","price":19800,"old":22000,"stock":6,"active":true,"flash":false,"cap":"350 لتر (14 قدم)","warranty":"10 سنوات العربي جروب","desc":"تبريد هجين · موفرة للطاقة"},
    {"id":"s3","name":"ثلاجة نوفروست ديجيتال 400 لتر","brand":"LG · إل جي","cat":"ثلاجات وفريزر","price":31500,"old":34900,"stock":3,"active":true,"flash":false,"cap":"400 لتر ديجيتال","warranty":"10 سنوات ضمان إل جي","desc":"Smart Inverter · Linear Cooling"},
    {"id":"s4","name":"ثلاجة ديفروست 14 قدم","brand":"Fresh · فريش","cat":"ثلاجات وفريزر","price":17200,"old":19000,"stock":9,"active":true,"flash":false,"cap":"14 قدم (330 لتر)","warranty":"10 سنوات ضمان فريش","desc":"عزل حراري سميك · أرفف بايركس"},
    {"id":"s5","name":"غسالة أوتوماتيك فتحة أمامية 8 كجم","brand":"LG · إل جي","cat":"غسالات","price":24500,"old":27000,"stock":22,"active":true,"flash":true,"cap":"8 كجم · 1200 لفة","warranty":"10 سنوات على الموتور","desc":"موتور دفع مباشر Direct Drive بالبخار"},
    {"id":"s6","name":"غسالة أوتوماتيك 10 كجم إنفرتر","brand":"Samsung · سامسونج","cat":"غسالات","price":29900,"old":33000,"stock":17,"active":true,"flash":false,"cap":"10 كجم · 1400 لفة","warranty":"10 سنوات ضمان سامسونج","desc":"ديجيتال انفرتر · EcoBubble"},
    {"id":"s7","name":"غسالة نصف أوتوماتيك 7 كجم","brand":"Tornado · تورنيدو","cat":"غسالات","price":9800,"old":11200,"stock":31,"active":true,"flash":false,"cap":"7 كجم · حوضين","warranty":"5 سنوات العربي جروب","desc":"موتور قوي · فلتر نسالة مزدوج"},
    {"id":"s8","name":"شاشة سمارت 55 بوصة 4K","brand":"Samsung · سامسونج","cat":"شاشات وتلفزيونات","price":21900,"old":24500,"stock":9,"active":true,"flash":true,"cap":"55 بوصة 4K UHD","warranty":"سنتان ضمان سامسونج","desc":"معالج Crystal 4K · ريسيفر داخلي · HDR10+"},
    {"id":"s9","name":"شاشة 43 بوصة Full HD","brand":"Sharp · شارب","cat":"شاشات وتلفزيونات","price":11900,"old":13500,"stock":12,"active":true,"flash":false,"cap":"43 بوصة FHD","warranty":"3 سنوات العربي جروب","desc":"إضاءة LED مباشرة · مدخلين HDMI + USB"},
    {"id":"s10","name":"شاشة QLED سمارت 65 بوصة","brand":"LG · إل جي","cat":"شاشات وتلفزيونات","price":38900,"old":42000,"stock":4,"active":true,"flash":false,"cap":"65 بوصة QLED 4K","warranty":"سنتان ضمان إل جي","desc":"ألوان Quantum · ذكاء اصطناعي ThinQ AI"},
    {"id":"s11","name":"تكييف سبليت 1.5 حصان إنفرتر","brand":"Sharp · شارب","cat":"تكييفات","price":26900,"old":29500,"stock":2,"active":true,"flash":true,"cap":"1.5 حصان (تغطية 14 م²)","warranty":"5 سنوات العربي جروب","desc":"انفرتر موفر 40% · بلازما كلاستر ديجيتال"},
    {"id":"s12","name":"تكييف سبليت 2.25 حصان بارد ساخن","brand":"Toshiba · توشيبا","cat":"تكييفات","price":34500,"old":37500,"stock":8,"active":true,"flash":false,"cap":"2.25 حصان (تغطية 20 م²)","warranty":"5 سنوات العربي جروب","desc":"بارد ساخن · تربو كول · فلاتر مضادة للبكتيريا"},
    {"id":"s13","name":"تكييف سبليت 3 حصان بارد","brand":"Fresh · فريش","cat":"تكييفات","price":38900,"old":42000,"stock":5,"active":true,"flash":false,"cap":"3 حصان (تغطية 26 م²)","warranty":"5 سنوات ضمان فريش","desc":"كباس تروبيكال للأجواء الحارة · تبريد فائق"},
    {"id":"s14","name":"بوتاجاز 5 شعلة ستانلس","brand":"Unionaire · يونيون إير","cat":"بوتاجازات","price":14900,"old":16800,"stock":11,"active":true,"flash":false,"cap":"90 × 60 سم (5 شعلة)","warranty":"5 سنوات ضمان يونيون إير","desc":"استانلس كامل · إشعال ذاتي · مروحة فرن"},
    {"id":"s15","name":"بوتاجاز غاز 4 شعلة","brand":"Fresh · فريش","cat":"بوتاجازات","price":9400,"old":10800,"stock":26,"active":true,"flash":false,"cap":"60 × 60 سم (4 شعلة)","warranty":"5 سنوات ضمان فريش","desc":"شواية بالموتور · إشعال أوتوماتيك"},
    {"id":"s16","name":"بوتاجاز غاز 5 شعلة بشاشة","brand":"Tornado · تورنيدو","cat":"بوتاجازات","price":11700,"old":13200,"stock":7,"active":true,"flash":false,"cap":"90 × 60 سم ديجيتال","warranty":"5 سنوات العربي جروب","desc":"شاشة تايمر ديجيتال · أمان كامل · حوامل زهر"},
    {"id":"f1","name":"ثلاجة سامسونج 18 قدم نوفروست انفرتر","brand":"Samsung · سامسونج","cat":"ثلاجات وفريزر","price":24900,"old":29500,"stock":18,"active":true,"flash":true,"cap":"18 قدم (500 لتر)","warranty":"10 سنوات ضمان سامسونج","desc":"ديجيتال انفرتر · نوفروست بالكامل"},
    {"id":"f2","name":"غسالة توشيبا فوق أوتوماتيك 13 كيلو","brand":"Toshiba · توشيبا","cat":"غسالات","price":14800,"old":17900,"stock":13,"active":true,"flash":true,"cap":"13 كيلو تحميل علوي","warranty":"5 سنوات العربي جروب","desc":"موتور الدفع المباشر · 8 برامج غسيل"},
    {"id":"f3","name":"شاشة إل جي 55 بوصة 4K سمارت","brand":"LG · إل جي","cat":"شاشات وتلفزيونات","price":18500,"old":22000,"stock":10,"active":true,"flash":true,"cap":"55 بوصة 4K UHD","warranty":"سنتان ضمان إل جي","desc":"WebOS سمارت · ريموت ماجيك · HDR10"},
    {"id":"f4","name":"تكييف شارب 1.5 حصان بارد ساخن انفرتر","brand":"Sharp · شارب","cat":"تكييفات","price":22400,"old":26200,"stock":3,"active":true,"flash":true,"cap":"1.5 حصان بارد ساخن","warranty":"5 سنوات العربي جروب","desc":"انفرتر + بلازما كلاستر · شاشة ديجيتال"}
    ],

    orders: [
      order('SR-2026-0124', 42 * MIN, 'أحمد محمود', 'أفراد', 'المنصورة - الدقهلية', 'cod', 'new', [it('s1', 1), it('s5', 1), it('s8', 1)], 100),
      order('SR-2026-0123', 2.5 * HOUR, 'شركة النيل للتجهيزات', 'تجّار', 'طنطا - الغربية', 'bank', 'prep', [it('s11', 8)], 0),
      order('SR-2026-0122', 20 * HOUR, 'منى السيد', 'أفراد', 'دمياط', 'vfcash', 'ship', [it('s1', 1)], 250),
      order('SR-2026-0121', 1.3 * DAY, 'محمد إبراهيم', 'أفراد', 'المنصورة - الدقهلية', 'instapay', 'done', [it('s8', 1)], 100),
      order('SR-2026-0120', 2 * DAY, 'ياسمين خالد', 'جهاز عروسة', 'الزقازيق - الشرقية', 'bank', 'done', [it('s3', 1), it('s6', 1), it('s10', 1), it('s14', 1)], 250),
      order('SR-2026-0119', 2.2 * DAY, 'مكتب الأمل للتوريدات', 'تجّار', 'المنصورة - الدقهلية', 'credit', 'prep', [it('s14', 12)], 0),
      order('SR-2026-0118', 3 * DAY, 'كريم عادل', 'أفراد', 'ميت غمر - الدقهلية', 'cod', 'new', [it('s5', 1)], 150),
      order('SR-2026-0117', 3.2 * DAY, 'هدى سمير', 'أفراد', 'المنصورة - الدقهلية', 'fawry', 'cancel', [it('s9', 1)], 100),
      order('SR-2026-0116', 4 * DAY, 'عمر فتحي', 'أفراد', 'كفر الشيخ', 'cod', 'done', [it('s15', 2)], 250)
    ],

    traders: [
      { id: 't1', company: 'شركة النيل للتجهيزات', type: 'مقاول تجهيزات', city: 'طنطا', cr: '[رقم السجل]', volume: 'أكتر من 500 ألف / شهر', status: 'pending', limit: 100000 },
      { id: 't2', company: 'مكتب الأمل للتوريدات', type: 'مورد مؤسسات', city: 'المنصورة', cr: '[رقم السجل]', volume: '100 - 500 ألف / شهر', status: 'pending', limit: 100000 },
      { id: 't3', company: 'فنادق البحر الأزرق', type: 'ضيافة وفنادق', city: 'دمياط', cr: '[رقم السجل]', volume: 'أكتر من 500 ألف / شهر', status: 'pending', limit: 100000 },
      { id: 't4', company: 'معرض الإخلاص للأجهزة', type: 'تاجر تجزئة', city: 'ميت غمر', cr: '[رقم السجل]', volume: 'أقل من 100 ألف / شهر', status: 'pending', limit: 100000 }
    ],

    customers: [
      { id: 'c1', name: 'أحمد محمود', city: 'المنصورة', type: 'أفراد', orders: 6, spent: 184200, tier: 'ذهبي' },
      { id: 'c2', name: 'شركة النيل للتجهيزات', city: 'طنطا', type: 'تاجر', orders: 14, spent: 1250000, tier: 'بلاتيني' },
      { id: 'c3', name: 'منى السيد', city: 'دمياط', type: 'أفراد', orders: 3, spent: 62400, tier: 'فضي' },
      { id: 'c4', name: 'ياسمين خالد', city: 'الزقازيق', type: 'جهاز عروسة', orders: 2, spent: 214000, tier: 'ذهبي' },
      { id: 'c5', name: 'محمد إبراهيم', city: 'المنصورة', type: 'أفراد', orders: 1, spent: 21900, tier: 'جديد' },
      { id: 'c6', name: 'مكتب الأمل للتوريدات', city: 'المنصورة', type: 'تاجر', orders: 9, spent: 640000, tier: 'بلاتيني' },
      { id: 'c7', name: 'كريم عادل', city: 'ميت غمر', type: 'أفراد', orders: 2, spent: 31900, tier: 'جديد' },
      { id: 'c8', name: 'هدى سمير', city: 'المنصورة', type: 'أفراد', orders: 4, spent: 77300, tier: 'فضي' }
    ],

    cms: {
      content: {
        announce: { text: 'توصيل لحد باب البيت وتقسيط مريح على الأجهزة الكبيرة', link: 'اعرف التفاصيل' },
        hero: { eyebrow: 'منذ 1972 · المنصورة', title1: 'بيتك', title2: 'يستاهل الأحسن', sub: 'أجهزة منزلية وأدوات مطبخ من أكبر الماركات، بضمان حقيقي وخدمة بتستمر بعد البيع.', cta1: 'تسوّق دلوقتي', cta2: 'اطلب جهاز عروستك', badge: 'SINCE 1972', theme: 0 },
        categories: { title: 'تسوّق حسب القسم', sub: 'كل اللي بيتك محتاجه في مكان واحد' },
        flash: { title: 'عروض الفلاش', sub: 'خصومات لفترة محدودة على أجهزة مختارة', hours: '12' },
        bridal: { title: 'جهاز العروسة', sub: 'باقات متكاملة جاهزة للتوصيل والتركيب', tier1: 'الباقة الأساسية', tier2: 'الباقة الذهبية', tier3: 'باقة القصر' },
        b2b: { title: 'حلول للشركات والتجّار', sub: 'أسعار جملة، فواتير رسمية، وحساب مخصص لمدير حساب.', cta: 'سجّل كتاجر' },
        about: { title: 'حكاية سراج', p1: 'بدأت الحكاية سنة 1972 في المنصورة بمحل صغير وحلم كبير: إن كل بيت يلاقي الجهاز اللي يستاهله بسعر عادل.', p2: '[اكتب هنا باقي القصة: المراحل، الفروع، الشراكات مع المصانع]', since: '1972' },
        footer: { tagline: 'محمد سراج — أجهزة منزلية وأدوات مطبخ', whatsapp: '[رقم الواتساب]', address: '[العنوان - المنصورة]' }
      },
      order: ['announce', 'hero', 'categories', 'flash', 'bridal', 'b2b', 'about', 'footer'],
      hidden: {},
      versions: [
        { n: 3, label: 'تعديل نصوص الهيرو', ago: 14 * HOUR, patch: { hero: { title2: 'يستاهل الأفضل' }, flash: { hours: '24' }, announce: { text: 'خصم خاص على الأجهزة الكبيرة' } } },
        { n: 2, label: 'ثيم كريمي للهيرو', ago: 4 * DAY, patch: { hero: { title2: 'يستاهل الأفضل', theme: 1, cta1: 'اشتري دلوقتي' } } },
        { n: 1, label: 'النسخة الأولى', ago: 14 * DAY, patch: {} }
      ],
      publishedAgo: 3 * HOUR
    },

    settings: {
      store: { name: 'محمد سراج للأجهزة المنزلية', since: '1972', phone: '[رقم التليفون]', whatsapp: '[رقم الواتساب]', email: '[الإيميل]', address: '[العنوان - المنصورة]' },
      zones: [
        { name: 'المنصورة', desc: 'المنصورة وطلخا', price: 100 },
        { name: 'مراكز الدقهلية', desc: 'ميت غمر، السنبلاوين، دكرنس، المنزلة…', price: 150 },
        { name: 'باقي الدلتا', desc: 'الغربية، دمياط، الشرقية، كفر الشيخ…', price: 250 },
        { name: 'باقي مصر', desc: 'القاهرة، الإسكندرية، القناة، الصعيد…', price: 400 }
      ],
      freeOver: 10000,
      payments: { cod: true, instapay: true, vfcash: true, fawry: true, pickup: true, installments: false, b2b: true },
      team: [
        { id: 1, name: 'مدير المتجر', scope: 'كل الصلاحيات', role: 0 },
        { id: 2, name: 'مسؤول المحتوى', scope: 'محرر الموقع والمنتجات', role: 1 },
        { id: 3, name: 'مسؤول الطلبات', scope: 'الطلبات والعملاء فقط', role: 2 }
      ],
      palette: 0
    }
  };
})();
