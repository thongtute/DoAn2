/* Tiện ích dùng chung: định dạng, ngày tháng, nhãn trạng thái, thông báo, form, DataTables. */
(function () {
  const App = window.App = window.App || {};
  const pad = n => String(n).padStart(2, '0');
  const nf = new Intl.NumberFormat('vi-VN');

  const U = App.utils = {
    pad,

    esc(s) {
      if (s === null || s === undefined) return '';
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    num(n) { return nf.format(Math.round(Number(n) || 0)); },
    money(n) { return U.num(n) + ' đ'; },

    uid(prefix) {
      return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    qs(name) { return new URLSearchParams(location.search).get(name); },

    sum(arr, fn) { return arr.reduce((s, x) => s + (Number(fn ? fn(x) : x) || 0), 0); },

    /* ---------- Ngày tháng (dạng chuỗi ISO 'YYYY-MM-DD', tháng 'YYYY-MM') ---------- */
    toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
    parse(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d || 1); },
    today() { return U.toISO(new Date()); },
    currentMonth() { return U.today().slice(0, 7); },
    monthOf(iso) { return iso ? iso.slice(0, 7) : ''; },
    addDays(iso, n) { const d = U.parse(iso); d.setDate(d.getDate() + n); return U.toISO(d); },
    addMonths(month, n) {
      const [y, m] = month.split('-').map(Number);
      const d = new Date(y, m - 1 + n, 1);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    },
    addMonthsToDate(iso, n) {
      const d = U.parse(iso);
      const day = d.getDate();
      const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
      const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
      t.setDate(Math.min(day, last));
      return U.toISO(t);
    },
    monthsBetween(from, to) { // số tháng từ 'YYYY-MM' from đến to
      const [y1, m1] = from.split('-').map(Number), [y2, m2] = to.split('-').map(Number);
      return (y2 - y1) * 12 + (m2 - m1);
    },
    daysBetween(a, b) { return Math.round((U.parse(b) - U.parse(a)) / 86400000); },
    fmtDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; },
    fmtMonth(month) { if (!month) return ''; const [y, m] = month.split('-'); return `${m}/${y}`; },
    monthRange(endMonth, n) { // n tháng kết thúc ở endMonth (tăng dần)
      const out = [];
      for (let i = n - 1; i >= 0; i--) out.push(U.addMonths(endMonth, -i));
      return out;
    },

    /* ---------- Đọc số tiền thành chữ ---------- */
    docSo(n) {
      n = Math.round(Math.abs(Number(n) || 0));
      if (n === 0) return 'Không đồng';
      const cs = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
      const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];
      const doc3 = (num, full) => {
        const tr = Math.floor(num / 100), ch = Math.floor((num % 100) / 10), dv = num % 10;
        const s = [];
        if (full || tr > 0) s.push(cs[tr] + ' trăm');
        if (ch === 0) { if (dv > 0 && (full || tr > 0)) s.push('lẻ'); }
        else if (ch === 1) s.push('mười');
        else s.push(cs[ch] + ' mươi');
        if (dv > 0) {
          if (dv === 1 && ch > 1) s.push('mốt');
          else if (dv === 5 && ch > 0) s.push('lăm');
          else s.push(cs[dv]);
        }
        return s.join(' ');
      };
      const groups = [];
      while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
      const parts = [];
      for (let i = groups.length - 1; i >= 0; i--) {
        if (groups[i] === 0) continue;
        parts.push(doc3(groups[i], i < groups.length - 1) + units[i]);
      }
      const s = parts.join(' ');
      return s.charAt(0).toUpperCase() + s.slice(1) + ' đồng';
    },

    /* ---------- QR chuyển khoản VietQR ---------- */
    qrUrl(amount, info) {
      const b = App.CaiDat.get().nganHang;
      const q = new URLSearchParams({ amount: Math.round(amount), addInfo: info || '', accountName: b.accountName || '' });
      return `https://img.vietqr.io/image/${encodeURIComponent(b.bankId)}-${encodeURIComponent(b.accountNo)}-compact2.png?${q}`;
    },
    bankName(id) { const b = App.config.banks.find(x => x.id === id); return b ? b.ten : id; },

    /* ---------- Nhãn trạng thái ---------- */
    badge(group, key) {
      const item = (App.labels[group] || {})[key];
      if (!item) return '';
      return `<span class="badge rounded-pill text-bg-${item[1]} st-badge">${item[0]}</span>`;
    },
    label(group, key) { const item = (App.labels[group] || {})[key]; return item ? (Array.isArray(item) ? item[0] : item) : key; },

    empty(msg, icon) {
      return `<div class="empty-state"><i class="bi bi-${icon || 'inbox'}"></i><p>${U.esc(msg || 'Chưa có dữ liệu')}</p></div>`;
    },

    /* ---------- Thông báo (SweetAlert2) ---------- */
    swal(opts) {
      return Swal.fire(Object.assign({
        confirmButtonColor: '#0f766e',
        cancelButtonText: 'Hủy',
        confirmButtonText: 'Đồng ý',
        reverseButtons: true
      }, opts));
    },
    toast(msg, icon) {
      Swal.fire({ toast: true, position: 'top-end', icon: icon || 'success', title: msg, showConfirmButton: false, timer: 2200, timerProgressBar: true });
    },
    err(e) {
      console.error(e);
      U.swal({ icon: 'error', title: 'Không thực hiện được', text: e && e.message ? e.message : String(e) });
    },
    async confirm(title, text, opts) {
      opts = opts || {};
      const r = await U.swal({
        icon: opts.icon || 'warning', title, text, html: opts.html,
        showCancelButton: true, confirmButtonText: opts.ok || 'Đồng ý',
        confirmButtonColor: opts.danger ? '#dc2626' : '#0f766e'
      });
      return r.isConfirmed;
    },

    /* ---------- Form ---------- */
    formData(form) {
      const o = {};
      $(form).find('[name]').each(function () {
        const n = this.name, $el = $(this);
        if (this.type === 'checkbox') {
          if ($el.data('multi') !== undefined) { o[n] = o[n] || []; if (this.checked) o[n].push(this.value); }
          else o[n] = this.checked;
          return;
        }
        if (this.type === 'radio') { if (this.checked) o[n] = this.value; return; }
        let v = $el.val();
        if (this.type === 'number') v = v === '' ? null : Number(v);
        else if (typeof v === 'string') v = v.trim();
        o[n] = v;
      });
      return o;
    },
    fillForm(form, obj) {
      const $f = $(form);
      $f[0].reset();
      $f.find('.is-invalid').removeClass('is-invalid');
      $f.find('.form-error').remove();
      Object.keys(obj || {}).forEach(k => {
        const $el = $f.find(`[name="${k}"]`);
        if (!$el.length) return;
        const v = obj[k];
        if ($el.is(':checkbox')) {
          if (Array.isArray(v)) $el.each(function () { this.checked = v.includes(this.value); });
          else $el.prop('checked', !!v);
        } else if ($el.is(':radio')) $el.each(function () { this.checked = this.value === String(v); });
        else $el.val(v === null || v === undefined ? '' : v);
      });
    },
    options(list, valueKey, textFn, selected, placeholder) {
      let html = placeholder !== undefined ? `<option value="">${U.esc(placeholder)}</option>` : '';
      list.forEach(x => {
        const v = x[valueKey];
        html += `<option value="${U.esc(v)}"${String(v) === String(selected) ? ' selected' : ''}>${U.esc(textFn(x))}</option>`;
      });
      return html;
    },

    /* ---------- DataTables ---------- */
    dtLang: {
      search: '',
      searchPlaceholder: 'Tìm kiếm...',
      lengthMenu: '_MENU_ dòng/trang',
      info: 'Hiển thị _START_–_END_ / _TOTAL_ dòng',
      infoEmpty: 'Không có dữ liệu',
      infoFiltered: '(lọc từ _MAX_ dòng)',
      zeroRecords: 'Không tìm thấy kết quả phù hợp',
      emptyTable: 'Chưa có dữ liệu',
      loadingRecords: 'Đang tải...'
    },
    dt(selector, opts) {
      return $(selector).DataTable(Object.assign({
        language: U.dtLang, pageLength: 10, order: [], autoWidth: false,
        lengthMenu: [10, 25, 50, 100]
      }, opts));
    },
    // render cột tiền: hiển thị dạng "1.500.000 đ", sắp xếp theo số
    dtMoney(d, type) { return type === 'display' ? U.money(d) : d; },
    dtDate(d, type) { return type === 'display' ? U.fmtDate(d) : d; }
  };

  /* Nhãn: [chữ hiển thị, màu bootstrap] */
  App.labels = {
    phong: { trong: ['Trống', 'secondary'], dangThue: ['Đang thuê', 'success'], baoTri: ['Bảo trì', 'dark'] },
    phongHienThi: {
      trong: ['Trống', 'secondary'], dangThue: ['Đang thuê', 'success'], no: ['Nợ quá hạn', 'danger'],
      sapHetHan: ['Sắp/hết hạn HĐ', 'warning'], baoTri: ['Bảo trì', 'dark']
    },
    hopDong: {
      hieuLuc: ['Đang hiệu lực', 'success'], sapHetHan: ['Sắp hết hạn', 'warning'],
      hetHan: ['Hết hạn', 'danger'], thanhLy: ['Đã thanh lý', 'secondary']
    },
    hoaDon: {
      chuaThu: ['Chưa thu', 'warning'], thuMotPhan: ['Thu 1 phần', 'info'],
      daThu: ['Đã thu', 'success'], quaHan: ['Quá hạn', 'danger']
    },
    baoHong: { moi: ['Mới', 'danger'], dangXuLy: ['Đang xử lý', 'warning'], xong: ['Đã xong', 'success'] },
    mucDo: { thap: ['Thấp', 'secondary'], trungBinh: ['Trung bình', 'info'], cao: ['Khẩn cấp', 'danger'] },
    phuongThuc: { tienMat: 'Tiền mặt', chuyenKhoan: 'Chuyển khoản', truCoc: 'Trừ tiền cọc' },
    role: { owner: 'Chủ trọ', staff: 'Nhân viên', tenant: 'Khách thuê' },
    cachTinhNuoc: { m3: 'Theo m³', nguoi: 'Theo người' },
    tinhTheo: { phong: '/phòng', nguoi: '/người' }
  };

  /* ---------- jQuery Validation: thông báo tiếng Việt + kiểu Bootstrap ---------- */
  if (window.jQuery && jQuery.validator) {
    jQuery.extend(jQuery.validator.messages, {
      required: 'Vui lòng nhập thông tin này.',
      email: 'Email không hợp lệ.',
      number: 'Vui lòng nhập số.',
      digits: 'Chỉ được nhập chữ số.',
      min: jQuery.validator.format('Giá trị phải lớn hơn hoặc bằng {0}.'),
      max: jQuery.validator.format('Giá trị phải nhỏ hơn hoặc bằng {0}.'),
      minlength: jQuery.validator.format('Nhập ít nhất {0} ký tự.'),
      maxlength: jQuery.validator.format('Nhập tối đa {0} ký tự.'),
      equalTo: 'Giá trị nhập lại không khớp.'
    });
    jQuery.validator.addMethod('phoneVN', function (v, el) {
      return this.optional(el) || /^0\d{9}$/.test(v);
    }, 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.');
    jQuery.validator.addMethod('cccd', function (v, el) {
      return this.optional(el) || /^\d{12}$/.test(v);
    }, 'Số CCCD gồm 12 chữ số.');
    jQuery.validator.addMethod('afterDate', function (v, el, other) {
      const o = jQuery(other).val();
      return this.optional(el) || !o || v > o;
    }, 'Ngày kết thúc phải sau ngày bắt đầu.');
    jQuery.validator.setDefaults({
      errorElement: 'div',
      errorClass: 'form-error',
      highlight: el => jQuery(el).addClass('is-invalid'),
      unhighlight: el => jQuery(el).removeClass('is-invalid'),
      errorPlacement(error, el) {
        if (el.parent('.input-group').length) error.insertAfter(el.parent());
        else if (el.is(':checkbox,:radio')) error.appendTo(el.closest('.check-group, .mb-3'));
        else error.insertAfter(el);
      }
    });
  }
})();
