// Payment Gateway Module (Midtrans/Xendit-style Checkout Simulation) for DigiCreative
(function () {
  const STORAGE_KEY = 'digicreative_transactions_v1';
  const PROMO_CODES = {
    DIGI10: { type: 'percent', value: 10, label: 'Diskon 10% Pelanggan Baru' },
    KELASDIGI: { type: 'fixed', value: 250000, label: 'Potongan Rp 250.000 Alumni' }
  };

  let state = {
    step: 1,
    selectedPackageId: 'sm-growth',
    promoCode: '',
    customer: { name: '', email: '', phone: '', company: '' },
    methodGroup: 'qris', // qris | va | ewallet | card
    methodDetail: 'QRIS All-Payment',
    currentInvoice: null,
    countdownInterval: null
  };

  function formatRupiah(num) {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  }

  function getPackages() {
    return window.DIGI_DATA?.packages || [];
  }

  function getSelectedPackage() {
    const pkgs = getPackages();
    return pkgs.find((p) => p.id === state.selectedPackageId) || pkgs[0];
  }

  function calculateTotals() {
    const pkg = getSelectedPackage();
    if (!pkg) return { subtotal: 0, discount: 0, fee: 0, total: 0 };

    const subtotal = pkg.price;
    let discount = 0;
    const promo = PROMO_CODES[state.promoCode.toUpperCase()];
    if (promo) {
      discount = promo.type === 'percent' ? Math.round((subtotal * promo.value) / 100) : promo.value;
    }

    const fee = state.methodGroup === 'qris' ? 0 : 4500;
    const total = Math.max(0, subtotal - discount + fee);
    return { subtotal, discount, fee, total, promo };
  }

  function loadTransactions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveTransaction(tx) {
    const list = loadTransactions();
    const idx = list.findIndex((item) => item.invoiceId === tx.invoiceId);
    if (idx >= 0) list[idx] = tx;
    else list.unshift(tx);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
  }

  function generateVaNumber(bank) {
    const prefixMap = {
      'BCA Virtual Account': '39010',
      'Mandiri Virtual Account': '89508',
      'BNI Virtual Account': '88080',
      'BRI Virtual Account': '26215'
    };
    const prefix = prefixMap[bank] || '88000';
    const rand = Math.floor(10000000000 + Math.random() * 89999999999);
    return prefix + String(rand).slice(0, 11);
  }

  function renderStepIndicator() {
    const steps = ['1. Paket & Data', '2. Metode Bayar', '3. Pembayaran', '4. Selesai'];
    const el = document.getElementById('pg-step-indicator');
    if (!el) return;
    el.innerHTML = steps
      .map((label, i) => {
        const num = i + 1;
        const active = state.step === num;
        const done = state.step > num;
        return `
          <div class="flex items-center gap-1.5 text-[11px] font-bold ${active ? 'text-indigo-600' : done ? 'text-emerald-600' : 'text-slate-400'
          }">
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${active
            ? 'bg-indigo-600 text-white'
            : done
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-200 text-slate-600'
          }">${done ? '✓' : num}</span>
            <span class="hidden sm:inline">${label.split('. ')[1]}</span>
          </div>
        `;
      })
      .join('<span class="text-slate-300 text-xs">›</span>');
  }

  function renderSummaryBox() {
    const pkg = getSelectedPackage();
    const { subtotal, discount, fee, total, promo } = calculateTotals();
    const box = document.getElementById('pg-summary-box');
    if (!box || !pkg) return;

    box.innerHTML = `
      <div class="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">${pkg.service}</span>
          <h4 class="text-sm font-extrabold text-slate-900">${pkg.name}</h4>
        </div>
        <span class="text-xs font-extrabold text-slate-900 shrink-0">${formatRupiah(subtotal)}</span>
      </div>
      <div class="space-y-1.5 py-3 text-xs text-slate-600 border-b border-slate-200">
        <div class="flex justify-between">
          <span>Subtotal Paket</span>
          <span>${formatRupiah(subtotal)}</span>
        </div>
        ${discount > 0
        ? `<div class="flex justify-between text-emerald-600 font-semibold">
                <span>Promo (${promo.label})</span>
                <span>-${formatRupiah(discount)}</span>
              </div>`
        : ''
      }
        <div class="flex justify-between">
          <span>Biaya Admin Gateway</span>
          <span>${fee === 0 ? '<span class="text-emerald-600 font-bold">Gratis</span>' : formatRupiah(fee)}</span>
        </div>
      </div>
      <div class="pt-3 flex items-center justify-between">
        <span class="text-xs font-bold text-slate-700">Total Pembayaran</span>
        <span class="text-lg font-extrabold text-indigo-600">${formatRupiah(total)}</span>
      </div>
    `;
  }

  function startCountdown(seconds = 900) {
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    let remaining = seconds;
    const update = () => {
      const el = document.getElementById('pg-countdown');
      if (!el) return;
      const m = String(Math.floor(remaining / 60)).padStart(2, '0');
      const s = String(remaining % 60).padStart(2, '0');
      el.textContent = `${m}:${s}`;
      if (remaining <= 0) {
        clearInterval(state.countdownInterval);
      }
      remaining--;
    };
    update();
    state.countdownInterval = setInterval(update, 1000);
  }

  function renderBody() {
    renderStepIndicator();
    renderSummaryBox();
    const body = document.getElementById('pg-step-body');
    if (!body) return;

    if (state.step === 1) {
      const pkgs = getPackages();
      body.innerHTML = `
        <form id="pg-step1-form" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Pilih Paket Layanan</label>
            <select id="pg-package-select" onchange="PaymentGateway.selectPackage(this.value)" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
              ${pkgs
          .map(
            (p) =>
              `<option value="${p.id}" ${p.id === state.selectedPackageId ? 'selected' : ''}>${p.service} — ${p.name} (${formatRupiah(p.price)})</option>`
          )
          .join('')}
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
              <input type="text" id="pg-name" required value="${state.customer.name}" placeholder="Contoh: Budi Santoso" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp *</label>
              <input type="tel" id="pg-phone" required value="${state.customer.phone}" placeholder="0812xxxxxxxx" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Email (untuk Invoice) *</label>
              <input type="email" id="pg-email" required value="${state.customer.email}" placeholder="nama@bisnis.com" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nama Brand / Perusahaan</label>
              <input type="text" id="pg-company" value="${state.customer.company}" placeholder="Opsional" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Kode Promo (Opsional: coba <span class="text-indigo-600">DIGI10</span> atau <span class="text-indigo-600">KELASDIGI</span>)</label>
            <div class="flex gap-2">
              <input type="text" id="pg-promo-input" value="${state.promoCode}" placeholder="Masukkan kode promo" class="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs uppercase focus:ring-2 focus:ring-indigo-500 outline-none" />
              <button type="button" onclick="PaymentGateway.applyPromo()" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer">Terapkan</button>
            </div>
          </div>

          <div class="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onclick="PaymentGateway.showHistory()" class="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">
              📜 Lihat Riwayat Transaksi (${loadTransactions().length})
            </button>
            <button type="submit" class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 cursor-pointer">
              Pilih Metode Pembayaran →
            </button>
          </div>
        </form>
      `;
      document.getElementById('pg-step1-form').onsubmit = (e) => {
        e.preventDefault();
        state.customer.name = document.getElementById('pg-name').value.trim();
        state.customer.phone = document.getElementById('pg-phone').value.trim();
        state.customer.email = document.getElementById('pg-email').value.trim();
        state.customer.company = document.getElementById('pg-company').value.trim();
        state.step = 2;
        renderBody();
      };
    } else if (state.step === 2) {
      const methods = [
        {
          group: 'qris',
          title: 'QRIS (Instan & Bebas Biaya Admin)',
          desc: 'Scan via GoPay, OVO, DANA, ShopeePay, BCA Mobile, Mandiri Livin',
          options: ['QRIS All-Payment']
        },
        {
          group: 'va',
          title: 'Virtual Account Bank',
          desc: 'Verifikasi otomatis 24 jam via Mobile Banking / ATM',
          options: ['BCA Virtual Account', 'Mandiri Virtual Account', 'BNI Virtual Account', 'BRI Virtual Account']
        },
        {
          group: 'ewallet',
          title: 'E-Wallet Langsung',
          desc: 'Hubungkan akun dompet digital Anda',
          options: ['GoPay', 'OVO', 'DANA']
        },
        {
          group: 'card',
          title: 'Kartu Kredit / Debit Online',
          desc: 'Visa, Mastercard, JCB (3D Secure)',
          options: ['Kartu Kredit / Debit Visa-Mastercard']
        }
      ];

      body.innerHTML = `
        <div class="space-y-3">
          <p class="text-xs font-bold text-slate-700">Pilih Channel Pembayaran Aman:</p>
          ${methods
          .map(
            (m) => `
            <div class="rounded-2xl border ${state.methodGroup === m.group ? 'border-indigo-600 bg-indigo-50/40' : 'border-slate-200 bg-white'
              } p-3.5 transition">
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs font-extrabold text-slate-900">${m.title}</p>
                ${m.group === 'qris'
                ? '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">Gratis Admin</span>'
                : ''
              }
              </div>
              <p class="text-[11px] text-slate-500 mb-2.5">${m.desc}</p>
              <div class="flex flex-wrap gap-2">
                ${m.options
                .map(
                  (opt) => `
                  <button type="button" onclick="PaymentGateway.selectMethod('${m.group}', '${opt}')" class="px-3 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${state.methodDetail === opt
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
                    }">${opt}</button>
                `
                )
                .join('')}
              </div>
            </div>
          `
          )
          .join('')}

          ${state.methodGroup === 'card'
          ? `<div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2.5">
                  <div class="col-span-2">
                    <label class="block text-[11px] font-bold text-slate-600 mb-1">Nomor Kartu</label>
                    <input type="text" id="pg-card-num" placeholder="4242 •••• •••• 4242" maxlength="19" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 mb-1">Exp (MM/YY)</label>
                    <input type="text" placeholder="12/28" maxlength="5" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white" />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-600 mb-1">CVV</label>
                    <input type="password" placeholder="123" maxlength="4" class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white" />
                  </div>
                </div>`
          : ''
        }

          <div class="pt-3 flex items-center justify-between gap-3">
            <button type="button" onclick="PaymentGateway.goToStep(1)" class="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">← Kembali</button>
            <button type="button" onclick="PaymentGateway.createInvoice()" class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 cursor-pointer">
              Bayar Sekarang 🔒
            </button>
          </div>
        </div>
      `;
    } else if (state.step === 3 && state.currentInvoice) {
      const inv = state.currentInvoice;
      let instructionHtml = '';

      if (inv.methodGroup === 'qris') {
        instructionHtml = `
          <div class="text-center p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <p class="text-xs font-extrabold text-slate-900 mb-1">Scan QRIS DigiCreative</p>
            <p class="text-[11px] text-slate-500 mb-3">Gunakan aplikasi e-wallet atau m-banking apa saja</p>
            <div class="inline-block p-3 bg-white rounded-2xl shadow-sm border border-slate-200 mb-3">
              <svg class="w-36 h-36 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                <rect x="5" y="5" width="28" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="5"/>
                <rect x="13" y="13" width="12" height="12"/>
                <rect x="67" y="5" width="28" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="5"/>
                <rect x="75" y="13" width="12" height="12"/>
                <rect x="5" y="67" width="28" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="5"/>
                <rect x="13" y="75" width="12" height="12"/>
                <rect x="42" y="8" width="8" height="8"/><rect x="52" y="18" width="8" height="8"/>
                <rect x="42" y="38" width="16" height="16" rx="2" fill="#4338ca"/>
                <rect x="10" y="42" width="10" height="8"/><rect x="24" y="48" width="10" height="10"/>
                <rect x="65" y="42" width="10" height="10"/><rect x="82" y="45" width="10" height="12"/>
                <rect x="44" y="64" width="10" height="10"/><rect x="60" y="68" width="14" height="8"/>
                <rect x="78" y="64" width="14" height="14"/><rect x="42" y="82" width="18" height="10"/>
                <rect x="68" y="84" width="12" height="8"/>
              </svg>
            </div>
            <p class="text-[11px] text-slate-500">NMID: ID1026884920112 • PT DigiCreative Indonesia</p>
          </div>
        `;
      } else if (inv.methodGroup === 'va') {
        instructionHtml = `
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-600">Bank Tujuan</span>
              <span class="text-xs font-extrabold text-indigo-600">${inv.methodDetail}</span>
            </div>
            <div class="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2">
              <div>
                <p class="text-[10px] text-slate-400 font-bold uppercase">Nomor Virtual Account</p>
                <p class="text-base font-extrabold tracking-wider text-slate-900">${inv.vaNumber}</p>
              </div>
              <button type="button" onclick="PaymentGateway.copyText('${inv.vaNumber}')" class="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer">Salin</button>
            </div>
            <p class="text-[11px] text-slate-500">Transfer sesuai nominal total hingga 3 digit terakhir. Pembayaran terverifikasi otomatis.</p>
          </div>
        `;
      } else {
        instructionHtml = `
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
            <p class="text-xs font-extrabold text-slate-900">${inv.methodDetail}</p>
            <p class="text-xs text-slate-600">Permintaan otorisasi pembayaran telah dikirim ke akun <strong>${inv.customer.phone}</strong>.</p>
          </div>
        `;
      }

      body.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <div>
              <p class="text-[10px] font-bold text-amber-700 uppercase">Menunggu Pembayaran • ${inv.invoiceId}</p>
              <p class="text-xs font-extrabold text-slate-900">Selesaikan sebelum batas waktu</p>
            </div>
            <span id="pg-countdown" class="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-900 font-extrabold text-xs">15:00</span>
          </div>

          ${instructionHtml}

          <div class="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button type="button" onclick="PaymentGateway.confirmPaid()" class="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg cursor-pointer">
              ✓ Simulasi Bayar Sukses / Cek Status
            </button>
            <button type="button" onclick="PaymentGateway.goToStep(2)" class="px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
              Ganti Metode
            </button>
          </div>
        </div>
      `;
      startCountdown(900);
    } else if (state.step === 4 && state.currentInvoice) {
      const inv = state.currentInvoice;
      if (state.countdownInterval) clearInterval(state.countdownInterval);

      body.innerHTML = `
        <div class="text-center space-y-4">
          <div class="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-extrabold mx-auto">✓</div>
          <div>
            <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase">PEMBAYARAN LUNAS</span>
            <h3 class="text-xl font-extrabold text-slate-900 mt-2">Terima Kasih, ${inv.customer.name}!</h3>
            <p class="text-xs text-slate-500 mt-1">Invoice <strong>${inv.invoiceId}</strong> telah terkonfirmasi dan dikirim ke ${inv.customer.email}.</p>
          </div>

          <div class="text-left p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div class="flex justify-between"><span class="text-slate-500">Paket</span><span class="font-bold text-slate-900">${inv.packageName}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Metode</span><span class="font-bold text-slate-900">${inv.methodDetail}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Total Dibayar</span><span class="font-extrabold text-emerald-600">${formatRupiah(inv.total)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Waktu Lunas</span><span class="font-semibold text-slate-700">${inv.paidAt}</span></div>
          </div>

          <div class="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button type="button" onclick="PaymentGateway.sendPaidWhatsApp()" class="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg cursor-pointer">
              Konfirmasi Onboarding via WhatsApp ↗
            </button>
            <button type="button" onclick="window.print()" class="px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
              Cetak Invoice
            </button>
          </div>
        </div>
      `;
    } else if (state.step === 'history') {
      const list = loadTransactions();
      body.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-extrabold text-slate-900">Riwayat Transaksi Anda</h4>
            <button type="button" onclick="PaymentGateway.goToStep(1)" class="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">← Buat Transaksi Baru</button>
          </div>
          ${list.length === 0
          ? '<p class="text-xs text-slate-500 py-8 text-center">Belum ada riwayat transaksi di browser ini.</p>'
          : `<div class="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  ${list
            .map(
              (tx) => `
                    <div class="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3">
                      <div>
                        <p class="text-[10px] font-bold text-slate-400">${tx.invoiceId} • ${tx.createdAt}</p>
                        <p class="text-xs font-extrabold text-slate-900">${tx.packageName}</p>
                        <p class="text-[11px] text-slate-500">${tx.methodDetail} • ${formatRupiah(tx.total)}</p>
                      </div>
                      <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold ${tx.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }">${tx.status === 'PAID' ? 'LUNAS' : 'PENDING'}</span>w
                    </div>
                  `
            )
            .join('')}
                </div>`
        }
        </div>
      `;
    }
  }

  window.PaymentGateway = {
    open(packageId = 'sm-growth') {
      const pkgs = getPackages();
      if (pkgs.some((p) => p.id === packageId)) {
        state.selectedPackageId = packageId;
      }
      state.step = 1;
      const modal = document.getElementById('payment-modal');
      if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        renderBody();
      }
    },

    close() {
      if (state.countdownInterval) clearInterval(state.countdownInterval);
      const modal = document.getElementById('payment-modal');
      if (modal) modal.classList.add('hidden');
      document.body.style.overflow = '';
    },

    selectPackage(pkgId) {
      state.selectedPackageId = pkgId;
      renderSummaryBox();
    },

    applyPromo() {
      const input = document.getElementById('pg-promo-input');
      const code = (input?.value || '').trim().toUpperCase();
      if (!code) {
        state.promoCode = '';
        renderSummaryBox();
        return;
      }
      if (PROMO_CODES[code]) {
        state.promoCode = code;
        window.showToast('Promo Diterapkan!', PROMO_CODES[code].label);
      } else {
        window.showToast('Kode Tidak Valid', 'Coba kode DIGI10 atau KELASDIGI.', 'error');
      }
      renderSummaryBox();
    },

    selectMethod(group, detail) {
      state.methodGroup = group;
      state.methodDetail = detail;
      renderBody();
    },

    goToStep(stepNum) {
      state.step = stepNum;
      renderBody();
    },

    showHistory() {
      state.step = 'history';
      renderBody();
    },

    createInvoice() {
      const pkg = getSelectedPackage();
      const { total } = calculateTotals();
      const invoiceId = 'INV-DIGI-' + String(Date.now()).slice(-6);
      const inv = {
        invoiceId,
        packageId: pkg.id,
        packageName: `${pkg.service} — ${pkg.name}`,
        customer: { ...state.customer },
        methodGroup: state.methodGroup,
        methodDetail: state.methodDetail,
        vaNumber: state.methodGroup === 'va' ? generateVaNumber(state.methodDetail) : null,
        total,
        status: 'PENDING',
        createdAt: new Date().toLocaleString('id-ID')
      };
      state.currentInvoice = inv;
      saveTransaction(inv);
      state.step = 3;
      renderBody();
    },

    confirmPaid() {
      if (!state.currentInvoice) return;
      state.currentInvoice.status = 'PAID';
      state.currentInvoice.paidAt = new Date().toLocaleString('id-ID');
      saveTransaction(state.currentInvoice);
      state.step = 4;
      window.showToast('Pembayaran Berhasil!', `Invoice ${state.currentInvoice.invoiceId} telah lunas.`);
      renderBody();
    },

    copyText(text) {
      navigator.clipboard?.writeText(text);
      window.showToast('Disalin!', `Nomor ${text} berhasil disalin ke clipboard.`);
    },

    sendPaidWhatsApp() {
      const inv = state.currentInvoice;
      if (!inv) return;
      const msg = `Halo Tim DigiCreative! Pembayaran saya telah LUNAS:\n\nInvoice: *${inv.invoiceId}*\nPaket: *${inv.packageName}*\nTotal: *${formatRupiah(inv.total)}*\nMetode: ${inv.methodDetail}\nNama: ${inv.customer.name}\nEmail: ${inv.customer.email}\n\nMohon diproses untuk jadwal onboarding. Terima kasih!`;
      window.open(`https://wa.me/${window.DIGI_DATA.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    }
  };
})();
