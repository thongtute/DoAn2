/* Dữ liệu mẫu: 3 khu trọ, 30 phòng, 22 hợp đồng đang thuê + 1 hợp đồng đã thanh lý,
   chỉ số điện nước, hóa đơn và phiếu thu của 3 tháng gần nhất, vài yêu cầu báo hỏng.
   Ngày tháng tính tương đối theo hôm nay để luôn có ví dụ "nợ quá hạn", "sắp hết hạn"...
   Khi thay đổi dữ liệu mẫu nhớ tăng App.config.dataVersion. */
(function () {
  App.seed = function () {
    const S = App.store, C = App.config, U = App.utils;
    const homNay = U.today(), thangNay = U.currentMonth();
    const thang = n => U.addMonths(thangNay, n);              // tháng lệch n so với tháng này
    const ngay = (n, d) => `${thang(n)}-${U.pad(d)}`;         // ngày d của tháng lệch n
    const chuaQua = iso => (iso > homNay ? homNay : iso);    // không để ngày rơi vào tương lai

    // Số giả ngẫu nhiên có hạt giống cố định -> lần nạp nào cũng ra cùng một bộ dữ liệu
    let hat = 7;
    const rnd = (a, b) => { hat = (hat * 9301 + 49297) % 233280; return a + Math.floor(hat / 233280 * (b - a + 1)); };

    const chuTro = C.defaults.chuTro.hoTen, nhanVien = 'Nguyễn Trường Thông';

    /* ---------- Khu trọ ---------- */
    S.saveAll('khuTro', [
      {
        id: 'khu_a', ten: 'Khu A – Hòa Bình', diaChi: '25/4 Đường số 8, P. Linh Trung, TP. Thủ Đức',
        giaDien: 3500, giaNuoc: 18000, cachTinhNuoc: 'm3',
        dichVu: [{ ten: 'Internet', gia: 100000, tinhTheo: 'phong' }, { ten: 'Rác', gia: 20000, tinhTheo: 'phong' }],
        moTa: 'Gần ĐH Quốc gia, có bãi giữ xe rộng.'
      },
      {
        id: 'khu_b', ten: 'Khu B – An Phú', diaChi: '118 Nguyễn Duy Trinh, P. Bình Trưng Tây, TP. Thủ Đức',
        giaDien: 3800, giaNuoc: 100000, cachTinhNuoc: 'nguoi',
        dichVu: [{ ten: 'Internet', gia: 80000, tinhTheo: 'phong' }, { ten: 'Gửi xe', gia: 100000, tinhTheo: 'nguoi' }],
        moTa: 'Nước tính theo đầu người.'
      },
      {
        id: 'khu_c', ten: 'Khu C – Sen Vàng', diaChi: '7 Hẻm 42 Lê Văn Việt, P. Hiệp Phú, TP. Thủ Đức',
        giaDien: 3500, giaNuoc: 20000, cachTinhNuoc: 'm3',
        dichVu: [{ ten: 'Internet', gia: 100000, tinhTheo: 'phong' }, { ten: 'Rác', gia: 20000, tinhTheo: 'phong' }, { ten: 'Vệ sinh', gia: 30000, tinhTheo: 'phong' }],
        moTa: ''
      }
    ]);

    /* ---------- Phòng: [mã, khu, tầng, m², giá thuê, số người tối đa, trạng thái] ---------- */
    const PHONG = [
      ['A101', 'khu_a', 1, 22, 2500000, 3], ['A102', 'khu_a', 1, 18, 2300000, 2], ['A103', 'khu_a', 1, 20, 2400000, 3], ['A104', 'khu_a', 1, 25, 2600000, 4],
      ['A201', 'khu_a', 2, 20, 2200000, 2], ['A202', 'khu_a', 2, 19, 2200000, 2], ['A203', 'khu_a', 2, 24, 2500000, 3], ['A204', 'khu_a', 2, 17, 2100000, 2],
      ['A301', 'khu_a', 3, 21, 2100000, 3], ['A302', 'khu_a', 3, 20, 2000000, 2], ['A303', 'khu_a', 3, 18, 2000000, 2, 'baoTri'], ['A304', 'khu_a', 3, 23, 2200000, 3],
      ['B101', 'khu_b', 1, 16, 1800000, 2], ['B102', 'khu_b', 1, 18, 1900000, 2], ['B103', 'khu_b', 1, 20, 2100000, 3], ['B104', 'khu_b', 1, 16, 1800000, 2], ['B105', 'khu_b', 1, 22, 2300000, 3],
      ['B201', 'khu_b', 2, 18, 2000000, 2], ['B202', 'khu_b', 2, 18, 2000000, 2], ['B203', 'khu_b', 2, 20, 2100000, 3], ['B204', 'khu_b', 2, 24, 2400000, 4], ['B205', 'khu_b', 2, 16, 1800000, 2],
      ['C101', 'khu_c', 1, 25, 2800000, 4], ['C102', 'khu_c', 1, 20, 2500000, 3], ['C103', 'khu_c', 1, 20, 2500000, 3], ['C104', 'khu_c', 1, 18, 2300000, 2],
      ['C201', 'khu_c', 2, 22, 2600000, 3], ['C202', 'khu_c', 2, 20, 2500000, 3], ['C203', 'khu_c', 2, 18, 2300000, 2, 'baoTri'], ['C204', 'khu_c', 2, 26, 3000000, 4]
    ];
    const phongTheoMa = {};
    PHONG.forEach(([ma, khuId, tang, dienTich, giaThue, soNguoiToiDa, trangThai]) => {
      phongTheoMa[ma] = {
        id: 'p_' + ma.toLowerCase(), khuId, maPhong: ma, tang, dienTich, giaThue, soNguoiToiDa,
        tienNghi: C.tienNghi.filter((t, i) => i === 2 || rnd(0, 2) === 0), // luôn có WC riêng
        moTa: '', trangThai: trangThai || 'trong'
      };
    });

    /* ---------- Khách thuê (người đại diện) ----------
       [phòng, họ tên, SĐT, giới tính, năm sinh, quê quán, nghề nghiệp, số người ở, bắt đầu cách đây (tháng)] */
    const KHACH = [
      ['A101', 'Nguyễn Văn An', '0912000100', 'Nam', 1998, 'Bình Định', 'Nhân viên văn phòng', 2, 8],
      ['A102', 'Trần Thị Bích Ngọc', '0912000101', 'Nữ', 2001, 'Long An', 'Sinh viên', 1, 6],
      ['A103', 'Lê Hoàng Phúc', '0912000102', 'Nam', 1996, 'Tiền Giang', 'Kỹ sư phần mềm', 2, 0],
      ['A201', 'Phạm Minh Tuấn', '0913115239', 'Nam', 1999, 'Quảng Ngãi', 'Shipper', 2, 7],
      ['A202', 'Võ Thị Thu Hà', '0912000104', 'Nữ', 2002, 'Đồng Tháp', 'Sinh viên', 1, 4],
      ['A203', 'Đặng Quốc Bảo', '0912000105', 'Nam', 1995, 'Nghệ An', 'Thợ điện', 3, 9],
      ['A301', 'Bùi Thị Mai Anh', '0912000106', 'Nữ', 2000, 'Bến Tre', 'Kế toán', 2, 5],
      ['A302', 'Huỳnh Tấn Phát', '0912000107', 'Nam', 2003, 'Cà Mau', 'Sinh viên', 2, 3],
      ['A304', 'Ngô Thị Lan', '0912000108', 'Nữ', 1997, 'Huế', 'Giáo viên', 2, 0],
      ['B101', 'Hoàng Văn Nam', '0912000109', 'Nam', 1994, 'Thanh Hóa', 'Tài xế', 2, 8],
      ['B102', 'Phan Thị Thanh Thủy', '0912000110', 'Nữ', 2001, 'Vĩnh Long', 'Nhân viên bán hàng', 1, 5],
      ['B103', 'Trịnh Minh Khôi', '0912000111', 'Nam', 1999, 'Hà Tĩnh', 'Công nhân', 3, 7],
      ['B105', 'Dương Văn Khánh', '0912000112', 'Nam', 1993, 'Đắk Lắk', 'Thợ hồ', 3, 6],
      ['B201', 'Đỗ Thị Hồng Nhung', '0912000113', 'Nữ', 2002, 'Bình Thuận', 'Sinh viên', 2, 4],
      ['B203', 'Lý Thị Kim Ngân', '0912000114', 'Nữ', 1998, 'Sóc Trăng', 'Nhân viên spa', 2, 9],
      ['B204', 'Cao Văn Lực', '0912000115', 'Nam', 1990, 'Nam Định', 'Bảo vệ', 4, 5],
      ['C101', 'Tạ Quang Huy', '0912000116', 'Nam', 1997, 'Quảng Nam', 'Lập trình viên', 3, 8],
      ['C102', 'Lương Thị Diễm', '0912000117', 'Nữ', 2000, 'An Giang', 'Điều dưỡng', 2, 6],
      ['C103', 'Vũ Đức Thắng', '0912000118', 'Nam', 1996, 'Hải Phòng', 'Kỹ thuật viên', 2, 3],
      ['C201', 'Châu Ngọc Hân', '0912000119', 'Nữ', 2003, 'Kiên Giang', 'Sinh viên', 2, 7],
      ['C202', 'Mai Thị Yến Nhi', '0912000120', 'Nữ', 1999, 'Phú Yên', 'Nhân viên ngân hàng', 2, 0],
      ['C204', 'Kiều Minh Tâm', '0912000121', 'Nam', 1995, 'Bình Dương', 'Kinh doanh tự do', 3, 1]
    ];
    // Hợp đồng có ngày kết thúc cố định theo số ngày so với hôm nay (ví dụ hết hạn / sắp hết hạn)
    const KET_THUC = { A103: -21, A304: 21, C202: 26 };

    const cccd = (nam, gt, i) => '079' + ((nam >= 2000 ? 2 : 0) + (gt === 'Nữ' ? 1 : 0)) + String(nam % 100).padStart(2, '0') + String(100000 + i * 7919).slice(-6);
    const khachs = [], hopDongs = [];

    KHACH.forEach(([ma, hoTen, sdt, gioiTinh, nam, queQuan, ngheNghiep, soNguoiO, cachDay], i) => {
      const p = phongTheoMa[ma];
      const khach = {
        id: 'kh_' + (i + 1), hoTen, sdt, cccd: cccd(nam, gioiTinh, i + 1),
        ngaySinh: `${nam}-${U.pad(rnd(1, 12))}-${U.pad(rnd(1, 28))}`, gioiTinh, queQuan, email: '', ngheNghiep
      };
      let bd, kt;
      if (KET_THUC[ma] !== undefined) { kt = U.addDays(homNay, KET_THUC[ma]); bd = U.addMonthsToDate(kt, -12); }
      else { bd = chuaQua(ngay(-cachDay, rnd(1, 28))); kt = U.addMonthsToDate(bd, 12); }
      const ngayLap = U.addDays(bd, -rnd(1, 5));
      khachs.push(khach);
      hopDongs.push({
        id: 'hd_' + (i + 1), phongId: p.id, khachId: khach.id,
        ngayLap, ngayBatDau: bd, ngayKetThuc: kt,
        giaThue: p.giaThue, tienCoc: p.giaThue, soNguoiO,
        chiSoDienDau: rnd(8, 40) * 50, chiSoNuocDau: p.khuId === 'khu_b' ? 0 : rnd(10, 60) * 5,
        ghiChu: '', trangThai: 'hieuLuc',
        lichSu: [{ ngay: ngayLap, noiDung: 'Lập hợp đồng', nguoi: p.khuId === 'khu_a' ? nhanVien : chuTro }]
      });
      p.trangThai = 'dangThue';
    });

    // Một hợp đồng cũ đã thanh lý (phòng B104 hiện đang trống)
    const khCu = { id: 'kh_' + (KHACH.length + 1), hoTen: 'Nguyễn Thị Mỹ Duyên', sdt: '0912000199', cccd: cccd(2000, 'Nữ', 99), ngaySinh: '2000-04-18', gioiTinh: 'Nữ', queQuan: 'Tây Ninh', email: '', ngheNghiep: 'Sinh viên' };
    const bdCu = ngay(-16, 5), ktCu = U.addMonthsToDate(bdCu, 12), coc = phongTheoMa.B104.giaThue;
    khachs.push(khCu);
    hopDongs.push({
      id: 'hd_' + (KHACH.length + 1), phongId: phongTheoMa.B104.id, khachId: khCu.id,
      ngayLap: U.addDays(bdCu, -2), ngayBatDau: bdCu, ngayKetThuc: ktCu,
      giaThue: coc, tienCoc: coc, soNguoiO: 1, chiSoDienDau: 300, chiSoNuocDau: 0, ghiChu: '',
      trangThai: 'thanhLy', ngayThanhLy: ktCu, ghiChuThanhLy: 'Hết hạn, khách không gia hạn.',
      ketQuaThanhLy: { tienCoc: coc, truCoc: 0, hoanLai: coc, conPhaiThu: 0 },
      lichSu: [
        { ngay: U.addDays(bdCu, -2), noiDung: 'Lập hợp đồng', nguoi: chuTro },
        { ngay: ktCu, noiDung: `Thanh lý hợp đồng, hoàn cọc ${U.money(coc)}`, nguoi: chuTro }
      ]
    });

    // Mã hợp đồng tăng dần theo ngày bắt đầu
    hopDongs.slice().sort((a, b) => a.ngayBatDau.localeCompare(b.ngayBatDau))
      .forEach((h, i) => { h.ma = 'HDT-' + String(i + 1).padStart(4, '0'); });

    S.saveAll('khachThue', khachs);
    S.saveAll('hopDong', hopDongs);
    S.saveAll('phong', Object.values(phongTheoMa)); // trạng thái "đang thuê" đã được gắn theo hợp đồng

    /* ---------- Tài khoản ---------- */
    const users = [
      { id: 'u_admin', username: 'admin', password: '123456', hoTen: chuTro, role: 'owner', active: true },
      { id: 'u_nv1', username: 'nhanvien', password: '123456', hoTen: nhanVien, sdt: '0938222333', role: 'staff', khuIds: ['khu_a'], active: true }
    ];
    khachs.forEach((k, i) => users.push({
      id: 'u_kh' + (i + 1), username: k.sdt, password: C.matKhauMacDinh, hoTen: k.hoTen, role: 'tenant', khachId: k.id, active: true
    }));
    S.saveAll('users', users);

    /* ---------- Chỉ số, hóa đơn, phiếu thu của 3 tháng gần nhất ----------
       - Tháng trước của Khu B chưa chốt điện nước (để dashboard có việc cần làm).
       - NO: phòng -> { tháng lệch: số tiền đã thu } cho các hóa đơn còn nợ. */
    const NO = {
      A201: { '-2': 0, '-1': 0 },
      A102: { '-1': 1050000 },
      B105: { '-2': 0 },
      B203: { '-2': 1500000 }
    };
    const PHUONG_THUC = ['tienMat', 'chuyenKhoan'];

    hopDongs.filter(h => h.trangThai === 'hieuLuc').forEach(hd => {
      const p = S.get('phong', hd.phongId);
      let dien = hd.chiSoDienDau, nuoc = hd.chiSoNuocDau;

      [-3, -2, -1].forEach(n => {
        const t = thang(n);
        if (t < U.monthOf(hd.ngayBatDau)) return;
        if (n === -1 && p.khuId === 'khu_b') return;

        const theoM3 = p.khuId !== 'khu_b';
        const cs = S.insert('chiSo', {
          phongId: p.id, hopDongId: hd.id, khuId: p.khuId, thang: t,
          dienCu: dien, dienMoi: dien + rnd(18, 55) * hd.soNguoiO,
          nuocCu: theoM3 ? nuoc : null, nuocMoi: theoM3 ? nuoc + rnd(2, 4) * hd.soNguoiO : null,
          ngayChot: chuaQua(ngay(n + 1, 1)), nguoiChot: p.khuId === 'khu_a' ? nhanVien : chuTro
        }, 'cs');
        dien = cs.dienMoi;
        if (theoM3) nuoc = cs.nuocMoi;

        const hoaDon = S.insert('hoaDon', Object.assign(App.HoaDon.tinh(hd, t, cs), {
          ma: App.HoaDon.nextMa(t), ngayTao: chuaQua(ngay(n + 1, 1))
        }), 'hdn');

        let daThu = hoaDon.tongTien;
        const no = NO[p.maPhong];
        if (no && no[n] !== undefined) daThu = Math.min(no[n], hoaDon.tongTien);
        else if (n === -1 && rnd(0, 2) === 0) daThu = 0; // hóa đơn tháng trước chưa tới hạn, khách chưa trả

        if (daThu > 0) {
          const ngayThu = chuaQua(ngay(n + 1, rnd(2, 9)));
          S.insert('thanhToan', {
            ma: App.ThanhToan.nextMa(ngayThu),
            hoaDonId: hoaDon.id, hopDongId: hd.id, khuId: p.khuId, phongId: p.id, khachId: hd.khachId,
            soTien: daThu, ngay: ngayThu, phuongThuc: PHUONG_THUC[rnd(0, 1)], ghiChu: '',
            nguoiThu: p.khuId === 'khu_a' ? nhanVien : chuTro
          }, 'tt');
        }
        S.update('hoaDon', hoaDon.id, { daThu, trangThai: App.HoaDon.trangThai(Object.assign({}, hoaDon, { daThu })) });
      });
    });

    /* ---------- Báo hỏng ---------- */
    const hdCuaPhong = ma => hopDongs.find(h => h.phongId === phongTheoMa[ma].id && h.trangThai === 'hieuLuc');
    const baoHong = (ma, tieuDe, noiDung, mucDo, trangThai, cachDay, xuLy) => {
      const hd = hdCuaPhong(ma);
      return Object.assign({
        id: U.uid('bh'), phongId: hd.phongId, khachId: hd.khachId, hopDongId: hd.id,
        tieuDe, noiDung, mucDo, trangThai, ngayTao: U.addDays(homNay, -cachDay), phanHoi: ''
      }, xuLy || {});
    };
    S.saveAll('baoHong', [
      baoHong('A101', 'Vòi sen bị rò nước', 'Vòi sen trong nhà tắm bị rỉ nước liên tục, ban đêm nghe rất rõ.', 'trungBinh', 'moi', 1),
      baoHong('A201', 'Máy lạnh không mát', 'Máy lạnh chạy nhưng không ra hơi lạnh, có tiếng kêu lạ ở cục nóng.', 'cao', 'moi', 2),
      baoHong('B102', 'Bóng đèn hành lang bị cháy', 'Bóng đèn trước cửa phòng B102 bị cháy, buổi tối đi lại rất tối.', 'thap', 'dangXuLy', 6,
        { phanHoi: 'Đã báo thợ điện, dự kiến thay trong tuần này.', nguoiXuLy: chuTro }),
      baoHong('C101', 'Ổ khóa cửa bị kẹt', 'Ổ khóa cửa chính bị kẹt, phải vặn nhiều lần mới mở được.', 'trungBinh', 'xong', 20,
        { phanHoi: 'Đã thay ổ khóa mới.', nguoiXuLy: chuTro, ngayXuLy: U.addDays(homNay, -18) })
    ]);
  };
})();
