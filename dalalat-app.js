(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ADMIN_EMAIL = 'abadrhman9096@gmail.com';
  // ضع إعدادات تطبيق Firebase Web من Firebase Console. هذه قيم تعريف عامة وليست كلمات مرور.
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBZLNTmNWu_Q5ZuClgOjZTQw7hF2P7EC54',
    authDomain: 'dalalatsudangithub-o.firebaseapp.com',
    projectId: 'dalalatsudangithub-o',
    storageBucket: 'dalalatsudangithub-o.firebasestorage.app',
    messagingSenderId: '52962279300',
    appId: '1:52962279300:web:712c0c3876e8a64a8d27d1',
    measurementId: 'G-67YM860DEQ'
  };

  let auth = null;
  let db = null;
  let storage = null;
  let currentUser = null;
  let publishedAds = [];
  let managedAds = [];
  let promos = [];
  let allManagedAds = [];
  let allManagedPromos = [];
  let activeCategory = '';
  let searchTerm = '';
  let adsUnsubscribe = null;
  let promosUnsubscribe = null;
  let adminAdsUnsubscribe = null;
  let adminPromosUnsubscribe = null;

  function toast(message, icon = '✅') {
    const box = $('globalToast');
    if (!box) return;
    $('toastText').textContent = message;
    $('toastIcon').textContent = icon;
    box.style.display = 'flex';
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => { box.style.display = 'none'; }, 4200);
  }

  function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function safeUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function formatDate(value) {
    if (!value) return '';
    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ar-SD', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  }

  function openModal(modal) { modal?.classList.add('active'); }
  function closeModal(modal) { modal?.classList.remove('active'); }

  const addAdModal = $('addAdModal');
  const adminModal = $('adminModal');

  $('openFormTopBtn')?.addEventListener('click', () => openModal(addAdModal));
  $('heroBannerAddBtn')?.addEventListener('click', () => openModal(addAdModal));
  $('heroBannerAddBtn2')?.addEventListener('click', () => openModal(addAdModal));
  $('navAddCenterBtn')?.addEventListener('click', () => openModal(addAdModal));
  $('closeAdModalBtn')?.addEventListener('click', () => closeModal(addAdModal));
  $('closeAdminModalBtn')?.addEventListener('click', () => closeModal(adminModal));
  $('openAdminBtn')?.addEventListener('click', () => { openModal(adminModal); updateAdminPanel(); });
  $('addPromoSlideBtn')?.addEventListener('click', () => { openModal(adminModal); updateAdminPanel(); });
  window.addEventListener('click', (event) => {
    if (event.target === addAdModal) closeModal(addAdModal);
    if (event.target === adminModal) closeModal(adminModal);
  });

  const configured = Object.values(FIREBASE_CONFIG).every((v) => v && !v.startsWith('YOUR_'));
  if (configured && window.firebase) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
      storage = firebase.storage();
    } catch (error) {
      console.error(error);
    }
  }

  function setMessage(id, message, isError = false) {
    const node = $(id);
    if (!node) return;
    node.textContent = message;
    node.style.color = isError ? '#b91c1c' : '#475569';
  }

  function updateAdminPanel() {
    const loginPanel = $('adminLoginPanel');
    const toolsPanel = $('adminTools');
    if (!configured || !auth || !db || !storage) {
      if (loginPanel) loginPanel.hidden = false;
      if (toolsPanel) toolsPanel.hidden = true;
      setMessage('adminAuthMessage', 'لوحة الإدارة تحتاج ربط Firebase أولاً. بعد الإعداد، سجّل الدخول ببريد الإدارة وكلمة مروره.', true);
      return;
    }
    if (currentUser && currentUser.email === ADMIN_EMAIL && currentUser.emailVerified) {
      if (loginPanel) loginPanel.hidden = true;
      if (toolsPanel) toolsPanel.hidden = false;
      setMessage('adminAuthMessage', 'تم تسجيل الدخول الآمن إلى لوحة الإدارة.');
      renderAdminManager();
    } else {
      if (loginPanel) loginPanel.hidden = false;
      if (toolsPanel) toolsPanel.hidden = true;
      setMessage('adminAuthMessage', currentUser ? 'هذا الحساب غير مخوّل للإدارة أو لم يتم توثيق بريده.' : 'سجّل الدخول ببريد الإدارة وكلمة المرور.');
    }
  }

  if (auth) {
    auth.onAuthStateChanged(async (user) => {
      if (user && (user.email !== ADMIN_EMAIL || !user.emailVerified)) {
        await auth.signOut();
        currentUser = null;
      } else {
        currentUser = user;
      }
      updateAdminPanel();
      if (currentUser) subscribeAdminData();
      else stopAdminSubscriptions();
    });
  } else {
    updateAdminPanel();
  }

  $('adminLoginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!auth) {
      setMessage('adminAuthMessage', 'أكمل إعداد Firebase في الملف أولاً.', true);
      return;
    }
    const email = $('adminEmail').value.trim().toLowerCase();
    const password = $('adminPassword').value;
    if (email !== ADMIN_EMAIL.toLowerCase()) {
      setMessage('adminAuthMessage', 'استخدم بريد الإدارة المحدد للموقع.', true);
      return;
    }
    try {
      await auth.signInWithEmailAndPassword(email, password);
      $('adminLoginForm').reset();
    } catch (error) {
      setMessage('adminAuthMessage', 'تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور ومن تفعيل Email/Password في Firebase.', true);
      console.error(error);
    }
  });

  $('forgotPasswordBtn')?.addEventListener('click', async () => {
    if (!auth) return setMessage('adminAuthMessage', 'أكمل إعداد Firebase أولاً.', true);
    try {
      await auth.sendPasswordResetEmail(ADMIN_EMAIL);
      setMessage('adminAuthMessage', 'أرسلنا رابط إعادة تعيين كلمة المرور إلى بريد الإدارة.');
    } catch (error) {
      setMessage('adminAuthMessage', 'تعذر إرسال رابط الاستعادة. تحقق من تفعيل Firebase Authentication.', true);
    }
  });

  $('adminLogoutBtn')?.addEventListener('click', async () => {
    if (auth) await auth.signOut();
    closeModal(adminModal);
    toast('تم تسجيل الخروج من لوحة الإدارة.');
  });

  function subscribePublicData() {
    if (!db) {
      $('ads').innerHTML = '<div class="empty-state"><strong>الإعلانات السحابية غير مفعّلة بعد</strong><span>يمكنك إرسال إعلانك عبر واتساب، أو تواصل مع الإدارة لإكمال إعداد الموقع.</span></div>';
      $('promoAds').innerHTML = '<div class="promo-empty">سيظهر هنا المحتوى الترويجي الجديد بعد ربط قاعدة البيانات.</div>';
      return;
    }
    if (adsUnsubscribe) adsUnsubscribe();
    if (promosUnsubscribe) promosUnsubscribe();

    adsUnsubscribe = db.collection('ads').where('status', '==', 'published').onSnapshot((snapshot) => {
      publishedAds = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      renderAds();
    }, (error) => {
      console.error(error);
      setMessage('siteDataStatus', 'تعذر تحميل الإعلانات. راجع صلاحيات Firestore وقواعد الأمان.', true);
    });

    promosUnsubscribe = db.collection('promos').where('visible', '==', true).onSnapshot((snapshot) => {
      promos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      renderPromos();
    }, (error) => {
      console.error(error);
      $('promoAds').innerHTML = '<div class="promo-empty">تعذر تحميل الدعايات المميزة. تحقق من إعدادات قاعدة البيانات.</div>';
    });
  }

  function mediaMarkup(item, compact = false) {
    const mediaUrl = safeUrl(item.mediaUrl || item.image || '');
    if (!mediaUrl) return '';
    const height = compact ? '120px' : '230px';
    if (item.mediaType === 'video' || item.type === 'video') {
      return '<video controls playsinline preload="metadata" style="width:100%;height:' + height + ';object-fit:cover;background:#0f172a"><source src="' + escapeHTML(mediaUrl) + '"></video>';
    }
    return '<img alt="' + escapeHTML(item.title || 'صورة الإعلان') + '" loading="lazy" src="' + escapeHTML(mediaUrl) + '" style="width:100%;height:' + height + ';object-fit:cover;background:#f1f5f9"/>';
  }

  function renderAds() {
    const container = $('ads');
    if (!container) return;
    const filtered = publishedAds.filter((ad) => {
      const categoryMatch = !activeCategory || ad.category === activeCategory;
      const haystack = [ad.title, ad.category, ad.city, ad.details, ad.author].join(' ').toLowerCase();
      return categoryMatch && (!searchTerm || haystack.includes(searchTerm));
    });
    if (!filtered.length) {
      container.innerHTML = '<div class="empty-state"><strong>' + (publishedAds.length ? 'لا توجد إعلانات مطابقة لبحثك' : 'لا توجد إعلانات منشورة حالياً') + '</strong><span>أرسل إعلانك أو تابع الصفحة؛ الإعلانات تظهر هنا بعد اعتمادها من الإدارة.</span><button class="btn-top-add" type="button" onclick="document.getElementById(\'openFormTopBtn\').click()">أرسل إعلانك الآن</button></div>';
      return;
    }
    container.innerHTML = '';
    filtered.forEach((ad) => {
      const article = document.createElement('article');
      article.className = 'ad-card';
      article.dataset.adCat = ad.category || 'أخرى';
      article.dataset.adTitle = ad.title || '';
      article.id = 'ad-' + ad.id;

      let phone = String(ad.phone || '').replace(/[^0-9]/g, '');
      let wa = String(ad.whatsapp || ad.phone || '').replace(/[^0-9]/g, '');
      if (wa.startsWith('0')) wa = '249' + wa.slice(1);
      else if (!wa.startsWith('249') && wa.length >= 9) wa = '249' + wa;
      const waHref = wa ? 'https://wa.me/' + wa + '?text=' + encodeURIComponent('مرحباً، أستفسر عن إعلانك: ' + ad.title) : '';
      const contactActions = [
        phone ? '<a class="btn-contact btn-call" href="tel:' + escapeHTML(phone) + '">📞 اتصال بالمعلن</a>' : '',
        waHref ? '<a class="btn-contact btn-wa" href="' + escapeHTML(waHref) + '" rel="noopener" target="_blank">💬 واتساب المعلن</a>' : ''
      ].join('');
      article.innerHTML = '<div class="ad-media">' + mediaMarkup(ad) + '<span class="ad-date">' + escapeHTML(formatDate(ad.createdAt || ad.created_at)) + '</span></div>' +
        '<div class="ad-info"><div class="ad-meta"><span>📂 ' + escapeHTML(ad.category || 'أخرى') + '</span><span>📍 ' + escapeHTML(ad.city || '') + '</span></div>' +
        '<h4>' + escapeHTML(ad.title || '') + '</h4><div class="ad-price">' + escapeHTML(ad.price || 'السعر عند التواصل') + '</div>' +
        '<p>' + escapeHTML(ad.details || '') + '</p><div class="ad-actions-grid">' + contactActions +
        '<button class="btn-fb-share" type="button">📢 مشاركة الإعلان</button></div></div>';
      article.querySelector('.btn-fb-share')?.addEventListener('click', () => shareAd(ad));
      container.appendChild(article);
    });
  }

  function renderPromos() {
    const slider = $('promoAds');
    if (!slider) return;
    if (!promos.length) {
      slider.innerHTML = '<div class="promo-empty">لا توجد دعاية مميزة حالياً. تابعنا أو أرسل إعلانك للإدارة.</div>';
      return;
    }
    slider.innerHTML = '';
    promos.forEach((promo) => {
      const card = document.createElement('article');
      card.className = 'featured-card promo-media-card';
      card.style.background = promo.bg || 'linear-gradient(135deg, #064e3b, #047857)';
      const link = safeUrl(promo.link || '');
      card.innerHTML = mediaMarkup(promo, true) + '<div class="promo-copy"><span class="promo-badge">' + escapeHTML(promo.badge || '🔥 إعلان مميز') + '</span><h4>' + escapeHTML(promo.title || '') + '</h4><p>' + escapeHTML(promo.desc || '') + '</p>' + (link ? '<a href="' + escapeHTML(link) + '" rel="noopener" target="_blank">التفاصيل ↗</a>' : '') + '</div>';
      slider.appendChild(card);
    });
  }

  function shareAd(ad) {
    const url = new URL(window.location.href);
    url.searchParams.set('q', ad.title || '');
    if (navigator.share) navigator.share({ title: ad.title, text: 'شاهد هذا الإعلان في دلالة السودان', url: url.href }).catch(() => {});
    else navigator.clipboard?.writeText(url.href).then(() => toast('تم نسخ رابط الموقع للمشاركة.', '🔗'));
  }

  function subscribeAdminData() {
    if (!db || !currentUser) return;
    stopAdminSubscriptions();
    adminAdsUnsubscribe = db.collection('ads').onSnapshot((snapshot) => {
      allManagedAds = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      renderAdminManager();
    }, (error) => { console.error(error); setMessage('adminAuthMessage', 'تعذر تحميل لوحة الإعلانات؛ تحقق من قواعد Firestore.', true); });
    adminPromosUnsubscribe = db.collection('promos').onSnapshot((snapshot) => {
      allManagedPromos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      renderAdminManager();
    }, (error) => { console.error(error); });
  }

  function stopAdminSubscriptions() {
    adminAdsUnsubscribe?.(); adminAdsUnsubscribe = null;
    adminPromosUnsubscribe?.(); adminPromosUnsubscribe = null;
    allManagedAds = []; allManagedPromos = [];
    renderAdminManager();
  }

  function renderAdminManager() {
    const list = $('adminItems');
    if (!list) return;
    if (!currentUser) { list.innerHTML = ''; return; }
    const adRows = allManagedAds.map((ad) => {
      const status = ad.status || 'pending';
      const action = status === 'pending'
        ? '<button data-action="publish" data-id="' + escapeHTML(ad.id) + '" data-kind="ad" class="manage-btn publish">اعتماد ونشر</button>'
        : '<button data-action="toggle" data-id="' + escapeHTML(ad.id) + '" data-kind="ad" class="manage-btn">' + (status === 'hidden' ? 'إظهار' : 'إخفاء') + '</button>';
      return '<div class="manage-row"><div><strong>' + escapeHTML(ad.title || 'إعلان بدون عنوان') + '</strong><small>إعلان ' + escapeHTML(statusLabel(status)) + (ad.city ? ' • ' + escapeHTML(ad.city) : '') + '</small></div><div class="manage-actions">' + action + '<button data-action="edit" data-id="' + escapeHTML(ad.id) + '" data-kind="ad" class="manage-btn">تعديل</button><button data-action="delete" data-id="' + escapeHTML(ad.id) + '" data-kind="ad" class="manage-btn danger">حذف</button></div></div>';
    }).join('');
    const promoRows = allManagedPromos.map((promo) => '<div class="manage-row"><div><strong>' + escapeHTML(promo.title || 'دعاية بدون عنوان') + '</strong><small>دعاية مميزة ' + (promo.visible ? 'ظاهرة' : 'مخفية') + (promo.type ? ' • ' + escapeHTML(promo.type) : '') + '</small></div><div class="manage-actions"><button data-action="toggle" data-id="' + escapeHTML(promo.id) + '" data-kind="promo" class="manage-btn">' + (promo.visible ? 'إخفاء' : 'إظهار') + '</button><button data-action="edit" data-id="' + escapeHTML(promo.id) + '" data-kind="promo" class="manage-btn">تعديل</button><button data-action="delete" data-id="' + escapeHTML(promo.id) + '" data-kind="promo" class="manage-btn danger">حذف</button></div></div>').join('');
    list.innerHTML = '<h4>طلبات الإعلانات ومحتوى الموقع</h4>' + (adRows || '<p class="manage-empty">لا توجد إعلانات أو طلبات حتى الآن.</p>') + '<h4>الدعايات المميزة</h4>' + (promoRows || '<p class="manage-empty">لا توجد دعايات مميزة.</p>');
    list.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => manageItem(button.dataset.kind, button.dataset.action, button.dataset.id)));
  }

  function statusLabel(status) {
    return ({ pending: 'بانتظار المراجعة', published: 'منشور', hidden: 'مخفي' })[status] || status;
  }

  async function manageItem(kind, action, id) {
    if (!currentUser || !db) return;
    const collection = kind === 'promo' ? 'promos' : 'ads';
    const doc = db.collection(collection).doc(id);
    const item = (kind === 'promo' ? allManagedPromos : allManagedAds).find((entry) => entry.id === id);
    if (!item) return;
    try {
      if (action === 'delete') {
        if (!window.confirm('هل تريد حذف هذا المحتوى نهائياً؟')) return;
        await doc.delete();
        if (kind === 'promo' && item.storagePath) storage.ref(item.storagePath).delete().catch(() => {});
        toast('تم حذف المحتوى.');
      } else if (action === 'toggle') {
        const patch = kind === 'promo'
          ? { visible: !item.visible }
          : { status: item.status === 'hidden' ? 'published' : 'hidden' };
        await doc.update(patch);
        toast(kind === 'promo' ? (patch.visible ? 'تم إظهار الدعاية.' : 'تم إخفاء الدعاية.') : (patch.status === 'published' ? 'تم إظهار الإعلان.' : 'تم إخفاء الإعلان.'));
      } else if (action === 'publish') {
        await doc.update({ status: 'published', reviewedAt: firebase.firestore.FieldValue.serverTimestamp() });
        toast('تم اعتماد الإعلان ونشره للزوار.');
      } else if (action === 'edit') {
        const title = window.prompt('عنوان الإعلان:', item.title || '');
        if (title === null) return;
        const details = window.prompt('التفاصيل أو الوصف:', item.details || item.desc || '');
        if (details === null) return;
        const patch = kind === 'promo' ? { title: title.trim(), desc: details.trim() } : { title: title.trim(), details: details.trim() };
        await doc.update(patch);
        toast('تم حفظ التعديلات.');
      }
    } catch (error) {
      console.error(error);
      toast('تعذر تنفيذ العملية. تحقق من قواعد Firebase.', '⚠️');
    }
  }

  $('newAdForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!db) return toast('النشر العام غير مفعّل بعد؛ أرسل الإعلان مع الصور عبر واتساب الإدارة.', '⚠️');
    const data = {
      title: $('adTitle').value.trim(),
      category: $('adCategory').value,
      city: $('adCity').value.trim(),
      price: $('adPrice').value.trim() || 'السعر عند التواصل',
      author: $('adAuthor').value.trim(),
      phone: $('adPhone').value.trim(),
      whatsapp: $('adWhatsapp').value.trim() || $('adPhone').value.trim(),
      details: $('adDetails').value.trim()
    };
    if (Object.values(data).some((v) => !v)) return toast('أكمل الحقول المطلوبة أولاً.', '⚠️');
    if (data.title.length > 120 || data.details.length > 1500 || data.city.length > 80) return toast('بعض الحقول أطول من الحد المسموح.', '⚠️');
    try {
      await db.collection('ads').add({
        ...data, status: 'pending', mediaType: '', mediaUrl: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      $('newAdForm').reset();
      closeModal(addAdModal);
      toast('وصل إعلانك للإدارة للمراجعة، وسيظهر للزوار بعد اعتماده.', '✅');
    } catch (error) {
      console.error(error);
      toast('تعذر إرسال الإعلان. تحقق من قواعد Firestore أو أرسل التفاصيل عبر واتساب.', '⚠️');
    }
  });

  $('promoAdForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser || !db || !storage) return toast('سجّل الدخول بحساب الإدارة أولاً.', '⚠️');
    const file = $('promoMediaFile').files?.[0];
    if (!file) return toast('اختر صورة أو فيديو للدعاية المميزة.', '⚠️');
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    const maxBytes = isVideo ? 30 * 1024 * 1024 : 8 * 1024 * 1024;
    if ((!isVideo && !isImage) || file.size > maxBytes) return toast(isVideo ? 'الفيديو يجب أن يكون أقل من 30 ميغابايت.' : 'اختر صورة صالحة لا تتجاوز 8 ميغابايت.', '⚠️');
    const title = $('promoTitle').value.trim();
    const desc = $('promoDesc').value.trim();
    const badge = $('promoBadge').value.trim() || '🔥 إعلان مميز';
    const link = safeUrl($('promoLink').value.trim());
    const bg = $('promoColor').value;
    const storagePath = 'promos/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const submit = $('promoSubmitBtn');
    submit.disabled = true;
    submit.textContent = 'جارٍ رفع الوسائط...';
    try {
      const ref = storage.ref(storagePath);
      await ref.put(file, { contentType: file.type });
      const mediaUrl = await ref.getDownloadURL();
      await db.collection('promos').add({
        title, desc, badge, link, bg, mediaUrl, storagePath,
        type: isVideo ? 'video' : 'image', visible: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      $('promoAdForm').reset();
      closeModal(adminModal);
      toast('تم رفع الدعاية ونشرها في قسم المميز.');
    } catch (error) {
      console.error(error);
      toast('تعذر رفع الدعاية. راجع قواعد Firebase وسعة التخزين.', '⚠️');
    } finally {
      submit.disabled = false;
      submit.textContent = '✨ رفع ونشر الدعاية المميزة';
    }
  });

  function selectCategory(category) {
    activeCategory = category || '';
    document.querySelectorAll('.chip').forEach((chip) => chip.classList.toggle('active', (chip.dataset.cat || '') === activeCategory));
    document.querySelectorAll('.cat-card').forEach((card) => card.classList.toggle('active', (card.dataset.cat || '') === activeCategory));
    renderAds();
  }

  document.querySelectorAll('[data-cat]').forEach((button) => button.addEventListener('click', () => selectCategory(button.dataset.cat || '')));
  $('searchInput')?.addEventListener('input', (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    renderAds();
  });

  $('navHomeBtn')?.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); selectCategory(''); });
  $('navCarsBtn')?.addEventListener('click', () => { selectCategory('العربات'); $('ads')?.scrollIntoView({ behavior: 'smooth' }); });
  $('navPropsBtn')?.addEventListener('click', () => { selectCategory('العقارات'); $('ads')?.scrollIntoView({ behavior: 'smooth' }); });
  $('navContactBtn')?.addEventListener('click', () => document.querySelector('.contact-card-section')?.scrollIntoView({ behavior: 'smooth' }));

  const initialSearch = new URLSearchParams(window.location.search).get('q');
  if (initialSearch) {
    $('searchInput').value = initialSearch;
    searchTerm = initialSearch.toLowerCase();
  }

  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    const banner = $('pwaInstallBanner');
    if (banner) banner.style.display = 'flex';
  });
  async function triggerPwaInstall() {
    if (!deferredPrompt) return toast('لتثبيت الموقع: افتح خيارات المتصفح واختر «إضافة إلى الشاشة الرئيسية».', '📲');
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') toast('تم طلب تثبيت الموقع على الشاشة الرئيسية.', '🎉');
    deferredPrompt = null;
  }
  $('installPwaBtn')?.addEventListener('click', triggerPwaInstall);
  $('pwaBannerInstallBtn')?.addEventListener('click', triggerPwaInstall);
  $('pwaBannerDismissBtn')?.addEventListener('click', () => { if ($('pwaInstallBanner')) $('pwaInstallBanner').style.display = 'none'; });

  subscribePublicData();
})();
