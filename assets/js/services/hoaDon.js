/* Hóa đơn tháng: tiền phòng + điện + nước + dịch vụ - giảm trừ.
   Mỗi hợp đồng chỉ có 1 hóa đơn cho mỗi tháng. */
(function () {
  const S = App.store, U = App.utils;

  App.HoaDon = {
    all() { return S.all('hoaDon'); },
    get(id) { return S.get('hoaDon', id); },

    conLai(h) { return Math.max(0, h.tongTien - (h.daThu || 0)); },
    trangThai(h) {
      if ((h.daThu || 0) >= h.tongTien) return 'daThu';
      return h.daThu > 0 ? 'thuMotPhan' : 'chuaThu';
    },
    quaHan(h) { return this.conLai(h) > 0 && U.today() > h.hanThanhToan; },
    hienThi(h) { const st = this.trangThai(h); return st !== 'daThu' && this.quaHan(h) ? 'quaHan' : st; },

    enrich(h) {
      return Object.assign({}, h, {
        phong: App.Phong.get(h.phongId),
        khu: App.KhuTro.get(h.khuId),
        khach: App.Khach.get(h.khachId),
        hopDong: App.HopDong.get(h.hopDongId),
        conLai: this.conLai(h),
        hienThi: this.hienThi(h)
      });
    },

    /* f: { thang, khuId, trangThai (chuaThu|thuMotPhan|daThu|quaHan|conNo), hopDongId, khachId } */
    list(f) {
      f = f || {};
      const ids = App.auth.scopeKhuIds();
      return this.all()
        .filter(h => (!ids || ids.includes(h.khuId))
          && (!f.thang || h.thang === f.thang)
          && (!f.khuId || h.khuId === f.khuId)
          && (!f.hopDongId || h.hopDongId === f.hopDongId)
          && (!f.khachId || h.khachId === f.khachId))
        .map(h => this.enrich(h))
        .filter(h => !f.trangThai
          || (f.trangThai === 'conNo' ? h.conLai > 0
            : f.trangThai === 'quaHan' ? h.hienThi === 'quaHan'
              : this.trangThai(h) === f.trangThai))
        .sort((a, b) => b.thang.localeCompare(a.thang) || (a.phong ? a.phong.maPhong : '').localeCompare(b.phong ? b.phong.maPhong : '', 'vi', { numeric: true }));
    },

    byHopDong(hdId) { return S.filter('hoaDon', h => h.hopDongId === hdId).sort((a, b) => b.thang.localeCompare(a.thang)); },
    byKhach(khachId) { return S.filter('hoaDon', h => h.khachId === khachId).sort((a, b) => b.thang.localeCompare(a.thang)); },

    congNoHopDong(hdId) {
      const ds = S.filter('hoaDon', h => h.hopDongId === hdId && this.conLai(h) > 0);
      return { tong: U.sum(ds, h => this.conLai(h)), quaHan: ds.some(h => this.quaHan(h)), so: ds.length };
    },

    hanThanhToan(thang) {
      const ngay = App.CaiDat.get().ngayHanThanhToan;
      return `${U.addMonths(thang, 1)}-${U.pad(ngay)}`;
    },

    /* Tính các khoản của hóa đơn (không lưu). */
    tinh(hd, thang, cs) {
      const phong = App.Phong.get(hd.phongId);
      const khu = App.KhuTro.get(phong.khuId);
      const soDien = cs.dienMoi - cs.dienCu;
      const dien = { cu: cs.dienCu, moi: cs.dienMoi, soLuong: soDien, donGia: khu.giaDien, thanhTien: soDien * khu.giaDien };
      let nuoc;
      if (khu.cachTinhNuoc === 'nguoi') {
        nuoc = { cachTinh: 'nguoi', cu: null, moi: null, soLuong: hd.soNguoiO, donGia: khu.giaNuoc, thanhTien: hd.soNguoiO * khu.giaNuoc };
      } else {
        const soNuoc = cs.nuocMoi - cs.nuocCu;
        nuoc = { cachTinh: 'm3', cu: cs.nuocCu, moi: cs.nuocMoi, soLuong: soNuoc, donGia: khu.giaNuoc, thanhTien: soNuoc * khu.giaNuoc };
      }
      const dichVu = (khu.dichVu || []).map(d => {
        const sl = d.tinhTheo === 'nguoi' ? hd.soNguoiO : 1;
        return { ten: d.ten, donGia: d.gia, soLuong: sl, tinhTheo: d.tinhTheo, thanhTien: sl * d.gia };
      });
      const tamTinh = hd.giaThue + dien.thanhTien + nuoc.thanhTien + U.sum(dichVu, x => x.thanhTien);
      return {
        hopDongId: hd.id, phongId: hd.phongId, khuId: phong.khuId, khachId: hd.khachId, thang,
        tienPhong: hd.giaThue, dien, nuoc, dichVu,
        tamTinh, giamTru: 0, ghiChuGiamTru: '', tongTien: tamTinh, daThu: 0,
        hanThanhToan: this.hanThanhToan(thang), trangThai: 'chuaThu'
      };
    },

    nextMa(thang) {
      const prefix = `HD${thang.slice(2, 4)}${thang.slice(5, 7)}-`;
      const max = this.all().filter(h => (h.ma || '').startsWith(prefix))
        .reduce((m, h) => Math.max(m, parseInt(h.ma.slice(prefix.length), 10) || 0), 0);
      return prefix + String(max + 1).padStart(3, '0');
    },

    /* Tạo hóa đơn cho tất cả hợp đồng đang hiệu lực trong khu ở tháng đã chọn.
       Trả về { created[], daCo[], chuaChot[] } */
    taoHangLoat(khuId, thang) {
      if (!App.auth.canKhu(khuId)) throw new Error('Bạn không được phân công quản lý khu trọ này.');
      if (!thang) throw new Error('Vui lòng chọn tháng.');
      if (thang > U.currentMonth()) throw new Error('Không thể tạo hóa đơn cho tháng trong tương lai.');
      const kq = { created: [], daCo: [], chuaChot: [] };
      App.Phong.list({ khuId }).forEach(p => {
        const hd = App.Phong.activeContract(p.id);
        if (!hd || U.monthOf(hd.ngayBatDau) > thang) return;
        if (S.find('hoaDon', h => h.hopDongId === hd.id && h.thang === thang)) { kq.daCo.push(p.maPhong); return; }
        const cs = App.ChiSo.get(p.id, thang);
        if (!cs) { kq.chuaChot.push(p.maPhong); return; }
        const rec = Object.assign(this.tinh(hd, thang, cs), { ma: this.nextMa(thang), ngayTao: U.today() });
        kq.created.push(S.insert('hoaDon', rec, 'hdn'));
      });
      return kq;
    },

    /* Tính lại số đã thu và trạng thái từ các lần thanh toán. */
    refresh(id) {
      const h = this.get(id);
      const daThu = U.sum(App.ThanhToan.byHoaDon(id), t => t.soTien);
      const tmp = Object.assign({}, h, { daThu });
      return S.update('hoaDon', id, { daThu, trangThai: this.trangThai(tmp) });
    },

    capNhatGiamTru(id, giamTru, ghiChu) {
      const h = this.get(id);
      if (!h) throw new Error('Không tìm thấy hóa đơn.');
      if (!App.auth.canKhu(h.khuId)) throw new Error('Bạn không được phân công quản lý khu trọ này.');
      giamTru = Math.round(Number(giamTru) || 0);
      if (giamTru < 0 || giamTru > h.tamTinh) throw new Error('Số tiền giảm trừ không hợp lệ.');
      const tongTien = h.tamTinh - giamTru;
      if (tongTien < (h.daThu || 0)) throw new Error('Tổng tiền sau giảm trừ nhỏ hơn số tiền đã thu.');
      S.update('hoaDon', id, { giamTru, ghiChuGiamTru: ghiChu || '', tongTien });
      return this.refresh(id);
    },

    remove(id) {
      const h = this.get(id);
      if (!h) return;
      if (!App.auth.canKhu(h.khuId)) throw new Error('Bạn không được phân công quản lý khu trọ này.');
      if ((h.daThu || 0) > 0) throw new Error('Hóa đơn đã có thanh toán, không thể xóa.');
      S.remove('hoaDon', id);
    }
  };
})();
