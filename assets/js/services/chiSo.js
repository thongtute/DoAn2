/* Chỉ số điện nước theo phòng và tháng ('YYYY-MM'). */
(function () {
  const S = App.store, U = App.utils;

  App.ChiSo = {
    all() { return S.all('chiSo'); },
    get(phongId, thang) { return S.find('chiSo', c => c.phongId === phongId && c.thang === thang); },

    forPhong(phongId) {
      return S.filter('chiSo', c => c.phongId === phongId).sort((a, b) => b.thang.localeCompare(a.thang));
    },

    /* Chỉ số cũ của tháng = chỉ số mới của tháng gần nhất trước đó trong cùng hợp đồng,
       nếu chưa có thì lấy chỉ số đầu ghi trong hợp đồng. */
    prev(phongId, thang, hd) {
      const batDau = U.monthOf(hd.ngayBatDau);
      const truoc = S.filter('chiSo', c => c.phongId === phongId && c.thang < thang && c.thang >= batDau)
        .sort((a, b) => b.thang.localeCompare(a.thang))[0];
      return truoc
        ? { dien: truoc.dienMoi, nuoc: truoc.nuocMoi }
        : { dien: hd.chiSoDienDau, nuoc: hd.chiSoNuocDau };
    },

    /* Chỉ số mới nhất của phòng (gợi ý chỉ số đầu khi lập hợp đồng mới). */
    lastReading(phongId) {
      const c = this.forPhong(phongId)[0];
      return c ? { dien: c.dienMoi, nuoc: c.nuocMoi, thang: c.thang } : null;
    },

    /* Bảng chốt: các phòng đang thuê trong khu, hợp đồng bắt đầu từ tháng này trở về trước. */
    bang(khuId, thang) {
      const khu = App.KhuTro.get(khuId);
      if (!khu) return [];
      return App.Phong.list({ khuId })
        .map(p => {
          const hd = App.Phong.activeContract(p.id);
          if (!hd || U.monthOf(hd.ngayBatDau) > thang) return null;
          const cs = this.get(p.id, thang);
          const prev = this.prev(p.id, thang, hd);
          const hoaDon = S.find('hoaDon', h => h.hopDongId === hd.id && h.thang === thang);
          return {
            phong: p, hopDong: hd, khach: App.Khach.get(hd.khachId),
            dienCu: cs ? cs.dienCu : prev.dien,
            dienMoi: cs ? cs.dienMoi : null,
            nuocCu: cs ? cs.nuocCu : prev.nuoc,
            nuocMoi: cs ? cs.nuocMoi : null,
            daChot: !!cs,
            khoa: !!hoaDon, // đã có hóa đơn -> không sửa được chỉ số
            hoaDon
          };
        })
        .filter(Boolean);
    },

    /* rows: [{ phongId, dienMoi, nuocMoi }] ; bỏ qua dòng chưa nhập điện mới.
       Trả về { saved, errors[] } — dòng lỗi không được lưu. */
    luu(khuId, thang, rows) {
      if (!App.auth.canKhu(khuId)) throw new Error('Bạn không được phân công quản lý khu trọ này.');
      if (!thang) throw new Error('Vui lòng chọn tháng.');
      if (thang > U.currentMonth()) throw new Error('Không thể chốt chỉ số cho tháng trong tương lai.');
      const khu = App.KhuTro.get(khuId);
      const theoM3 = khu.cachTinhNuoc === 'm3';
      const bang = {};
      this.bang(khuId, thang).forEach(r => { bang[r.phong.id] = r; });
      const errors = [];
      let saved = 0;
      const arr = S.all('chiSo');

      rows.forEach(r => {
        const b = bang[r.phongId];
        if (!b || r.dienMoi === null || r.dienMoi === '' || r.dienMoi === undefined) return;
        const ma = b.phong.maPhong;
        if (b.khoa) { errors.push(`${ma}: đã có hóa đơn tháng này, không sửa được chỉ số.`); return; }
        const dienMoi = Number(r.dienMoi);
        if (!(dienMoi >= b.dienCu)) { errors.push(`${ma}: chỉ số điện mới (${dienMoi}) nhỏ hơn chỉ số cũ (${b.dienCu}).`); return; }
        let nuocMoi = null, nuocCu = null;
        if (theoM3) {
          if (r.nuocMoi === null || r.nuocMoi === '' || r.nuocMoi === undefined) { errors.push(`${ma}: chưa nhập chỉ số nước mới.`); return; }
          nuocMoi = Number(r.nuocMoi);
          nuocCu = b.nuocCu;
          if (!(nuocMoi >= nuocCu)) { errors.push(`${ma}: chỉ số nước mới (${nuocMoi}) nhỏ hơn chỉ số cũ (${nuocCu}).`); return; }
        }
        const rec = {
          phongId: b.phong.id, hopDongId: b.hopDong.id, khuId, thang,
          dienCu: b.dienCu, dienMoi, nuocCu, nuocMoi,
          ngayChot: U.today(), nguoiChot: App.auth.current().hoTen
        };
        const i = arr.findIndex(c => c.phongId === b.phong.id && c.thang === thang);
        if (i >= 0) arr[i] = Object.assign({}, arr[i], rec);
        else arr.push(Object.assign({ id: U.uid('cs') }, rec));
        saved++;
      });
      S.saveAll('chiSo', arr);
      return { saved, errors };
    }
  };
})();
