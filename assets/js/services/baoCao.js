/* Thống kê cho dashboard, công nợ và báo cáo doanh thu. */
(function () {
  const U = App.utils;

  const scoped = (arr, khuId) => {
    const ids = App.auth.scopeKhuIds();
    return arr.filter(x => (!ids || ids.includes(x.khuId)) && (!khuId || x.khuId === khuId));
  };

  App.BaoCao = {
    /* Phát sinh (theo tháng của hóa đơn) và thực thu (theo ngày thu) cho n tháng gần nhất. */
    theoThang(endMonth, n, khuId) {
      const hds = scoped(App.HoaDon.all(), khuId);
      const tts = scoped(App.ThanhToan.all(), khuId);
      return U.monthRange(endMonth, n).map(m => ({
        thang: m,
        phatSinh: U.sum(hds.filter(h => h.thang === m), h => h.tongTien),
        thucThu: U.sum(tts.filter(t => t.ngay.slice(0, 7) === m), t => t.soTien),
        conNo: U.sum(hds.filter(h => h.thang === m), h => App.HoaDon.conLai(h))
      }));
    },

    /* Cơ cấu doanh thu phát sinh trong khoảng tháng [tu, den]. */
    coCau(tu, den, khuId) {
      const hds = scoped(App.HoaDon.all(), khuId).filter(h => h.thang >= tu && h.thang <= den);
      return {
        tienPhong: U.sum(hds, h => h.tienPhong),
        dien: U.sum(hds, h => h.dien.thanhTien),
        nuoc: U.sum(hds, h => h.nuoc.thanhTien),
        dichVu: U.sum(hds, h => U.sum(h.dichVu, d => d.thanhTien)),
        giamTru: U.sum(hds, h => h.giamTru || 0)
      };
    },

    /* Tổng hợp theo từng khu cho 1 tháng. */
    theoKhu(thang) {
      const hds = App.HoaDon.all(), tts = App.ThanhToan.all();
      return App.KhuTro.list().map(k => {
        const st = App.KhuTro.stats(k.id);
        const hdThang = hds.filter(h => h.khuId === k.id && h.thang === thang);
        return Object.assign({ khu: k }, st, {
          phatSinh: U.sum(hdThang, h => h.tongTien),
          daThuHoaDon: U.sum(hdThang, h => h.daThu || 0),
          thucThu: U.sum(tts.filter(t => t.khuId === k.id && t.ngay.slice(0, 7) === thang), t => t.soTien),
          tongNo: U.sum(hds.filter(h => h.khuId === k.id), h => App.HoaDon.conLai(h))
        });
      });
    },

    /* Công nợ gom theo hợp đồng (kể cả hợp đồng đã thanh lý còn nợ). */
    congNo(khuId) {
      const nhom = {};
      scoped(App.HoaDon.all(), khuId).forEach(h => {
        const cl = App.HoaDon.conLai(h);
        if (cl <= 0) return;
        const g = nhom[h.hopDongId] = nhom[h.hopDongId] || { hopDongId: h.hopDongId, hoaDon: [], tongNo: 0, quaHan: false, soNgayQuaHan: 0 };
        g.hoaDon.push(h);
        g.tongNo += cl;
        if (App.HoaDon.quaHan(h)) {
          g.quaHan = true;
          g.soNgayQuaHan = Math.max(g.soNgayQuaHan, U.daysBetween(h.hanThanhToan, U.today()));
        }
      });
      return Object.values(nhom).map(g => {
        const hd = App.HopDong.enrich(App.HopDong.get(g.hopDongId));
        g.hoaDon.sort((a, b) => a.thang.localeCompare(b.thang));
        return Object.assign(g, { hopDong: hd, phong: hd.phong, khu: hd.khu, khach: hd.khach, thangs: g.hoaDon.map(h => h.thang) });
      }).sort((a, b) => b.tongNo - a.tongNo);
    },

    dashboard() {
      const phongs = App.Phong.list();
      const thang = U.currentMonth(), thangTruoc = U.addMonths(thang, -1);
      const hds = scoped(App.HoaDon.all());
      const tts = scoped(App.ThanhToan.all());
      const dangThue = phongs.filter(p => p.trangThai === 'dangThue').length;
      const hopDongs = App.HopDong.list({ tinhTrang: 'conHieuLuc' });
      return {
        tongPhong: phongs.length,
        dangThue,
        trong: phongs.filter(p => p.trangThai === 'trong').length,
        baoTri: phongs.filter(p => p.trangThai === 'baoTri').length,
        lapDay: phongs.length ? Math.round(dangThue * 100 / phongs.length) : 0,
        thucThuThang: U.sum(tts.filter(t => t.ngay.slice(0, 7) === thang), t => t.soTien),
        thucThuThangTruoc: U.sum(tts.filter(t => t.ngay.slice(0, 7) === thangTruoc), t => t.soTien),
        tongNo: U.sum(hds, h => App.HoaDon.conLai(h)),
        soHoaDonNo: hds.filter(h => App.HoaDon.conLai(h) > 0).length,
        sapHetHan: hopDongs.filter(h => h.tinhTrangHD === 'sapHetHan' || h.tinhTrangHD === 'hetHan')
          .sort((a, b) => a.ngayKetThuc.localeCompare(b.ngayKetThuc)),
        quaHan: App.HoaDon.list({ trangThai: 'quaHan' }).sort((a, b) => a.hanThanhToan.localeCompare(b.hanThanhToan)),
        chuaChotThangTruoc: App.KhuTro.list().map(k => ({
          khu: k,
          thieu: App.ChiSo.bang(k.id, thangTruoc).filter(r => !r.daChot).length
        })).filter(x => x.thieu > 0)
      };
    }
  };
})();
