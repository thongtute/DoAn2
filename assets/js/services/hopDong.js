/* Hợp đồng thuê.
   Quy tắc chính: mỗi phòng tại một thời điểm chỉ có 1 hợp đồng "hieuLuc" với 1 người đại diện.
   trangThai lưu: hieuLuc | thanhLy. "Sắp hết hạn"/"Hết hạn" được tính theo ngày kết thúc. */
(function () {
  const S = App.store, U = App.utils;

  App.HopDong = {
    all() { return S.all('hopDong'); },
    get(id) { return S.get('hopDong', id); },

    tinhTrang(h) {
      if (h.trangThai === 'thanhLy') return 'thanhLy';
      const d = U.daysBetween(U.today(), h.ngayKetThuc);
      if (d < 0) return 'hetHan';
      if (d <= App.config.ngayNhacHetHan) return 'sapHetHan';
      return 'hieuLuc';
    },

    enrich(h) {
      const phong = App.Phong.get(h.phongId);
      return Object.assign({}, h, {
        phong,
        khu: phong ? App.KhuTro.get(phong.khuId) : null,
        khach: App.Khach.get(h.khachId),
        tinhTrangHD: this.tinhTrang(h),
        soNgayConLai: U.daysBetween(U.today(), h.ngayKetThuc)
      });
    },

    /* f: { khuId, tinhTrang, phongId, khachId } */
    list(f) {
      f = f || {};
      const ids = App.auth.scopeKhuIds();
      return this.all()
        .map(h => this.enrich(h))
        .filter(h => h.phong && (!ids || ids.includes(h.phong.khuId))
          && (!f.khuId || h.phong.khuId === f.khuId)
          && (!f.phongId || h.phongId === f.phongId)
          && (!f.khachId || h.khachId === f.khachId)
          && (!f.tinhTrang || h.tinhTrangHD === f.tinhTrang || (f.tinhTrang === 'conHieuLuc' && h.trangThai === 'hieuLuc')))
        .sort((a, b) => b.ngayBatDau.localeCompare(a.ngayBatDau));
    },

    nextMa() {
      const max = this.all().reduce((m, h) => Math.max(m, parseInt((h.ma || '').replace(/\D/g, ''), 10) || 0), 0);
      return 'HDT-' + String(max + 1).padStart(4, '0');
    },

    /* d: { phongId, khachId? , khach:{hoTen,sdt,cccd,...}, ngayBatDau, ngayKetThuc, giaThue, tienCoc, soNguoiO,
            chiSoDienDau, chiSoNuocDau, ghiChu }
       Trả về { hopDong, taiKhoan } */
    create(d) {
      const phong = App.Phong.get(d.phongId);
      if (!phong) throw new Error('Vui lòng chọn phòng.');
      if (!App.auth.canKhu(phong.khuId)) throw new Error('Bạn không được phân công quản lý khu trọ này.');
      if (phong.trangThai !== 'trong' || App.Phong.activeContract(phong.id)) {
        throw new Error(`Phòng ${phong.maPhong} không còn trống (mỗi phòng chỉ có 1 hợp đồng hiệu lực).`);
      }
      if (!d.ngayBatDau || !d.ngayKetThuc) throw new Error('Vui lòng nhập ngày bắt đầu và ngày kết thúc.');
      if (d.ngayKetThuc <= d.ngayBatDau) throw new Error('Ngày kết thúc phải sau ngày bắt đầu.');
      const soNguoi = Number(d.soNguoiO) || 1;
      if (soNguoi < 1 || soNguoi > phong.soNguoiToiDa) throw new Error(`Số người ở phải từ 1 đến ${phong.soNguoiToiDa}.`);
      if (!(Number(d.giaThue) > 0)) throw new Error('Giá thuê phải lớn hơn 0.');
      if (Number(d.tienCoc) < 0) throw new Error('Tiền cọc không hợp lệ.');
      if (Number(d.chiSoDienDau) < 0 || Number(d.chiSoNuocDau) < 0) throw new Error('Chỉ số điện nước ban đầu không hợp lệ.');

      // Người đại diện: khách cũ hoặc khách mới
      let khach;
      if (d.khachId) {
        khach = App.Khach.get(d.khachId);
        if (!khach) throw new Error('Không tìm thấy khách thuê.');
        const dangThue = App.Khach.activeContract(khach.id);
        if (dangThue) throw new Error(`${khach.hoTen} đang là người đại diện của một phòng khác (HĐ ${dangThue.ma}).`);
      } else {
        App.Khach.validate(d.khach || {});
      }
      if (!d.khachId) khach = App.Khach.create(d.khach);
      const taiKhoan = App.NguoiDung.ensureTenant(khach);

      const hd = S.insert('hopDong', {
        ma: this.nextMa(),
        phongId: phong.id,
        khachId: khach.id,
        ngayLap: U.today(),
        ngayBatDau: d.ngayBatDau,
        ngayKetThuc: d.ngayKetThuc,
        giaThue: Number(d.giaThue),
        tienCoc: Number(d.tienCoc) || 0,
        soNguoiO: soNguoi,
        chiSoDienDau: Number(d.chiSoDienDau) || 0,
        chiSoNuocDau: Number(d.chiSoNuocDau) || 0,
        ghiChu: d.ghiChu || '',
        trangThai: 'hieuLuc',
        lichSu: [{ ngay: U.today(), noiDung: 'Lập hợp đồng', nguoi: App.auth.current().hoTen }]
      }, 'hd');
      S.update('phong', phong.id, { trangThai: 'dangThue' });
      return { hopDong: hd, taiKhoan };
    },

    checkEditable(h) {
      if (!h) throw new Error('Không tìm thấy hợp đồng.');
      const phong = App.Phong.get(h.phongId);
      if (!phong || !App.auth.canKhu(phong.khuId)) throw new Error('Bạn không được phân công quản lý khu trọ này.');
      if (h.trangThai !== 'hieuLuc') throw new Error('Hợp đồng đã thanh lý, không thể thay đổi.');
      return phong;
    },

    giaHan(id, d) {
      const h = this.get(id);
      const phong = this.checkEditable(h);
      if (!d.ngayKetThuc || d.ngayKetThuc <= h.ngayKetThuc) throw new Error('Ngày kết thúc mới phải sau ngày kết thúc hiện tại.');
      const giaThue = Number(d.giaThue) || h.giaThue;
      if (giaThue <= 0) throw new Error('Giá thuê không hợp lệ.');
      const soNguoi = Number(d.soNguoiO) || h.soNguoiO;
      if (soNguoi < 1 || soNguoi > phong.soNguoiToiDa) throw new Error(`Số người ở phải từ 1 đến ${phong.soNguoiToiDa}.`);
      const ghi = [`Gia hạn đến ${U.fmtDate(d.ngayKetThuc)}`];
      if (giaThue !== h.giaThue) ghi.push(`giá thuê ${U.money(h.giaThue)} → ${U.money(giaThue)}`);
      if (soNguoi !== h.soNguoiO) ghi.push(`số người ${h.soNguoiO} → ${soNguoi}`);
      return S.update('hopDong', id, {
        ngayKetThuc: d.ngayKetThuc, giaThue, soNguoiO: soNguoi,
        lichSu: (h.lichSu || []).concat([{ ngay: U.today(), noiDung: ghi.join(', '), nguoi: App.auth.current().hoTen }])
      });
    },

    /* Xem trước kết quả thanh lý: tiền cọc dùng để trừ nợ, phần còn lại hoàn cho khách. */
    xemThanhLy(id) {
      const h = this.get(id);
      this.checkEditable(h);
      const hoaDonNo = App.HoaDon.byHopDong(id)
        .filter(x => App.HoaDon.conLai(x) > 0)
        .sort((a, b) => a.thang.localeCompare(b.thang));
      const conNo = U.sum(hoaDonNo, x => App.HoaDon.conLai(x));
      const truCoc = Math.min(h.tienCoc, conNo);
      const thangCuoi = U.monthOf(U.today());
      const daChotThangNay = !!App.ChiSo.get(h.phongId, thangCuoi);
      return {
        hopDong: h, hoaDonNo, conNo, tienCoc: h.tienCoc, truCoc,
        hoanLai: h.tienCoc - truCoc, conPhaiThu: conNo - truCoc,
        canhBaoChuaChot: !daChotThangNay
      };
    },

    thanhLy(id, d) {
      const x = this.xemThanhLy(id);
      const ngay = (d && d.ngayThanhLy) || U.today();
      if (ngay < x.hopDong.ngayBatDau) throw new Error('Ngày thanh lý không được trước ngày bắt đầu hợp đồng.');
      // Dùng tiền cọc trừ dần vào các hóa đơn còn nợ (cũ trước)
      let conCoc = x.truCoc;
      x.hoaDonNo.forEach(hd => {
        if (conCoc <= 0) return;
        const tien = Math.min(conCoc, App.HoaDon.conLai(hd));
        App.ThanhToan.thu(hd.id, { soTien: tien, ngay: U.today(), phuongThuc: 'truCoc', ghiChu: `Trừ tiền cọc khi thanh lý ${x.hopDong.ma}` });
        conCoc -= tien;
      });
      const h = S.update('hopDong', id, {
        trangThai: 'thanhLy',
        ngayThanhLy: ngay,
        ketQuaThanhLy: { tienCoc: x.tienCoc, truCoc: x.truCoc, hoanLai: x.hoanLai, conPhaiThu: x.conPhaiThu },
        ghiChuThanhLy: (d && d.ghiChu) || '',
        lichSu: (x.hopDong.lichSu || []).concat([{ ngay: U.today(), noiDung: `Thanh lý hợp đồng, hoàn cọc ${U.money(x.hoanLai)}`, nguoi: App.auth.current().hoTen }])
      });
      S.update('phong', h.phongId, { trangThai: 'trong' });
      return h;
    },

    /* Chỉ xóa được hợp đồng nhập nhầm (chưa có hóa đơn). */
    remove(id) {
      const h = this.get(id);
      if (!h) return;
      if (App.HoaDon.byHopDong(id).length) throw new Error('Hợp đồng đã có hóa đơn, không thể xóa. Hãy dùng chức năng Thanh lý.');
      S.remove('hopDong', id);
      if (h.trangThai === 'hieuLuc') S.update('phong', h.phongId, { trangThai: 'trong' });
    }
  };
})();
