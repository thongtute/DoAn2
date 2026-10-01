/* Tài khoản người dùng: nhân viên, tài khoản khách thuê, đổi mật khẩu. */
(function () {
  const S = App.store;

  App.NguoiDung = {
    staffList() {
      return S.filter('users', u => u.role === 'staff').map(u => Object.assign({}, u, {
        khus: (u.khuIds || []).map(id => App.KhuTro.get(id)).filter(Boolean)
      }));
    },

    /* d: { id?, hoTen, username, sdt, khuIds[], password?, active } */
    saveStaff(d) {
      if (!d.hoTen || !d.hoTen.trim()) throw new Error('Vui lòng nhập họ tên.');
      const username = (d.username || '').trim().toLowerCase();
      if (!/^[a-z0-9._]{3,30}$/.test(username)) throw new Error('Tên đăng nhập 3–30 ký tự, chỉ gồm chữ thường không dấu, số, dấu chấm, gạch dưới.');
      if (S.find('users', u => u.username.toLowerCase() === username && u.id !== d.id)) throw new Error('Tên đăng nhập đã tồn tại.');
      if (d.sdt && !/^0\d{9}$/.test(d.sdt)) throw new Error('Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.');
      if (!d.khuIds || !d.khuIds.length) throw new Error('Hãy phân công ít nhất một khu trọ.');
      const rec = { hoTen: d.hoTen.trim(), username, sdt: d.sdt || '', khuIds: d.khuIds, active: d.active !== false, role: 'staff' };
      if (d.id) return S.update('users', d.id, rec);
      if (!d.password || d.password.length < 6) throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
      return S.insert('users', Object.assign(rec, { password: d.password }), 'u');
    },

    removeStaff(id) {
      const u = S.get('users', id);
      if (!u || u.role !== 'staff') throw new Error('Không tìm thấy nhân viên.');
      S.remove('users', id);
    },

    resetPassword(id) {
      S.update('users', id, { password: App.config.matKhauMacDinh });
      return App.config.matKhauMacDinh;
    },

    doiMatKhau(userId, cu, moi, nhapLai) {
      const u = S.get('users', userId);
      if (!u || u.password !== cu) throw new Error('Mật khẩu hiện tại không đúng.');
      if (!moi || moi.length < 6) throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      if (moi !== nhapLai) throw new Error('Mật khẩu nhập lại không khớp.');
      S.update('users', userId, { password: moi });
    },

    /* Khi lập hợp đồng: tạo tài khoản đăng nhập cho người đại diện (username = SĐT). */
    ensureTenant(khach) {
      const co = S.find('users', u => u.khachId === khach.id);
      if (co) return { username: co.username, password: null, moi: false };
      let username = khach.sdt;
      if (S.find('users', u => u.username === username)) username = khach.cccd;
      S.insert('users', { username, password: App.config.matKhauMacDinh, hoTen: khach.hoTen, role: 'tenant', khachId: khach.id, active: true }, 'u');
      return { username, password: App.config.matKhauMacDinh, moi: true };
    }
  };
})();
