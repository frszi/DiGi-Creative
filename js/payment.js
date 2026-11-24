// User-Friendly Single-Column Payment Gateway Module for DigiCreative
(function () {
  const STORAGE_KEY = 'digicreative_transactions_v1';
  const PROMO_CODES = {
    DIGI10: { type: 'percent', value: 10, label: 'Diskon 10%' },
    KELASDIGI: { type: 'fixed', value: 250000, label: 'Potongan Rp 250rb' }
  };

  let state = {
    step: 1, // 1: Data, 2: Metode, 3: Instruksi Bayar, 4: Sukses, 'history': Riwayat
    selectedPackageId: 'sm-growth',
    showPackagePicker: false,
    showPromoInput: false,
    selectedServiceTab: 'Social Media',
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

    const fee = state.step >= 2 && state.methodGroup !== 'qris' ? 4500 : 0;
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
    const el = document.getElementById('pg-step-indicator');
    if (!el) return;

    if (state.step === 'history') {
      el.innerHTML = '';
      return;
    }

    const steps = [
      { num: 1, label: 'Data Diri' },
      { num: 2, label: 'Metode Bayar' },
      { num: 3, label: 'Selesai' }
    ];
    const currentNormalized = state.step >= 3 ? 3 : state.step;

    el.innerHTML = `
      <div class="grid grid-cols-3 gap-2">
        ${steps
          .map((s) => {
            const isActive = currentNormalized === s.num;
            const isDone = currentNormalized > s.num || state.step === 4;
            return `
              <div class="flex flex-col gap-1.5">
                <div class="h-1.5 rounded-full transition-all ${
                  isDone ? 'bg-emerald-500' : isActive ? 'bg-indigo-600' : 'bg-slate-100'
                }"></div>
                <span class="text-[11px] font-bold ${
                  isDone ? 'text-emerald-600' : isActive ? 'text-indigo-600' : 'text-slate-400'
                }">${s.num}. ${s.label}</span>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function renderSummaryBox() {
    const box = document.getElementById('pg-summary-box');
    if (!box) return;

    if (state.step === 4 || state.step === 'history') {
      box.innerHTML = '';
      return;
    }

    const pkg = getSelectedPackage();
    if (!pkg) return;
    const { discount, fee, total, promo } = calculateTotals();
    const services = [...new Set(getPackages().map((p) => p.service))];
    const filteredPackages = getPackages().filter((p) => p.service === state.selectedServiceTab);

    box.innerHTML = `
      <div class="rounded-2xl bg-indigo-50/70 border border-indigo-100 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <span class="inline-block px-2 py-0.5 rounded-md bg-white text-indigo-600 text-[10px] font-extrabold uppercase tracking-wider mb-1 shadow-2xs">${pkg.service}</span>
            <h4 class="text-sm font-extrabold text-slate-900 leading-snug">${pkg.name}</h4>
            ${
              state.step === 1
                ? `<button type="button" onclick="PaymentGateway.togglePackagePicker()" class="mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                    ${state.showPackagePicker ? 'Tutup Pilihan Paket ▲' : 'Ganti Paket ▾'}
                  </button>`
                : ''
            }
          </div>
          <div class="text-right shrink-0">
            <p class="text-[10px] font-semibold text-slate-500 uppercase">Total Tagihan</p>
            <p class="text-lg font-extrabold text-indigo-700">${formatRupiah(total)}</p>
            ${
              discount > 0
                ? `<span class="inline-block text-[10px] font-bold text-emerald-600">Hemat ${formatRupiah(discount)} (${promo.label})</span>`
                : fee > 0
                ? `<span class="inline-block text-[10px] text-slate-400">Termasuk admin Rp 4.500</span>`
                : ''
            }
          </div>
        </div>

        ${
          state.step === 1 && state.showPackagePicker
            ? `
          <div class="mt-4 pt-3.5 border-t border-indigo-100">
            <div class="flex gap-1.5 overflow-x-auto pb-2 mb-2.5">
              ${services
                .map(
                  (srv) => `
                <button type="button" onclick="PaymentGateway.selectServiceTab('${srv}')" class="px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                    state.selectedServiceTab === srv
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-indigo-100'
                  }">${srv}</button>
              `
                )
                .join('')}
            </div>
            <div class="space-y-1.5">
              ${filteredPackages
                .map(
                  (item) => `
                <button type="button" onclick="PaymentGateway.selectPackage('${item.id}')" class="w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                    item.id === state.selectedPackageId
                      ? 'bg-white border-indigo-600 ring-1 ring-indigo-600'
                      : 'bg-white/70 border-slate-200 hover:bg-white'
                  }">
                  <span class="text-xs font-bold text-slate-800">${item.name}</span>
                  <span class="text-xs font-extrabold text-indigo-600">${formatRupiah(item.price)}</span>
                </button>
              `
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }
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
      if (remaining <= 0) clearInterval(state.countdownInterval);
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

    // STEP 1: Clean Customer Info
    if (state.step === 1) {
      body.innerHTML = `
        <form id="pg-step1-form" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">Nama Lengkap</label>
            <input type="text" id="pg-name" required value="${state.customer.name}" placeholder="Masukkan nama lengkap Anda" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Nomor WhatsApp</label>
              <input type="tel" id="pg-phone" required value="${state.customer.phone}" placeholder="0812xxxxxxxx" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Alamat Email</label>
              <input type="email" id="pg-email" required value="${state.customer.email}" placeholder="nama@email.com" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
            </div>
          </div>

          <!-- Clean Collapsible Promo -->
          <div>
            ${
              !state.showPromoInput && !state.promoCode
                ? `<button type="button" onclick="PaymentGateway.togglePromo()" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                    🏷️ Punya kode promo? Klik di sini
                  </button>`
                : `<div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="text-[11px] font-bold text-slate-600">Kode Promo</span>
                      <span class="text-[10px] text-slate-400">Contoh: DIGI10 / KELASDIGI</span>
                    </div>
                    <div class="flex gap-2">
                      <input type="text" id="pg-promo-input" value="${state.promoCode}" placeholder="Ketik kode promo" class="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs uppercase font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                      <button type="button" onclick="PaymentGateway.applyPromo()" class="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer">Pakai</button>
                    </div>
                  </div>`
            }
          </div>

          <button type="submit" class="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition cursor-pointer">
            Lanjut Pilih Pembayaran →
          </button>
        </form>
      `;

      document.getElementById('pg-step1-form').onsubmit = (e) => {
        e.preventDefault();
        state.customer.name = document.getElementById('pg-name').value.trim();
        state.customer.phone = document.getElementById('pg-phone').value.trim();
        state.customer.email = document.getElementById('pg-email').value.trim();
        state.showPackagePicker = false;
        state.step = 2;
        renderBody();
      };
    }

    // STEP 2: Clean Accordion Payment Methods
    else if (state.step === 2) {
      const groups = [
        {
          id: 'qris',
          icon: '⚡',
          title: 'QRIS Instan',
          subtitle: 'GoPay, OVO, DANA, ShopeePay, M-Banking',
          badge: 'Bebas Admin',
          options: ['QRIS All-Payment']
        },
        {
          id: 'va',
          icon: '🏦',
          title: 'Transfer Virtual Account',
          subtitle: 'BCA, Mandiri, BNI, BRI (Otomatis)',
          badge: '',
          options: ['BCA Virtual Account', 'Mandiri Virtual Account', 'BNI Virtual Account', 'BRI Virtual Account']
        },
        {
          id: 'ewallet',
          icon: '📱',
          title: 'E-Wallet',
          subtitle: 'Notifikasi bayar langsung ke aplikasi',
          badge: '',
          options: ['GoPay', 'OVO', 'DANA']
        },
        {
          id: 'card',
          icon: '💳',
          title: 'Kartu Debit / Kredit',
          subtitle: 'Visa & Mastercard',
          badge: '',
          options: ['Kartu Kredit / Debit Visa-Mastercard']
        }
      ];

      body.innerHTML = `
        <div class="space-y-3">
          ${groups
            .map((g) => {
              const selected = state.methodGroup === g.id;
              return `
                <div onclick="PaymentGateway.selectGroup('${g.id}', '${g.options[0]}')" class="rounded-2xl border p-4 transition cursor-pointer ${
                selected ? 'border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-300 bg-white'
              }">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                      <span class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-base shrink-0">${g.icon}</span>
                      <div>
                        <div class="flex items-center gap-2">
                          <p class="text-sm font-extrabold text-slate-900">${g.title}</p>
                          ${
                            g.badge
                              ? `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">${g.badge}</span>`
                              : ''
                          }
                        </div>
                        <p class="text-xs text-slate-500">${g.subtitle}</p>
                      </div>
                    </div>
                    <span class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }">
                      ${selected ? '<span class="w-2 h-2 rounded-full bg-white"></span>' : ''}
                    </span>
                  </div>

                  ${
                    selected && g.options.length > 1
                      ? `<div class="mt-3.5 pt-3 border-t border-indigo-100 grid grid-cols-2 gap-2" onclick="event.stopPropagation()">
                          ${g.options
                            .map(
                              (opt) => `
                            <button type="button" onclick="PaymentGateway.selectMethod('${g.id}', '${opt}')" class="px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                state.methodDetail === opt
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
                              }">${opt.replace(' Virtual Account', '')}</button>
                          `
                            )
                            .join('')}
                        </div>`
                      : ''
                  }

                  ${
                    selected && g.id === 'card'
                      ? `<div class="mt-3.5 pt-3 border-t border-indigo-100 grid grid-cols-2 gap-2.5" onclick="event.stopPropagation()">
                          <input type="text" placeholder="Nomor Kartu (4242 ••••)" maxlength="19" class="col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-indigo-500" />
                          <input type="text" placeholder="MM/YY" maxlength="5" class="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-indigo-500" />
                          <input type="password" placeholder="CVV" maxlength="4" class="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white outline-none focus:border-indigo-500" />
                        </div>`
                      : ''
                  }
                </div>
              `;
            })
            .join('')}

          <div class="pt-3 flex items-center gap-3">
            <button type="button" onclick="PaymentGateway.goToStep(1)" class="px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
              ← Kembali
            </button>
            <button type="button" onclick="PaymentGateway.createInvoice()" class="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition cursor-pointer">
              Buat Kode Bayar →
            </button>
          </div>
        </div>
      `;
    }

    // STEP 3: Focused Payment Instruction
    else if (state.step === 3 && state.currentInvoice) {
      const inv = state.currentInvoice;
      let instructionHtml = '';

      if (inv.methodGroup === 'qris') {
        instructionHtml = `
          <div class="text-center p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <p class="text-xs font-bold text-slate-600 mb-3">Scan kode QRIS di bawah dengan aplikasi pembayaran Anda</p>
            <div class="inline-block p-4 bg-white rounded-2xl shadow-xs border border-slate-200 mb-2.5">
              <svg class="w-40 h-40 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
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
            <p class="text-[11px] text-slate-400">PT DigiCreative Indonesia • NMID ID1026884920112</p>
          </div>
        `;
      } else if (inv.methodGroup === 'va') {
        instructionHtml = `
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <p class="text-xs font-bold text-slate-500">${inv.methodDetail}</p>
            <div class="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase">Nomor Virtual Account</p>
                <p class="text-lg font-extrabold tracking-wider text-slate-900 mt-0.5">${inv.vaNumber}</p>
              </div>
              <button type="button" onclick="PaymentGateway.copyText('${inv.vaNumber}')" class="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold cursor-pointer">
                Salin
              </button>
            </div>
          </div>
        `;
      } else {
        instructionHtml = `
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1.5">
            <p class="text-sm font-extrabold text-slate-900">${inv.methodDetail}</p>
            <p class="text-xs text-slate-500">Silakan selesaikan otorisasi pembayaran pada perangkat Anda (${inv.customer.phone}).</p>
          </div>
        `;
      }

      body.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
            <span class="font-bold text-amber-800">Batas waktu bayar</span>
            <span id="pg-countdown" class="font-extrabold text-amber-900">15:00</span>
          </div>

          ${instructionHtml}

          <button type="button" onclick="PaymentGateway.confirmPaid()" class="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg transition cursor-pointer">
            Saya Sudah Membayar ✓
          </button>
          <button type="button" onclick="PaymentGateway.goToStep(2)" class="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
            Ganti metode pembayaran
          </button>
        </div>
      `;
      startCountdown(900);
    }

    // STEP 4: Clean Receipt
    else if (state.step === 4 && state.currentInvoice) {
      const inv = state.currentInvoice;
      if (state.countdownInterval) clearInterval(state.countdownInterval);

      body.innerHTML = `
        <div class="text-center space-y-5 py-2">
          <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-extrabold mx-auto">✓</div>
          <div>
            <h3 class="text-xl font-extrabold text-slate-900">Pembayaran Berhasil!</h3>
            <p class="text-xs text-slate-500 mt-1">Bukti lunas dikirim ke <strong>${inv.customer.email}</strong></p>
          </div>

          <div class="text-left p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
            <div class="flex justify-between"><span class="text-slate-500">No. Invoice</span><span class="font-bold text-slate-900">${inv.invoiceId}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Paket</span><span class="font-bold text-slate-900 text-right">${inv.packageName}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Metode</span><span class="font-semibold text-slate-700">${inv.methodDetail}</span></div>
            <div class="pt-2 border-t border-slate-200 flex justify-between text-sm">
              <span class="font-bold text-slate-700">Total Dibayar</span>
              <span class="font-extrabold text-emerald-600">${formatRupiah(inv.total)}</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-2.5">
            <button type="button" onclick="PaymentGateway.sendPaidWhatsApp()" class="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg cursor-pointer">
              Mulai Onboarding di WhatsApp ↗
            </button>
            <button type="button" onclick="window.print()" class="px-4 py-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
              Cetak
            </button>
          </div>
        </div>
      `;
    }

    // HISTORY VIEW
    else if (state.step === 'history') {
      const list = loadTransactions();
      body.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-extrabold text-slate-900">Riwayat Transaksi</h4>
            <button type="button" onclick="PaymentGateway.goToStep(1)" class="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">← Kembali Checkout</button>
          </div>
          ${
            list.length === 0
              ? '<div class="py-10 text-center text-xs text-slate-400">Belum ada transaksi tersimpan.</div>'
              : `<div class="space-y-2.5 max-h-80 overflow-y-auto">
                  ${list
                    .map(
                      (tx) => `
                    <div class="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3">
                      <div>
                        <p class="text-[11px] font-extrabold text-slate-900">${tx.packageName}</p>
                        <p class="text-[11px] text-slate-500 mt-0.5">${tx.invoiceId} • ${formatRupiah(tx.total)}</p>
                      </div>
                      <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        tx.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }">${tx.status === 'PAID' ? 'LUNAS' : 'PENDING'}</span>
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
      const found = pkgs.find((p) => p.id === packageId);
      if (found) {
        state.selectedPackageId = found.id;
        state.selectedServiceTab = found.service;
      }
      state.step = 1;
      state.showPackagePicker = false;
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

    togglePackagePicker() {
      state.showPackagePicker = !state.showPackagePicker;
      renderSummaryBox();
    },

    selectServiceTab(srv) {
      state.selectedServiceTab = srv;
      renderSummaryBox();
    },

    selectPackage(pkgId) {
      state.selectedPackageId = pkgId;
      state.showPackagePicker = false;
      renderSummaryBox();
    },

    togglePromo() {
      state.showPromoInput = true;
      renderBody();
    },

    async applyPromo() {
      const input = document.getElementById('pg-promo-input');
      const code = (input?.value || '').trim().toUpperCase();
      if (!code) {
        state.promoCode = '';
        renderSummaryBox();
        return;
      }

      try {
        const res = await fetch(`api/promo.php?code=${encodeURIComponent(code)}`);
        const json = await res.json();
        if (res.ok && json?.ok && json.promo) {
          PROMO_CODES[json.promo.code] = {
            type: json.promo.type,
            value: json.promo.value,
            label: json.promo.label
          };
          state.promoCode = json.promo.code;
          window.showToast('Promo Aktif!', json.promo.label);
          renderSummaryBox();
          return;
        }
      } catch {
        // Fallback below
      }

      if (PROMO_CODES[code]) {
        state.promoCode = code;
        window.showToast('Promo Aktif!', PROMO_CODES[code].label);
      } else {
        window.showToast('Kode Tidak Ditemukan', 'Gunakan DIGI10 atau KELASDIGI.', 'error');
      }
      renderSummaryBox();
    },

    selectGroup(group, defaultDetail) {
      state.methodGroup = group;
      state.methodDetail = defaultDetail;
      renderBody();
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

    async showHistory() {
      try {
        const res = await fetch('api/orders.php');
        if (res.ok) {
          const json = await res.json();
          if (json?.ok && Array.isArray(json.transactions)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(json.transactions));
          }
        }
      } catch {
        // Fallback to localStorage
      }
      state.step = 'history';
      renderBody();
    },

    async createInvoice() {
      const pkg = getSelectedPackage();
      const { total } = calculateTotals();

      try {
        const res = await fetch('api/orders.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            package_id: pkg.id,
            customer_name: state.customer.name,
            customer_email: state.customer.email,
            customer_phone: state.customer.phone,
            company_name: state.customer.company,
            promo_code: state.promoCode,
            method_group: state.methodGroup,
            method_detail: state.methodDetail
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.ok && json.invoice) {
            state.currentInvoice = json.invoice;
            saveTransaction(json.invoice);
            state.step = 3;
            renderBody();
            return;
          }
        }
      } catch {
        // Fallback below
      }

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

    async confirmPaid() {
      if (!state.currentInvoice) return;
      let paidAt = new Date().toLocaleString('id-ID');

      try {
        const res = await fetch('api/payment-confirm.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoice_id: state.currentInvoice.invoiceId })
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.ok && json.paidAt) paidAt = json.paidAt;
        }
      } catch {
        // Fallback
      }

      state.currentInvoice.status = 'PAID';
      state.currentInvoice.paidAt = paidAt;
      saveTransaction(state.currentInvoice);
      state.step = 4;
      window.showToast('Pembayaran Lunas!', `Invoice ${state.currentInvoice.invoiceId} berhasil dikonfirmasi.`);
      renderBody();
    },

    copyText(text) {
      navigator.clipboard?.writeText(text);
      window.showToast('Disalin!', `Nomor ${text} berhasil disalin.`);
    },

    sendPaidWhatsApp() {
      const inv = state.currentInvoice;
      if (!inv) return;
      const msg = `Halo Tim DigiCreative! Pembayaran saya telah LUNAS:\n\nInvoice: *${inv.invoiceId}*\nPaket: *${inv.packageName}*\nTotal: *${formatRupiah(inv.total)}*\nMetode: ${inv.methodDetail}\nNama: ${inv.customer.name}\nEmail: ${inv.customer.email}\n\nMohon diproses untuk jadwal onboarding. Terima kasih!`;
      window.open(`https://wa.me/${window.DIGI_DATA.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    }
  };
})();
