/* Khởi động trang: kiểm tra đăng nhập/quyền rồi dựng sidebar + topbar.
   Mỗi trang khai báo trên thẻ <body>:
     data-page  = key menu đang chọn
     data-title = tiêu đề trang
     data-perm  = quyền cần có (bỏ trống nếu chỉ cần đăng nhập) */
$(function () {
  const $b = $('body');
  const user = App.auth.guard($b.data('perm') || null);
  if (!user) return;
  App.layout.render($b.data('page'), $b.data('title'));
  $(document).trigger('app:ready', [user]);
});
