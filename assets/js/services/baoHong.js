/* Yêu cầu sửa chữa / báo hỏng do khách thuê gửi. */
(function () {
  const S = App.store, U = App.utils;

  App.BaoHong = {
    all() { return S.all('baoHong'); },
    get(id) { return S.get('baoHong', id); },

    enrich(b) {
      const phong = App.Phong.get(b.phongId);
      return Object.assign({}, b, { phong, khu: phong ? App.KhuTro.get(phong.khuId) : null, khach: App.Khach.get(b.khachId) });
    },

    list(f) {
      f = f || {};
      const ids = App.auth.scopeKhuIds();
      return this.all().map(b => this.enrich(b))
        .filter(b => b.phong && (!ids || ids.includes(b.phong.khuId)) && (!f.trangThai || b.trangThai === f.trangThai))
        .sort((a, b) => b.ngayTao.localeCompare(a.ngayTao));
    },

    byKhach(khachId) {
      return S.filter('baoHong', b => b.khachId === khachId).map(b => this.enrich(b)).sort((a, b) => b.ngayTao.localeCompare(a.ngayTao));
    },

    demMoi() {
      const u = App.auth.current();
      if (!u || u.role === 'tenant') return 0;
      return this.list({ trangThai: 'moi' }).length;
    },

    /* Khách gửi yêu cầu cho phòng đang thuê. */
    tao(khachId, d) {
      const hd = App.Khach.activeContract(khachId);
      if (!hd) throw new Error('Bạn không có hợp đồng thuê đang hiệu lực.');
      if (!d.tieuDe || !d.tieuDe.trim()) throw new Error('Vui lòng nhập tiêu đề.');
      if (!d.noiDung || d.noiDung.trim().length < 10) throw new Error('Vui lòng mô tả chi tiết (ít nhất 10 ký tự).');
      return S.insert('baoHong', {
        phongId: hd.phongId, khachId, hopDongId: hd.id,
        tieuDe: d.tieuDe.trim(), noiDung: d.noiDung.trim(),
        mucDo: ['thap', 'trungBinh', 'cao'].includes(d.mucDo) ? d.mucDo : 'trungBinh',
        trangThai: 'moi', ngayTao: U.today(), phanHoi: ''
      }, 'bh');
    },

    capNhat(id, d) {
      const b = this.get(id);
      if (!b) throw new Error('Không tìm thấy yêu cầu.');
      const phong = App.Phong.get(b.phongId);
      if (!phong || !App.auth.canKhu(phong.khuId)) throw new Error('Bạn không được phân công quản lý khu trọ này.');
      const patch = { trangThai: d.trangThai, phanHoi: d.phanHoi || '', nguoiXuLy: App.auth.current().hoTen };
      if (d.trangThai === 'xong') patch.ngayXuLy = U.today();
      return S.update('baoHong', id, patch);
    },

    /* Khách hủy yêu cầu chưa được xử lý. */
    huy(id, khachId) {
      const b = this.get(id);
      if (!b || b.khachId !== khachId) throw new Error('Không tìm thấy yêu cầu.');
      if (b.trangThai !== 'moi') throw new Error('Yêu cầu đã được tiếp nhận, không thể hủy.');
      S.remove('baoHong', id);
    }
  };
})();
