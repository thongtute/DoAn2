/* Thanh toán (phiếu thu). Một hóa đơn có thể được thu nhiều lần (thanh toán từng phần). */
(function () {
  const S = App.store, U = App.utils;

  App.ThanhToan = {
    all() { return S.all('thanhToan'); },
    get(id) { return S.get('thanhToan', id); },

    byHoaDon(id) { return S.filter('thanhToan', t => t.hoaDonId === id).sort((a, b) => a.ngay.localeCompare(b.ngay)); },
    byKhach(khachId) { return S.filter('thanhToan', t => t.khachId === khachId).sort((a, b) => b.ngay.localeCompare(a.ngay)); },

    /* f: { khuId, tuNgay, denNgay } */
    list(f) {
      f = f || {};
      const ids = App.auth.scopeKhuIds();
      return this.all().filter(t => (!ids || ids.includes(t.khuId))
        && (!f.khuId || t.khuId === f.khuId)
        && (!f.tuNgay || t.ngay >= f.tuNgay)
        && (!f.denNgay || t.ngay <= f.denNgay))
        .sort((a, b) => b.ngay.localeCompare(a.ngay));
    },

    nextMa(ngay) {
      const prefix = `PT${ngay.slice(2, 4)}${ngay.slice(5, 7)}-`;
      const max = this.all().filter(t => (t.ma || '').startsWith(prefix))
        .reduce((m, t) => Math.max(m, parseInt(t.ma.slice(prefix.length), 10) || 0), 0);
      return prefix + String(max + 1).padStart(3, '0');
    },

    /* d: { soTien, ngay, phuongThuc, ghiChu } */
    thu(hoaDonId, d) {
      const hd = App.HoaDon.get(hoaDonId);
      if (!hd) throw new Error('Không tìm thấy hóa đơn.');
      if (!App.auth.canKhu(hd.khuId)) throw new Error('Bạn không được phân công quản lý khu trọ này.');
      const soTien = Math.round(Number(d.soTien) || 0);
      const conLai = App.HoaDon.conLai(hd);
      if (conLai <= 0) throw new Error('Hóa đơn đã được thanh toán đủ.');
      if (soTien <= 0) throw new Error('Số tiền thu phải lớn hơn 0.');
      if (soTien > conLai) throw new Error(`Số tiền thu vượt quá số còn lại (${U.money(conLai)}).`);
      const ngay = d.ngay || U.today();
      if (ngay > U.today()) throw new Error('Ngày thu không được ở tương lai.');
      const rec = S.insert('thanhToan', {
        ma: this.nextMa(ngay),
        hoaDonId, hopDongId: hd.hopDongId, khuId: hd.khuId, phongId: hd.phongId, khachId: hd.khachId,
        soTien, ngay,
        phuongThuc: ['tienMat', 'chuyenKhoan', 'truCoc'].includes(d.phuongThuc) ? d.phuongThuc : 'tienMat',
        ghiChu: d.ghiChu || '',
        nguoiThu: App.auth.current().hoTen
      }, 'tt');
      App.HoaDon.refresh(hoaDonId);
      return rec;
    },

    /* Hủy phiếu thu nhập nhầm (chỉ chủ trọ). */
    huy(id) {
      const t = this.get(id);
      if (!t) return;
      if (!App.auth.can('delete')) throw new Error('Chỉ chủ trọ được hủy phiếu thu.');
      if (t.phuongThuc === 'truCoc') throw new Error('Không thể hủy khoản trừ tiền cọc của hợp đồng đã thanh lý.');
      S.remove('thanhToan', id);
      App.HoaDon.refresh(t.hoaDonId);
    }
  };
})();
