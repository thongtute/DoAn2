/* Trang Khu trọ: danh sách thẻ khu, thêm/sửa (kèm bảng dịch vụ cố định), xóa. */
$(document).on('app:ready', function () {
  const U = App.utils;
  const $list = $('#khuList'), $f = $('#khuForm'), $dv = $('#dichVuRows');
  const modal = bootstrap.Modal.getOrCreateInstance('#khuModal');
  const COVERS = ['', 'c2', 'c3'];
  const DV_MAC_DINH = [{ ten: 'Internet', gia: 100000, tinhTheo: 'phong' }, { ten: 'Rác', gia: 20000, tinhTheo: 'phong' }];

  const giaNuocText = k => `${U.num(k.giaNuoc)} đ/${k.cachTinhNuoc === 'nguoi' ? 'người' : 'm³'}`;
  const dichVuText = k => (k.dichVu || []).length
    ? k.dichVu.map(d => `${U.esc(d.ten)} ${U.num(d.gia)}${d.tinhTheo === 'nguoi' ? '/người' : ''}`).join(' · ')
    : '<span class="text-muted">Không có</span>';

  function card(k, i) {
    const st = App.KhuTro.stats(k.id);
    const soTang = App.Phong.floors(k.id).length;
    return `
      <div class="col-md-6 col-xl-4">
        <div class="card khu-card h-100">
          <div class="khu-cover ${COVERS[i % COVERS.length]}">
            <small class="opacity-75">${st.tong} phòng${soTang ? ` · ${soTang} tầng` : ''}</small>
            <h5>${U.esc(k.ten)}</h5>
          </div>
          <div class="card-body">
            <p class="small text-muted mb-3"><i class="bi bi-geo-alt me-1"></i>${U.esc(k.diaChi) || 'Chưa có địa chỉ'}</p>
            <div class="khu-stats mb-3">
              <div><div class="v text-success">${st.dangThue}</div><div class="l">Đang thuê</div></div>
              <div><div class="v">${st.trong}</div><div class="l">Trống</div></div>
              <div><div class="v" style="color:var(--st-baotri)">${st.baoTri}</div><div class="l">Bảo trì</div></div>
            </div>
            <div class="d-flex justify-content-between small mb-1"><span class="text-muted">Lấp đầy</span><strong>${st.lapDay}%</strong></div>
            <div class="progress mb-3"><div class="progress-bar" style="width:${st.lapDay}%"></div></div>
            <div class="small">
              <div class="d-flex justify-content-between py-1"><span class="text-muted">Điện</span><span>${U.num(k.giaDien)} đ/kWh</span></div>
              <div class="d-flex justify-content-between py-1"><span class="text-muted">Nước</span><span>${giaNuocText(k)}</span></div>
              <div class="d-flex justify-content-between gap-3 py-1"><span class="text-muted">Dịch vụ</span><span class="text-end">${dichVuText(k)}</span></div>
            </div>
          </div>
          <div class="card-footer bg-transparent d-flex gap-2">
            <a href="phong.html?khu=${encodeURIComponent(k.id)}" class="btn btn-sm btn-outline-primary flex-fill"><i class="bi bi-grid-3x3-gap me-1"></i>Sơ đồ phòng</a>
            <button class="btn btn-sm btn-light border" data-act="edit" data-id="${k.id}" title="Sửa"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-light border text-danger" data-act="del" data-id="${k.id}" title="Xóa"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </div>`;
  }

  function render() {
    const list = App.KhuTro.list();
    $list.html(list.length
      ? list.map(card).join('')
      : `<div class="col-12"><div class="card">${U.empty('Chưa có khu trọ nào. Bấm "Thêm khu trọ" để bắt đầu.', 'buildings')}</div></div>`);
  }

  /* ---------- Form thêm/sửa ---------- */
  function dvRow(d) {
    d = d || { ten: '', gia: '', tinhTheo: 'phong' };
    return `<tr>
      <td><input class="form-control form-control-sm dv-ten" value="${U.esc(d.ten)}" placeholder="VD: Internet"></td>
      <td><input type="number" class="form-control form-control-sm dv-gia" value="${U.esc(d.gia)}" min="0" step="1000"></td>
      <td><select class="form-select form-select-sm dv-theo">
        <option value="phong"${d.tinhTheo === 'phong' ? ' selected' : ''}>Mỗi phòng</option>
        <option value="nguoi"${d.tinhTheo === 'nguoi' ? ' selected' : ''}>Mỗi người</option>
      </select></td>
      <td><button type="button" class="btn btn-sm text-danger" data-act="dv-del" title="Bỏ dịch vụ"><i class="bi bi-x-lg"></i></button></td>
    </tr>`;
  }

  function dvRows() {
    return $dv.find('tr').map(function () {
      const $r = $(this);
      return { ten: $r.find('.dv-ten').val().trim(), gia: $r.find('.dv-gia').val(), tinhTheo: $r.find('.dv-theo').val() };
    }).get().filter(d => d.ten);
  }

  const capNhatDonViNuoc = () => $('#nuocUnit').text($f.find('[name=cachTinhNuoc]').val() === 'nguoi' ? 'đ/người' : 'đ/m³');

  function openForm(k) {
    const cd = App.CaiDat.get();
    U.fillForm($f, k || { giaDien: cd.giaDien, giaNuoc: cd.giaNuoc, cachTinhNuoc: 'm3' });
    validator.resetForm();
    $dv.html(((k ? k.dichVu : DV_MAC_DINH) || []).map(dvRow).join(''));
    $f.find('.modal-title').text(k ? `Sửa ${k.ten}` : 'Thêm khu trọ');
    capNhatDonViNuoc();
    modal.show();
  }

  const validator = $f.validate({
    rules: { giaDien: { required: true, min: 0 }, giaNuoc: { required: true, min: 0 } },
    submitHandler() {
      const d = U.formData($f);
      d.dichVu = dvRows();
      if (d.dichVu.some(x => !(Number(x.gia) >= 0) || x.gia === '')) return U.err(new Error('Vui lòng nhập đơn giá cho từng dịch vụ.'));
      try {
        App.KhuTro.save(d);
        modal.hide();
        U.toast(d.id ? 'Đã cập nhật khu trọ' : 'Đã thêm khu trọ');
        render();
      } catch (e) { U.err(e); }
    }
  });

  $f.on('change', '[name=cachTinhNuoc]', capNhatDonViNuoc);
  $('#btnAddDv').on('click', () => { $dv.append(dvRow()); $dv.find('tr:last .dv-ten').trigger('focus'); });
  $dv.on('click', '[data-act="dv-del"]', function () { $(this).closest('tr').remove(); });

  $('#btnAdd').on('click', () => openForm(null));
  $list.on('click', '[data-act="edit"]', function () { openForm(App.KhuTro.get($(this).data('id'))); });
  $list.on('click', '[data-act="del"]', async function () {
    const k = App.KhuTro.get($(this).data('id'));
    if (!k) return;
    if (!await U.confirm(`Xóa ${k.ten}?`, 'Thao tác này không thể hoàn tác.', { danger: true, ok: 'Xóa' })) return;
    try {
      App.KhuTro.remove(k.id);
      U.toast('Đã xóa khu trọ');
      render();
    } catch (e) { U.err(e); }
  });

  render();
});
