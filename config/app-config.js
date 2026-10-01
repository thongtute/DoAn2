/* Cấu hình chung của hệ thống. Các giá trị trong `defaults` có thể ghi đè ở trang Cài đặt. */
window.App = window.App || {};

App.config = {
  appName: 'TroPro',
  slogan: 'Quản lý phòng trọ dễ dàng',
  storagePrefix: 'tropro_',
  // Tăng số này khi thay đổi cấu trúc dữ liệu mẫu -> dữ liệu sẽ được nạp lại.
  dataVersion: 2,
  matKhauMacDinh: '123456',
  // Hợp đồng còn <= số ngày này thì được coi là "sắp hết hạn".
  ngayNhacHetHan: 30,

  defaults: {
    chuTro: {
      hoTen: 'Trần Minh Quân',
      sdt: '0909123456',
      cccd: '079085001234',
      diaChi: '12 Lê Lợi, P. Bến Nghé, Q.1, TP. Hồ Chí Minh'
    },
    nganHang: {
      bankId: 'MB',
      accountNo: '0909123456',
      accountName: 'TRAN MINH QUAN',
      demo: true // true = tài khoản mẫu, chưa được chủ trọ cập nhật
    },
    giaDien: 3500,
    giaNuoc: 20000,
    ngayHanThanhToan: 10 // hạn thanh toán: ngày 10 của tháng kế tiếp
  },

  banks: [
    { id: 'VCB', ten: 'Vietcombank' },
    { id: 'TCB', ten: 'Techcombank' },
    { id: 'MB', ten: 'MB Bank' },
    { id: 'ACB', ten: 'ACB' },
    { id: 'BIDV', ten: 'BIDV' },
    { id: 'ICB', ten: 'VietinBank' },
    { id: 'VBA', ten: 'Agribank' },
    { id: 'TPB', ten: 'TPBank' },
    { id: 'VPB', ten: 'VPBank' },
    { id: 'STB', ten: 'Sacombank' },
    { id: 'VIB', ten: 'VIB' },
    { id: 'OCB', ten: 'OCB' }
  ],

  tienNghi: ['Máy lạnh', 'Nóng lạnh', 'WC riêng', 'Gác lửng', 'Ban công', 'Tủ lạnh', 'Giường', 'Tủ quần áo', 'Kệ bếp', 'Cửa sổ']
};
