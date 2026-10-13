/**
 * Mohamed Serag Platform - Admin Shared Store & Utilities
 * Provides sample data, local persistence, formatting and toast helpers.
 */

const AdminApp = {
    // Current Active User
    currentUser: {
        name: 'محمد سراج',
        role: 'Super Admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        permissions: ['all']
    },

    // Sample Orders for Kanban & Table
    getOrders() {
        const stored = localStorage.getItem('ms_admin_orders');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { }
        }
        const initial = [
            {
                id: 'ORD-7821',
                customerName: 'م. أحمد الشناوي',
                phone: '01012345678',
                city: 'القاهرة - التجمع الخامس',
                items: [
                    { name: 'ثلاجة إل جي 20 قدم نوفروست إنفرتر', qty: 1, price: 42500 },
                    { name: 'غسالة أطباق بوش سيريس 6 ستانلس', qty: 1, price: 34900 }
                ],
                total: 77400,
                status: 'pending', // pending, confirmed, processing, shipped, delivered, cancelled
                paymentMethod: 'الدفع عند الاستلام (COD)',
                paymentStatus: 'غير مدفوع',
                date: '2026-10-13 21:15',
                notes: 'يرجى الاتصال قبل التوصيل بنصف ساعة'
            },
            {
                id: 'ORD-7820',
                customerName: 'د. سارة عبد الرحمن',
                phone: '01234567890',
                city: 'الجيزة - الشيخ زايد',
                items: [
                    { name: 'شاشة سامسونج 65 بوصة QLED 4K Smart', qty: 1, price: 28999 }
                ],
                total: 28999,
                status: 'confirmed',
                paymentMethod: 'إنستاباي (InstaPay)',
                paymentStatus: 'مدفوع ومؤكد',
                date: '2026-10-13 19:40',
                notes: 'تم التأكيد هاتفياً'
            },
            {
                id: 'ORD-7819',
                customerName: 'الحاج محمود الهواري',
                phone: '01123456789',
                city: 'الدقهلية - المنصورة',
                items: [
                    { name: 'طقم جرانيت تركي تاتش 14 قطعة أصلي TAÇ', qty: 2, price: 9800 }
                ],
                total: 19600,
                status: 'processing',
                paymentMethod: 'فودافون كاش (Vodafone Cash)',
                paymentStatus: 'مدفوع ومؤكد',
                date: '2026-10-13 16:30',
                notes: 'تجهيز الشحن مع مندوب الدلتا'
            },
            {
                id: 'ORD-7818',
                customerName: 'كابتن طارق فتحي',
                phone: '01098765432',
                city: 'الإسكندرية - سموحة',
                items: [
                    { name: 'بوتاجاز فريش هامر هيدروليك 5 شعلة 90 سم', qty: 1, price: 16400 }
                ],
                total: 16400,
                status: 'shipped',
                paymentMethod: 'الدفع عند الاستلام (COD)',
                paymentStatus: 'غير مدفوع',
                date: '2026-10-13 14:10',
                notes: 'مع المندوب أحمد سعيد كود #402'
            },
            {
                id: 'ORD-7817',
                customerName: 'أ. هاني المنياوي',
                phone: '01511223344',
                city: 'المنيا - مغاغة',
                items: [
                    { name: 'غسالة ملابس توشيبا 10 كيلو فوق أوتوماتيك', qty: 1, price: 18200 }
                ],
                total: 18200,
                status: 'delivered',
                paymentMethod: 'الدفع عند الاستلام (COD)',
                paymentStatus: 'تم التحصيل',
                date: '2026-10-12 18:20',
                notes: 'تم التسليم بنجاح ورضاء تام'
            }
        ];
        this.saveOrders(initial);
        return initial;
    },

    saveOrders(orders) {
        localStorage.setItem('ms_admin_orders', JSON.stringify(orders));
    },

    // Sample Products for Inventory & Catalog
    getProducts() {
        const stored = localStorage.getItem('ms_admin_products');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { }
        }
        const initial = [
            {
                id: 'PRD-101',
                name: 'ثلاجة إل جي 20 قدم نوفروست إنفرتر ديجيتال',
                brand: 'LG',
                category: 'refrigerators',
                categoryName: 'ثلاجات',
                price: 42500,
                oldPrice: 47000,
                costPrice: 38000,
                stock: 14,
                lowStockThreshold: 5,
                sku: 'LG-REF-20FT-INV',
                badge: 'الأكثر طلباً',
                featured: true,
                image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500&auto=format&fit=crop&q=80',
                status: 'active'
            },
            {
                id: 'PRD-102',
                name: 'شاشة سامسونج 65 بوصة QLED 4K Smart TV',
                brand: 'Samsung',
                category: 'tvs',
                categoryName: 'شاشات وتلفزيونات',
                price: 28999,
                oldPrice: 33500,
                costPrice: 25000,
                stock: 4,
                lowStockThreshold: 5,
                sku: 'SAM-65-QLED-4K',
                badge: 'عرض حصري',
                featured: true,
                image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&auto=format&fit=crop&q=80',
                status: 'active'
            },
            {
                id: 'PRD-103',
                name: 'غسالة أطباق بوش سيريس 6 ألماني 14 فرد ستانلس',
                brand: 'Bosch',
                category: 'dishwashers',
                categoryName: 'غسالات أطباق',
                price: 34900,
                oldPrice: 38000,
                costPrice: 30500,
                stock: 2,
                lowStockThreshold: 3,
                sku: 'BOSCH-DW-S6-14',
                badge: 'خصم خاص',
                featured: true,
                image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=80',
                status: 'active'
            },
            {
                id: 'PRD-104',
                name: 'بوتاجاز فريش هامر هيدروليك أمان كامل 90 سم',
                brand: 'Fresh',
                category: 'cookers',
                categoryName: 'بوتاجازات',
                price: 16400,
                oldPrice: 18200,
                costPrice: 14200,
                stock: 18,
                lowStockThreshold: 5,
                sku: 'FRSH-CKR-HAMR-90',
                badge: '',
                featured: false,
                image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500&auto=format&fit=crop&q=80',
                status: 'active'
            },
            {
                id: 'PRD-105',
                name: 'طقم جرانيت تركي تاتش أصلي 14 قطعة TAÇ Döküm',
                brand: 'TAÇ',
                category: 'cookware',
                categoryName: 'أدوات منزلية وحلل تركية',
                price: 9800,
                oldPrice: 12500,
                costPrice: 7800,
                stock: 25,
                lowStockThreshold: 8,
                sku: 'TAC-TRK-GRNT-14',
                badge: 'استيراد تركي حصري',
                featured: true,
                image: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=500&auto=format&fit=crop&q=80',
                status: 'active'
            },
            {
                id: 'PRD-106',
                name: 'قلاية هوائية فيليبس XXL تيربو 7.3 لتر',
                brand: 'Philips',
                category: 'small-appliances',
                categoryName: 'أجهزة صغيرة',
                price: 8950,
                oldPrice: 10200,
                costPrice: 7600,
                stock: 0,
                lowStockThreshold: 5,
                sku: 'PHL-AF-XXL-73',
                badge: 'نفذت الكمية',
                featured: false,
                image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=500&auto=format&fit=crop&q=80',
                status: 'out_of_stock'
            }
        ];
        this.saveProducts(initial);
        return initial;
    },

    saveProducts(products) {
        localStorage.setItem('ms_admin_products', JSON.stringify(products));
    },

    // Format currency in Egyptian Pounds
    formatEGP(amount) {
        return new Intl.NumberFormat('ar-EG', {
            style: 'currency',
            currency: 'EGP',
            maximumFractionDigits: 0
        }).format(amount).replace('ج.م.‏', 'ج.م');
    },

    // Toast notification
    notify(title, icon = 'success', text = '') {
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'bottom-start',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });
            Toast.fire({
                icon: icon,
                title: title,
                text: text
            });
        } else {
            alert(`${title}\n${text}`);
        }
    },

    // Shared Header/Sidebar Navigation Renderer
    renderNavigation(activePage = 'dashboard') {
        const sidebarEl = document.getElementById('admin-sidebar');
        if (!sidebarEl) return;

        const navItems = [
            { id: 'dashboard', href: 'index.html', icon: 'fa-gauge-high', label: 'لوحة المؤشرات العامة' },
            { id: 'orders', href: 'orders.html', icon: 'fa-boxes-stacked', label: 'إدارة الطلبات واللوجستيات', badge: '5 جديد' },
            { id: 'products', href: 'products.html', icon: 'fa-tags', label: 'الكتالوج والمخزون' },
            { id: 'cms-builder', href: 'cms-builder.html', icon: 'fa-wand-magic-sparkles', label: 'منشئ الواجهة (Visual CMS)' },
            { id: 'brands', href: 'brands.html', icon: 'fa-award', label: 'المصانع والوكالات الشريكة' },
            { id: 'settings', href: 'settings.html', icon: 'fa-sliders', label: 'إعدادات المتجر والصلاحيات' }
        ];

        let menuHtml = navItems.map(item => {
            const isActive = item.id === activePage;
            return `
                <a href="${item.href}" class="flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${isActive ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid ${item.icon} w-5 text-center ${isActive ? 'text-amber-400' : 'text-slate-500'}"></i>
                        <span>${item.label}</span>
                    </div>
                    ${item.badge ? `<span class="bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">${item.badge}</span>` : ''}
                </a>
            `;
        }).join('');

        sidebarEl.innerHTML = `
            <div class="flex flex-col h-full justify-between">
                <div>
                    <!-- Brand Header -->
                    <div class="p-6 border-b border-slate-800/80 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                                <i class="fa-solid fa-crown text-lg"></i>
                            </div>
                            <div>
                                <h1 class="text-white font-black tracking-tight text-base">محمد سراج</h1>
                                <p class="text-xs text-amber-400 font-semibold tracking-wider">لوحة الإدارة الذكية v2.0</p>
                            </div>
                        </div>
                    </div>

                    <!-- Navigation Links -->
                    <div class="p-4 space-y-1.5">
                        <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">إدارة المتجر</div>
                        ${menuHtml}
                    </div>
                </div>

                <!-- Footer Quick Actions & User -->
                <div class="p-4 border-t border-slate-800/80 space-y-3">
                    <a href="../index.html" target="_blank" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700/50 transition">
                        <i class="fa-solid fa-arrow-up-right-from-square text-amber-400"></i>
                        <span>معاينة واجهة المتجر الحية</span>
                    </a>

                    <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <div class="flex items-center gap-2.5">
                            <img src="${this.currentUser.avatar}" alt="Avatar" class="w-8 h-8 rounded-full border border-amber-500/40 object-cover">
                            <div class="text-right">
                                <p class="text-xs font-bold text-slate-200">${this.currentUser.name}</p>
                                <span class="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                    ${this.currentUser.role}
                                </span>
                            </div>
                        </div>
                        <button onclick="AdminApp.notify('تم تسجيل الخروج بأمان', 'info')" class="text-slate-500 hover:text-rose-400 text-sm p-1.5 transition" title="تسجيل الخروج">
                            <i class="fa-solid fa-right-from-bracket"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
};

window.AdminApp = AdminApp;
