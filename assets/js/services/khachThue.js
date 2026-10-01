/* Khách thuê = người đại diện phòng (người ký hợp đồng và thanh toán). */
(function () {
  const S = App.store;

  App.Khach = {
    all() { return S.all('khachThue'); },
    get(id) { return S.get('khachThue', id); },

    activeContract(khachId) {
      return S.find('hopDong', h => h.khachId === khachId && h.trangThai === 'hieuLuc');
    },

    list() {
      const ids = App.auth.scopeKhuIds();
      const hds = S.all('hopDong');
      return this.all().map(k => {
        const cuaKhach = hds.filter(h => h.khachId === k.id).sort((a, b) => b.ngayBatDau.localeCompare(a.ngayBatDau));
        const active = cuaKhach.find(h => h.trangThai === 'hieuLuc') || null;
        const ganNhat = active || cuaKhach[0] || null;
        const phong = ganNhat ? App.Phong.get(ganNhat.phongId) : null;
        return Object.assign({}, k, {
          hopDong: active,
          hopDongGanNhat: ganNhat,
          soHopDong: cuaKhach.length,
          phong,
          khu: phong ? App.KhuTro.get(phong.khuId) : null,
          user: S.find('users', u => u.khachId === k.id)
        });
      }).filter(k => !ids || (k.phong && ids.includes(k.phong.khuId)));
    },

    /* Kiểm tra dữ liệu khách; dùng cho cả sửa khách và lập hợp đồng. */
    validate(d, id) {
      if (!d.hoTen || !d.hoTen.trim()) throw new Error('Vui lòng nhập họ tên người đại diện.');
      if (!/^0\d{9}$/.test(d.sdt || '')) throw new Error('Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.');
      if (!/^\d{12}$/.test(d.cccd || '')) throw new Error('Số CCCD gồm 12 chữ số.');
      const all = this.all();
      if (all.find(k => k.sdt === d.sdt && k.id !== id)) throw new Error(`Số điện thoại ${d.sdt} đã thuộc về khách khác.`);
      const dupCccd = all.find(k => k.cccd === d.cccd && k.id !== id);
      if (dupCccd) throw new Error(`CCCD ${d.cccd} đã có trong hệ thống (khách ${dupCccd.hoTen}). Hãy chọn "Khách cũ".`);
    },

    pick(d) {
      return {
        hoTen: d.hoTen.trim(), sdt: d.sdt, cccd: d.cccd,
        ngaySinh: d.ngaySinh || '', gioiTinh: d.gioiTinh || '', queQuan: (d.queQuan || '').trim(),
        email: (d.email || '').trim(), ngheNghiep: (d.ngheNghiep || '').trim()
      };
    },

    create(d) {
      this.validate(d);
      return S.insert('khachThue', this.pick(d), 'kh');
    },

    save(d) {
      const old = this.get(d.id);
      if (!old) throw new Error('Không tìm thấy khách thuê.');
      this.validate(d, d.id);
      const rec = S.update('khachThue', d.id, this.pick(d));
      // Tên đăng nhập của khách là SĐT -> cập nhật theo nếu chưa bị đổi
      const user = S.find('users', u => u.khachId === d.id);
      if (user) {
        const patch = { hoTen: rec.hoTen };
        if (user.username === old.sdt && old.sdt !== rec.sdt && !S.find('users', u => u.username === rec.sdt)) patch.username = rec.sdt;
        S.update('users', user.id, patch);
      }
      return rec;
    },

    remove(id) {
      if (S.filter('hopDong', h => h.khachId === id).length) throw new Error('Khách đã có hợp đồng, không thể xóa (cần giữ lịch sử).');
      const user = S.find('users', u => u.khachId === id);
      if (user) S.remove('users', user.id);
      S.remove('khachThue', id);
    }
  };
})();
