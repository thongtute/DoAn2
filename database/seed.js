/* Dữ liệu mẫu.
   Giai đoạn dựng khung giao diện: chỉ có tài khoản đăng nhập để thử menu theo vai trò.
   Khi nối dữ liệu thật sẽ bổ sung khu trọ, phòng, hợp đồng, hóa đơn... (nhớ tăng App.config.dataVersion). */
(function () {
  App.seed = function () {
    const S = App.store, C = App.config;

    S.saveAll('users', [
      { id: 'u_admin', username: 'admin', password: '123456', hoTen: C.defaults.chuTro.hoTen, role: 'owner', active: true },
      { id: 'u_nv1', username: 'nhanvien', password: '123456', hoTen: 'Nguyễn Trường Thông', role: 'staff', khuIds: ['khu_a'], active: true },
      { id: 'u_kh1', username: '0912000100', password: '123456', hoTen: 'Nguyễn Văn An', role: 'tenant', khachId: 'kh_1', active: true }
    ]);
  };
})();
