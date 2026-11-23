// Main Application Logic for DigiCreative
(function () {
  const VALID_PAGES = [
    'beranda',
    'social-media',
    'web-development',
    'graphic-design',
    'kelas-campus',
    'in-house-training',
    'digi-potrait',
    'profil-perusahaan',
    'artikel',
    'kontak'
  ];

  const SERVICE_PAGES = [
    'social-media',
    'web-development',
    'graphic-design',
    'kelas-campus',
    'in-house-training',
    'digi-potrait'
  ];

  const pageCache = {};

  function runPageInitializers(pageId) {
    if (pageId === 'artikel') {
      window.renderArticles('Semua');
    } else if (pageId === 'graphic-design') {
      window.renderDesignPortfolio('Semua Karya');
    } else if (pageId === 'profil-perusahaan') {
      window.renderTeamMembers();
    }
  }

  // --- Navigation & Routing ---
  window.navigateTo = async function (pageId, updateHash = true) {
    if (!VALID_PAGES.includes(pageId)) {
      pageId = 'beranda';
    }

    const container = document.getElementById('app-content');
    if (container) {
      try {
        if (!pageCache[pageId]) {
          const res = await fetch(`pages/${pageId}.html`);
          if (!res.ok) throw new Error(`Gagal memuat halaman ${pageId}`);
          pageCache[pageId] = await res.text();
        }
        container.innerHTML = `<section id="page-${pageId}" class="page-view active">${pageCache[pageId]}</section>`;
        runPageInitializers(pageId);
      } catch (err) {
        container.innerHTML = `<div class="max-w-xl mx-auto py-24 px-4 text-center"><h2 class="text-xl font-bold text-slate-900 mb-2">Halaman gagal dimuat</h2><p class="text-sm text-slate-500">Pastikan Anda membuka website melalui server lokal (contoh: <code>http://localhost:8080</code>).</p></div>`;
      }
    }

    // Update desktop nav active states
    document.querySelectorAll('[data-nav]').forEach((link) => {
      link.classList.remove('active');
      const navKey = link.getAttribute('data-nav');
      if (navKey === pageId) {
        link.classList.add('active');
      } else if (navKey === 'layanan' && SERVICE_PAGES.includes(pageId)) {
        link.classList.add('active');
      }
    });

    // Update dropdown item highlights
    document.querySelectorAll('[data-dropdown-page]').forEach((item) => {
      if (item.getAttribute('data-dropdown-page') === pageId) {
        item.classList.add('bg-indigo-50', 'text-indigo-700', 'font-semibold');
      } else {
        item.classList.remove('bg-indigo-50', 'text-indigo-700', 'font-semibold');
      }
    });

    // Close mobile menu & dropdown if open
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      mobileMenu.classList.add('hidden');
    }

    if (updateHash) {
      window.location.hash = pageId;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.scrollToSection = async function (pageId, sectionId) {
    await window.navigateTo(pageId);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // --- Toast Notification ---
  window.showToast = function (title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const bg = type === 'error' ? 'bg-rose-600' : 'bg-slate-900';
    const icon =
      type === 'error'
        ? '<svg class="w-5 h-5 text-rose-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        : '<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

    const toast = document.createElement('div');
    toast.className = `${bg} text-white px-4 py-3.5 rounded-xl shadow-2xl border border-white/10 flex items-start gap-3 max-w-sm transform transition-all duration-300 translate-y-2 opacity-0`;
    toast.innerHTML = `
      <div class="mt-0.5 shrink-0">${icon}</div>
      <div class="flex-1 text-sm">
        <p class="font-bold leading-snug">${title}</p>
        <p class="text-slate-300 text-xs mt-0.5 leading-relaxed">${message}</p>
      </div>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 4200);
  };

  // --- Dynamic Rendering: Articles ---
  let currentArticleFilter = 'Semua';

  window.renderArticles = function (filter = 'Semua') {
    currentArticleFilter = filter;
    const grid = document.getElementById('articles-grid');
    if (!grid || !window.DIGI_DATA) return;

    // Update filter buttons
    document.querySelectorAll('[data-article-filter]').forEach((btn) => {
      const key = btn.getAttribute('data-article-filter');
      if (key === filter) {
        btn.className =
          'px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-sm transition cursor-pointer';
      } else {
        btn.className =
          'px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer';
      }
    });

    const items = window.DIGI_DATA.articles.filter((a) => {
      if (a.featured) return false;
      if (filter === 'Semua') return true;
      return a.filterKey === filter;
    });

    grid.innerHTML = items
      .map(
        (article) => `
      <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="service-card bg-white rounded-2xl overflow-hidden flex flex-col cursor-pointer group">
        <div class="relative h-48 overflow-hidden bg-slate-100">
          <img src="${article.image}" alt="${article.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
          <span class="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-600 text-white shadow-md">${article.category}</span>
        </div>
        <div class="p-5 flex-1 flex flex-col">
          <div class="flex items-center gap-2 text-xs text-slate-500 mb-2.5">
            <span>${article.source}</span>
            <span>•</span>
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              ${article.readTime}
            </span>
          </div>
          <h3 class="text-base font-bold text-slate-900 leading-snug mb-2 group-hover:text-indigo-700 transition">${article.title}</h3>
          <p class="text-xs text-slate-500 leading-relaxed mb-4 flex-1">${article.excerpt}</p>
          <div class="pt-3.5 border-t border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center">${article.author.initials}</div>
              <span class="text-xs font-semibold text-slate-700">${article.author.name}</span>
            </div>
            <span class="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 flex items-center justify-center transition" title="Buka artikel di ${article.source}">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17L17 7M17 7H7M17 7v10"/></svg>
            </span>
          </div>
        </div>
      </a>
    `
      )
      .join('');
  };

  window.openArticleModal = function (articleId) {
    const article = window.DIGI_DATA.articles.find((a) => a.id === articleId);
    if (!article) return;

    const modal = document.getElementById('article-modal');
    document.getElementById('modal-article-category').textContent = article.category;
    document.getElementById('modal-article-meta').textContent = `${article.date} • Waktu baca: ${article.readTime}`;
    document.getElementById('modal-article-title').textContent = article.title;
    document.getElementById('modal-article-image').src = article.image;
    document.getElementById('modal-article-author').textContent = `${article.author.name} — ${article.author.role}`;
    document.getElementById('modal-article-initials').textContent = article.author.initials;
    document.getElementById('modal-article-body').innerHTML = article.content;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };

  window.closeArticleModal = function () {
    const modal = document.getElementById('article-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  };

  // --- Dynamic Rendering: Graphic Design Portfolio ---
  window.renderDesignPortfolio = function (category = 'Semua Karya') {
    const grid = document.getElementById('design-portfolio-grid');
    if (!grid || !window.DIGI_DATA) return;

    document.querySelectorAll('[data-design-filter]').forEach((btn) => {
      const key = btn.getAttribute('data-design-filter');
      if (key === category) {
        btn.className =
          'px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-sm transition cursor-pointer';
      } else {
        btn.className =
          'px-4 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition cursor-pointer';
      }
    });

    const items = window.DIGI_DATA.designPortfolio.filter(
      (item) => category === 'Semua Karya' || item.category === category
    );

    grid.innerHTML = items
      .map(
        (item) => `
      <div class="service-card bg-white rounded-2xl p-6 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <span class="px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider uppercase ${
              item.darkTheme ? 'bg-yellow-400 text-slate-900' : 'bg-indigo-100 text-indigo-700'
            }">${item.badge}</span>
            <span class="text-xs text-slate-400 font-medium">${item.year}</span>
          </div>
          <div class="rounded-xl p-6 mb-4 ${
            item.darkTheme ? 'bg-slate-900 text-white' : 'bg-indigo-50/70 border border-indigo-100 text-slate-900'
          }">
            <div class="w-10 h-10 rounded-lg ${item.accentColor} font-extrabold flex items-center justify-center text-lg mb-4 shadow-sm">${item.code}</div>
            <h4 class="text-lg font-bold mb-1.5">${item.title}</h4>
            <p class="text-xs ${item.darkTheme ? 'text-slate-300' : 'text-slate-600'} leading-relaxed">${item.subtitle}</p>
          </div>
        </div>
        <div class="flex items-center justify-between pt-2">
          <span class="text-xs font-semibold text-slate-600">${item.result}</span>
          <button onclick="openBookingModal('Graphic Design — ${item.title}', 'Konsultasi Portfolio')" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer">
            Tanya Proyek Ini →
          </button>
        </div>
      </div>
    `
      )
      .join('');
  };

  // --- Dynamic Rendering: Team Members (Profil Perusahaan) ---
  window.renderTeamMembers = function () {
    const grid = document.getElementById('team-members-grid');
    if (!grid || !window.DIGI_DATA) return;

    grid.innerHTML = window.DIGI_DATA.teamMembers
      .map(
        (member) => `
      <div class="service-card bg-white rounded-2xl overflow-hidden group">
        <div class="relative h-56 bg-slate-100 overflow-hidden">
          <img src="${member.image}" alt="${member.name}" class="w-full h-full object-cover object-top group-hover:scale-105 transition duration-500" loading="lazy" />
          <span class="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-600/95 text-white backdrop-blur-sm shadow">${member.role}</span>
        </div>
        <div class="p-4">
          <h4 class="font-bold text-slate-900 text-sm">${member.name}</h4>
          <p class="text-xs text-indigo-600 font-medium mt-0.5">${member.specialty}</p>
        </div>
      </div>
    `
      )
      .join('');
  };

  // --- Booking / Package Modal ---
  window.openBookingModal = function (serviceName, packagePrice = '') {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;
    document.getElementById('booking-service-input').value = serviceName;
    document.getElementById('booking-package-badge').textContent = packagePrice
      ? `${serviceName} (${packagePrice})`
      : serviceName;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };

  window.closeBookingModal = function () {
    const modal = document.getElementById('booking-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  };

  window.handleBookingSubmit = function (event) {
    event.preventDefault();
    const form = event.target;
    const name = form.querySelector('[name="name"]').value.trim();
    const phone = form.querySelector('[name="phone"]').value.trim();
    const service = form.querySelector('[name="service"]').value.trim();
    const notes = form.querySelector('[name="notes"]').value.trim();

    if (!name || !phone) {
      window.showToast('Data Belum Lengkap', 'Mohon isi nama lengkap dan nomor WhatsApp aktif Anda.', 'error');
      return;
    }

    const msg = `Halo Tim DigiCreative! Saya *${name}* tertarik untuk konsultasi layanan *${service}*.${
      notes ? `\nCatatan: ${notes}` : ''
    }\nNomor WA saya: ${phone}`;
    const waUrl = `https://wa.me/${window.DIGI_DATA.whatsappNumber}?text=${encodeURIComponent(msg)}`;

    // Save lead to PHP Backend (graceful fallback if backend unavailable)
    fetch('api/leads.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_page: 'booking_modal',
        full_name: name,
        phone,
        notes: `${service}${notes ? ' | ' + notes : ''}`
      })
    }).catch(() => {});

    window.closeBookingModal();
    form.reset();
    window.showToast(
      'Permintaan Terkirim!',
      `Terima kasih ${name}, data tersimpan & tim konsultan kami siap menghubungi Anda.`
    );
    setTimeout(() => {
      window.open(waUrl, '_blank', 'noopener');
    }, 650);
  };

  // --- Generic Form Handlers (Home, In-House, Campus, Portrait, Kontak) ---
  window.handleLeadFormSubmit = function (event, sourceLabel) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const entries = [];
    let primaryName = 'Klien';
    let primaryPhone = '';
    let organization = '';

    for (const [key, val] of formData.entries()) {
      const cleanVal = String(val).trim();
      if (cleanVal) {
        const lower = key.toLowerCase();
        if (lower.includes('nama')) primaryName = cleanVal;
        if (lower.includes('whatsapp') || lower.includes('hp') || lower.includes('tel')) primaryPhone = cleanVal;
        if (lower.includes('kampus') || lower.includes('perusahaan')) organization = cleanVal;
        entries.push(`${key}: ${cleanVal}`);
      }
    }

    if (entries.length < 2) {
      window.showToast('Form Belum Lengkap', 'Mohon lengkapi data yang diperlukan sebelum mengirim.', 'error');
      return;
    }

    const sourceMap = {
      'Beranda - Kirim Rencana Bisnismu': 'beranda',
      'In-House Training': 'in_house_training',
      'Kelas DiGi Goes to Campus': 'kelas_campus',
      'DiGi Potrait Booking': 'digi_potrait',
      'Halaman Kontak': 'kontak'
    };

    // Persist lead to PHP + MySQL Backend
    fetch('api/leads.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_page: sourceMap[sourceLabel] || 'beranda',
        full_name: primaryName,
        phone: primaryPhone || '-',
        organization_name: organization || null,
        notes: entries.join(' | ')
      })
    }).catch(() => {});

    const waText = `Halo DigiCreative! Saya mengirim rencana dari *${sourceLabel}*:\n\n${entries.join('\n')}`;
    const waUrl = `https://wa.me/${window.DIGI_DATA.whatsappNumber}?text=${encodeURIComponent(waText)}`;

    form.reset();
    window.showToast(
      'Rencana Berhasil Dikirim!',
      `Halo ${primaryName}, konsultan DigiCreative akan merespons dalam < 15 menit.`
    );
    setTimeout(() => {
      window.open(waUrl, '_blank', 'noopener');
    }, 700);
  };

  // --- Interactive Accordion on Social Media Page ---
  window.toggleAccordion = function (btn) {
    const content = btn.nextElementSibling;
    const icon = btn.querySelector('.accordion-icon');
    const isHidden = content.classList.contains('hidden');

    if (isHidden) {
      content.classList.remove('hidden');
      if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
      content.classList.add('hidden');
      if (icon) icon.style.transform = 'rotate(0deg)';
    }
  };

  // --- Mobile Menu Toggle ---
  window.toggleMobileMenu = function () {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.classList.toggle('hidden');
  };

  window.toggleMobileServices = function () {
    const sub = document.getElementById('mobile-services-sub');
    if (sub) sub.classList.toggle('hidden');
  };

  // --- Hydrate Catalog from PHP + MySQL Backend if Available ---
  async function syncCatalogFromPhp() {
    try {
      const res = await fetch('api/catalog.php');
      if (!res.ok) return;
      const json = await res.json();
      if (json?.ok && json.data && window.DIGI_DATA) {
        if (json.data.packages?.length) window.DIGI_DATA.packages = json.data.packages;
        if (json.data.articles?.length) window.DIGI_DATA.articles = json.data.articles;
        if (json.data.designPortfolio?.length) window.DIGI_DATA.designPortfolio = json.data.designPortfolio;
        if (json.data.teamMembers?.length) window.DIGI_DATA.teamMembers = json.data.teamMembers;
      }
    } catch {
      // Fallback seamlessly to static js/data.js
    }
  }

  // --- Init on DOM Ready ---
  document.addEventListener('DOMContentLoaded', async () => {
    await syncCatalogFromPhp();

    // Check URL hash on load
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && VALID_PAGES.includes(initialHash)) {
      window.navigateTo(initialHash, false);
    } else {
      window.navigateTo('beranda', false);
    }

    // Listen to browser back/forward
    window.addEventListener('hashchange', () => {
      const hashPage = window.location.hash.replace('#', '');
      if (hashPage && VALID_PAGES.includes(hashPage)) {
        window.navigateTo(hashPage, false);
      }
    });
  });
})();
