/* Trang Sơ đồ phòng: tab khu, bộ lọc, dạng lưới/bảng, thêm/sửa/xóa phòng. */
$(document).on('app:ready', function () {
  const U = App.utils, S = App.store;
  const canEdit = App.auth.can('phong.edit');
  const $f = $('#phongForm');
  const modal = bootstrap.Modal.getOrCreateInstance('#phongModal');
  const TRANG_THAI = ['trong', 'dangThue', 'no', 'sapHetHan', 'baoTri'];

  let khuId = U.qs('khu') || '';               // '' = tất cả khu
  let view = S.getObj('phongView', 'grid');     // nhớ kiểu hiển thị giữa các lần mở trang
  let khus = [], phongs = [];

  /* ---------- Dữ liệu ---------- */
  function load() {
    khus = App.KhuTro.list();
    if (khuId && !khus.some(k => k.id === khuId)) khuId = '';
    phongs = App.Phong.list().map(p => App.Phong.enrich(p));
  }

  function locPhong(ds) {
    const tang = $('#fTang').val(), tt = $('#fTrangThai').val(), q = U.plain($('#fSearch').val().trim());
    return ds.filter(p => (!tang || String(p.tang) === tang)
      && (!tt || p.hienThi === tt)
      && (!q || U.plain([p.maPhong, p.khach && p.khach.hoTen, p.khach && p.khach.sdt].join(' ')).includes(q)));
  }

  /* ---------- Hiển thị ---------- */
  function statusText(p) {
    if (p.hienThi === 'sapHetHan') return p.tinhTrangHD === 'hetHan' ? 'Hết hạn HĐ' : 'Sắp hết hạn';
    return U.label('phongHienThi', p.hienThi);
  }

  function footRight(p) {
    if (p.no > 0) return `<span class="room-debt">Nợ ${U.money(p.no)}</span>`;
    if (p.hienThi === 'sapHetHan') {
      const kt = p.hopDong.ngayKetThuc;
      return p.tinhTrangHD === 'hetHan'
        ? `<span class="text-muted">HĐ hết ${U.fmtDate(kt).slice(0, 5)}</span>`
        : `<span class="text-muted">Còn ${U.daysBetween(U.today(), kt)} ngày</span>`;
    }
    if (p.hopDong) return `<span class="text-muted">${p.hopDong.soNguoiO} người</span>`;
    if (p.trangThai === 'trong') return '<span class="text-brand fw-semibold"><i class="bi bi-plus-circle me-1"></i>Lập HĐ</span>';
    return '<span class="text-muted"><i class="bi bi-wrench"></i></span>';
  }

  function roomCard(p) {
    const tenant = p.khach
      ? `<div class="room-tenant"><i class="bi bi-person me-1"></i>${U.esc(p.khach.hoTen)}</div>`
      : `<div class="room-tenant empty">${p.trangThai === 'baoTri' ? 'Đang sửa chữa' : 'Chưa có người thuê'}</div>`;
    return `
      <a class="room-card st-${p.hienThi}" href="phong-chi-tiet.html?id=${encodeURIComponent(p.id)}">
        <div class="room-head">
          <div><div class="room-code">${U.esc(p.maPhong)}</div><div class="room-meta">${p.dienTich ? `${p.dienTich} m² · ` : ''}tối đa ${p.soNguoiToiDa} người</div></div>
          <span class="room-status">${statusText(p)}</span>
        </div>
        ${tenant}
        <div class="room-foot"><span class="room-price">${U.money(p.giaThue)}</span>${footRight(p)}</div>
      </a>`;
  }

  function renderGrid(ds) {
    const html = khus.map(k => {
      const cuaKhu = ds.filter(p => p.khuId === k.id);
      if (!cuaKhu.length) return '';
      const st = App.KhuTro.stats(k.id);
      const tangs = [...new Set(cuaKhu.map(p => p.tang))].sort((a, b) => a - b);
      return `
        <div class="khu-block">
          <div class="khu-title"><i class="bi bi-buildings text-brand"></i>${U.esc(k.ten)}
            <span class="small text-muted fw-normal">· ${st.dangThue}/${st.tong} đang thuê</span></div>
          ${tangs.map(t => `
            <div class="floor-label">Tầng ${t}</div>
            <div class="room-grid">${cuaKhu.filter(p => p.tang === t).map(roomCard).join('')}</div>`).join('')}
        </div>`;
    }).join('');
    $('#gridView').html(html || `<div class="card">${emptyHtml()}</div>`);
  }

  function renderTable(ds) {
    const rows = ds.map(p => `
      <tr>
        <td class="cell-main">${U.esc(p.maPhong)}</td>
        <td>${U.esc(p.khu ? p.khu.ten : '')}</td>
        <td>${p.tang}</td>
        <td>${p.dienTich ? p.dienTich + ' m²' : '—'}</td>
        <td class="text-end money">${U.money(p.giaThue)}</td>
        <td>${p.khach ? `${U.esc(p.khach.hoTen)}<div class="cell-sub">${U.esc(p.khach.sdt)}</div>` : '<span class="text-muted">—</span>'}</td>
        <td>${U.badge('phongHienThi', p.hienThi)}${p.no > 0 ? `<div class="cell-sub text-danger">Nợ ${U.money(p.no)}</div>` : ''}</td>
        <td class="actions-col">
          <a href="phong-chi-tiet.html?id=${encodeURIComponent(p.id)}" class="btn btn-light border btn-act" title="Chi tiết"><i class="bi bi-eye"></i></a>
          ${canEdit ? `<button class="btn btn-light border btn-act" data-act="edit" data-id="${p.id}" title="Sửa"><i class="bi bi-pencil"></i></button>` : ''}
          ${canEdit && !p.hopDong ? `<button class="btn btn-light border btn-act text-danger" data-act="del" data-id="${p.id}" title="Xóa"><i class="bi bi-trash"></i></button>` : ''}
        </td>
      </tr>`).join('');
    $('#phongRows').html(rows || `<tr><td colspan="8">${emptyHtml()}</td></tr>`);
  }

  function emptyHtml() {
    if (!khus.length) return U.empty('Chưa có khu trọ nào. Hãy tạo khu trọ trước khi thêm phòng.', 'buildings');
    if (!phongs.length) return U.empty('Chưa có phòng nào. Bấm "Thêm phòng" để bắt đầu.', 'door-closed');
    return U.empty('Không có phòng nào phù hợp với bộ lọc.', 'search');
  }

  function renderTabs() {
    const tab = (id, ten, n) => `<li class="nav-item"><a class="nav-link${id === khuId ? ' active' : ''}" href="#" data-khu="${id}">${U.esc(ten)} <span class="badge text-bg-light ms-1">${n}</span></a></li>`;
    $('#khuTabs')
      .html(tab('', 'Tất cả khu', phongs.length) + khus.map(k => tab(k.id, k.ten, phongs.filter(p => p.khuId === k.id).length)).join(''))
      .toggleClass('d-none', khus.length < 2);
  }

  function renderFloors(ds) {
    const cur = $('#fTang').val();
    const tangs = [...new Set(ds.map(p => p.tang))].sort((a, b) => a - b);
    $('#fTang').html('<option value="">Tất cả tầng</option>' + tangs.map(t => `<option value="${t}">Tầng ${t}</option>`).join(''))
      .val(tangs.map(String).includes(cur) ? cur : '');
  }

  function renderLegend(ds) {
    $('#legend').html(TRANG_THAI.map(st =>
      `<span class="st-${st}"><i class="legend-dot"></i>${U.label('phongHienThi', st)} (${ds.filter(p => p.hienThi === st).length})</span>`).join(''));
  }

  function render() {
    const cuaKhu = phongs.filter(p => !khuId || p.khuId === khuId);
    renderTabs();
    renderFloors(cuaKhu);
    renderLegend(cuaKhu);
    const ds = locPhong(cuaKhu);
    renderGrid(ds);
    renderTable(ds);
  }

  function reload() { load(); render(); }

  function setView(v) {
    view = v;
    S.setObj('phongView', v);
    $('#viewGrid').toggleClass('active', v === 'grid');
    $('#viewTable').toggleClass('active', v === 'table');
    $('#gridView').toggleClass('d-none', v !== 'grid');
    $('#tableView').toggleClass('d-none', v !== 'table');
  }

  /* ---------- Form thêm/sửa phòng ---------- */
  $('#tienNghiGroup').html(App.config.tienNghi.map(t =>
    `<label class="form-check"><input class="form-check-input" type="checkbox" name="tienNghi" value="${U.esc(t)}" data-multi> <span class="form-check-label">${U.esc(t)}</span></label>`).join(''));

  function openForm(p) {
    $f.find('[name=khuId]').html(U.options(khus, 'id', k => k.ten, '', '-- Chọn khu trọ --'));
    U.fillForm($f, p || { khuId: khuId || (khus.length === 1 ? khus[0].id : ''), tang: 1, soNguoiToiDa: 2, trangThai: 'trong' });
    validator.resetForm();
    const dangThue = !!(p && p.trangThai === 'dangThue');
    $f.find('[name=khuId], [name=trangThai]').prop('disabled', dangThue);
    $('#ttHint').text(dangThue
      ? 'Phòng đang có hợp đồng nên không đổi được khu và trạng thái.'
      : 'Trạng thái "Đang thuê" được tự động đặt khi lập hợp đồng.');
    $f.find('.modal-title').text(p ? `Sửa phòng ${p.maPhong}` : 'Thêm phòng');
    modal.show();
  }

  const validator = $f.validate({
    rules: { giaThue: { required: true, min: 1 }, tang: { min: 1 }, soNguoiToiDa: { min: 1 }, dienTich: { min: 0 } },
    submitHandler() {
      const d = U.formData($f);
      try {
        const p = App.Phong.save(d);
        modal.hide();
        U.toast(d.id ? `Đã cập nhật phòng ${p.maPhong}` : `Đã thêm phòng ${p.maPhong}`);
        reload();
      } catch (e) { U.err(e); }
    }
  });

  /* ---------- Sự kiện ---------- */
  $('#khuTabs').on('click', '[data-khu]', function (e) {
    e.preventDefault();
    khuId = String($(this).data('khu'));
    const url = new URL(location.href);
    if (khuId) url.searchParams.set('khu', khuId); else url.searchParams.delete('khu');
    history.replaceState(null, '', url);
    render();
  });
  $('#fTang, #fTrangThai').on('change', render);
  $('#fSearch').on('input', render);
  $('#viewGrid').on('click', () => setView('grid'));
  $('#viewTable').on('click', () => setView('table'));

  if (canEdit) $('#btnAdd').on('click', () => openForm(null));
  else $('#btnAdd').remove();

  $('#phongRows').on('click', '[data-act="edit"]', function () { openForm(App.Phong.get($(this).data('id'))); });
  $('#phongRows').on('click', '[data-act="del"]', async function () {
    const p = App.Phong.get($(this).data('id'));
    if (!p) return;
    if (!await U.confirm(`Xóa phòng ${p.maPhong}?`, 'Chỉ số điện nước đã ghi của phòng cũng bị xóa.', { danger: true, ok: 'Xóa' })) return;
    try {
      App.Phong.remove(p.id);
      U.toast(`Đã xóa phòng ${p.maPhong}`);
      reload();
    } catch (e) { U.err(e); }
  });

  setView(view);
  reload();
});
