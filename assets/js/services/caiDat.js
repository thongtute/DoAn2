/* Cài đặt hệ thống: thông tin chủ trọ, tài khoản ngân hàng, giá mặc định. */
(function () {
  const S = App.store;

  App.CaiDat = {
    get() {
      const d = App.config.defaults;
      const s = S.getObj('settings') || {};
      return {
        chuTro: Object.assign({}, d.chuTro, s.chuTro),
        nganHang: Object.assign({}, d.nganHang, s.nganHang),
        giaDien: s.giaDien != null ? s.giaDien : d.giaDien,
        giaNuoc: s.giaNuoc != null ? s.giaNuoc : d.giaNuoc,
        ngayHanThanhToan: s.ngayHanThanhToan != null ? s.ngayHanThanhToan : d.ngayHanThanhToan
      };
    },

    save(d) {
      if (!d.chuTro || !d.chuTro.hoTen) throw new Error('Vui lòng nhập họ tên chủ trọ.');
      if (!d.nganHang || !d.nganHang.bankId || !/^\d{6,20}$/.test(d.nganHang.accountNo || '')) {
        throw new Error('Số tài khoản ngân hàng không hợp lệ (6–20 chữ số).');
      }
      const han = Number(d.ngayHanThanhToan);
      if (!(han >= 1 && han <= 28)) throw new Error('Ngày hạn thanh toán phải từ 1 đến 28.');
      const s = {
        chuTro: d.chuTro,
        nganHang: Object.assign({}, d.nganHang, { accountName: (d.nganHang.accountName || '').toUpperCase(), demo: false }),
        giaDien: Number(d.giaDien) || 0,
        giaNuoc: Number(d.giaNuoc) || 0,
        ngayHanThanhToan: han
      };
      S.setObj('settings', s);
      return s;
    }
  };
})();
