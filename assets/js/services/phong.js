/* Phòng trọ. Trạng thái lưu: trong | dangThue | baoTri.
   Trạng thái "dangThue" chỉ được đặt bởi nghiệp vụ hợp đồng, không sửa tay. */
(function () {
  const S = App.store;

  const cmpMa = (a, b) => a.maPhong.localeCompare(b.maPhong, 'vi', { numeric: true });

  App.Phong = {
    all() { return S.all('phong'); },
    get(id) { return S.get('phong', id); },

    list(f) {
      f = f || {};
      const ids = App.auth.scopeKhuIds();
      const khuTen = {};
      App.KhuTro.all().forEach(k => { khuTen[k.id] = k.ten; });
      return this.all()
        .filter(p => (!ids || ids.includes(p.khuId))
          && (!f.khuId || p.khuId === f.khuId)
          && (!f.trangThai || p.trangThai === f.trangThai)
          && (f.tang === undefined || f.tang === null || f.tang === '' || String(p.tang) === String(f.tang)))
        .sort((a, b) => a.khuId === b.khuId ? cmpMa(a, b) : (khuTen[a.khuId] || '').localeCompare(khuTen[b.khuId] || '', 'vi'));
    },

    floors(khuId) {
      return [...new Set(this.list({ khuId }).map(p => p.tang))].sort((a, b) => a - b);
    },

    activeContract(phongId) {
      return S.find('hopDong', h => h.phongId === phongId && h.trangThai === 'hieuLuc');
    },

    /* Gắn thêm khu, hợp đồng hiện tại, người đại diện, công nợ và trạng thái hiển thị (màu thẻ phòng). */
    enrich(p) {
      const hd = this.activeContract(p.id);
      const no = hd ? App.HoaDon.congNoHopDong(hd.id) : { tong: 0, quaHan: false };
      const tt = hd ? App.HopDong.tinhTrang(hd) : null;
      let hienThi = p.trangThai;
      if (p.trangThai === 'dangThue') {
        if (no.quaHan) hienThi = 'no';
        else if (tt === 'sapHetHan' || tt === 'hetHan') hienThi = 'sapHetHan';
      }
      return Object.assign({}, p, {
        khu: App.KhuTro.get(p.khuId),
        hopDong: hd,
        khach: hd ? App.Khach.get(hd.khachId) : null,
        no: no.tong,
        quaHan: no.quaHan,
        tinhTrangHD: tt,
        hienThi
      });
    },

    save(d) {
      const maPhong = (d.maPhong || '').trim().toUpperCase();
      if (!d.khuId) throw new Error('Vui lòng chọn khu trọ.');
      if (!App.auth.canKhu(d.khuId)) throw new Error('Bạn không được phân công quản lý khu trọ này.');
      if (!maPhong) throw new Error('Vui lòng nhập mã phòng.');
      if (!(Number(d.giaThue) > 0)) throw new Error('Giá thuê phải lớn hơn 0.');
      const dup = this.all().find(p => p.khuId === d.khuId && p.maPhong.toUpperCase() === maPhong && p.id !== d.id);
      if (dup) throw new Error(`Mã phòng ${maPhong} đã tồn tại trong khu này.`);

      const rec = {
        khuId: d.khuId,
        maPhong,
        tang: Number(d.tang) || 1,
        dienTich: Number(d.dienTich) || 0,
        giaThue: Number(d.giaThue),
        soNguoiToiDa: Math.max(1, Number(d.soNguoiToiDa) || 1),
        tienNghi: d.tienNghi || [],
        moTa: d.moTa || ''
      };

      if (d.id) {
        const old = this.get(d.id);
        if (!old) throw new Error('Không tìm thấy phòng.');
        if (!App.auth.canKhu(old.khuId)) throw new Error('Bạn không được phân công quản lý khu trọ này.');
        if (old.trangThai === 'dangThue') {
          if (old.khuId !== d.khuId) throw new Error('Phòng đang cho thuê, không thể chuyển sang khu khác.');
          const hd = this.activeContract(old.id);
          if (hd && rec.soNguoiToiDa < hd.soNguoiO) throw new Error(`Phòng đang có ${hd.soNguoiO} người ở, số người tối đa không được nhỏ hơn.`);
          rec.trangThai = 'dangThue';
        } else {
          rec.trangThai = d.trangThai === 'baoTri' ? 'baoTri' : 'trong';
        }
        return S.update('phong', d.id, rec);
      }
      rec.trangThai = d.trangThai === 'baoTri' ? 'baoTri' : 'trong';
      return S.insert('phong', rec, 'p');
    },

    remove(id) {
      const p = this.get(id);
      if (!p) return;
      if (S.filter('hopDong', h => h.phongId === id).length) {
        throw new Error('Phòng đã có hợp đồng nên không thể xóa (cần giữ lịch sử). Bạn có thể chuyển phòng sang "Bảo trì".');
      }
      S.saveAll('chiSo', S.all('chiSo').filter(c => c.phongId !== id));
      S.remove('phong', id);
    }
  };
})();
