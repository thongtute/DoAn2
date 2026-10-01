/* Khu trọ: mỗi khu có giá điện/nước và các dịch vụ cố định riêng. */
(function () {
  const S = App.store;

  App.KhuTro = {
    all() { return S.all('khuTro'); },
    get(id) { return S.get('khuTro', id); },

    list() {
      const ids = App.auth.scopeKhuIds();
      return this.all()
        .filter(k => !ids || ids.includes(k.id))
        .sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));
    },

    stats(id) {
      const ps = S.filter('phong', p => p.khuId === id);
      const dangThue = ps.filter(p => p.trangThai === 'dangThue').length;
      return {
        tong: ps.length,
        dangThue,
        trong: ps.filter(p => p.trangThai === 'trong').length,
        baoTri: ps.filter(p => p.trangThai === 'baoTri').length,
        lapDay: ps.length ? Math.round(dangThue * 100 / ps.length) : 0
      };
    },

    save(d) {
      const ten = (d.ten || '').trim();
      if (!ten) throw new Error('Vui lòng nhập tên khu trọ.');
      if (!(d.giaDien >= 0) || !(d.giaNuoc >= 0)) throw new Error('Giá điện, nước không hợp lệ.');
      const dup = this.all().find(k => k.ten.toLowerCase() === ten.toLowerCase() && k.id !== d.id);
      if (dup) throw new Error('Tên khu trọ đã tồn tại.');
      const rec = {
        ten,
        diaChi: (d.diaChi || '').trim(),
        giaDien: Number(d.giaDien),
        giaNuoc: Number(d.giaNuoc),
        cachTinhNuoc: d.cachTinhNuoc === 'nguoi' ? 'nguoi' : 'm3',
        dichVu: (d.dichVu || []).filter(x => x.ten).map(x => ({
          ten: x.ten.trim(), gia: Number(x.gia) || 0, tinhTheo: x.tinhTheo === 'nguoi' ? 'nguoi' : 'phong'
        })),
        moTa: (d.moTa || '').trim()
      };
      if (d.id) return S.update('khuTro', d.id, rec);
      return S.insert('khuTro', rec, 'khu');
    },

    remove(id) {
      if (S.filter('phong', p => p.khuId === id).length) {
        throw new Error('Khu trọ vẫn còn phòng. Hãy xóa hoặc chuyển các phòng trước khi xóa khu.');
      }
      S.remove('khuTro', id);
      // Gỡ khu khỏi danh sách phân công của nhân viên
      S.all('users').forEach(u => {
        if (u.khuIds && u.khuIds.includes(id)) S.update('users', u.id, { khuIds: u.khuIds.filter(x => x !== id) });
      });
    }
  };
})();
