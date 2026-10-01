/* Sidebar + topbar dùng chung, menu lọc theo quyền của người dùng. */
(function () {
  const App = window.App;
  const U = App.utils;

  const ADMIN_MENU = [
    { group: 'Tổng quan', items: [
      { key: 'dashboard', href: 'dashboard.html', icon: 'speedometer2', text: 'Bảng điều khiển', perm: 'dashboard' }
    ] },
    { group: 'Quản lý', items: [
      { key: 'khu-tro', href: 'khu-tro.html', icon: 'buildings', text: 'Khu trọ', perm: 'khutro' },
      { key: 'phong', href: 'phong.html', icon: 'door-open', text: 'Phòng trọ', perm: 'phong.view' },
      { key: 'khach-thue', href: 'khach-thue.html', icon: 'people', text: 'Khách thuê', perm: 'khach.view' },
      { key: 'hop-dong', href: 'hop-dong.html', icon: 'file-earmark-text', text: 'Hợp đồng', perm: 'hopdong.view' }
    ] },
    { group: 'Tài chính', items: [
      { key: 'chot-dien-nuoc', href: 'chot-dien-nuoc.html', icon: 'lightning-charge', text: 'Chốt điện nước', perm: 'chiso' },
      { key: 'hoa-don', href: 'hoa-don.html', icon: 'receipt', text: 'Hóa đơn', perm: 'hoadon.view' },
      { key: 'cong-no', href: 'cong-no.html', icon: 'cash-coin', text: 'Công nợ', perm: 'congno' },
      { key: 'bao-cao', href: 'bao-cao.html', icon: 'bar-chart-line', text: 'Báo cáo doanh thu', perm: 'baocao' }
    ] },
    { group: 'Hệ thống', items: [
      { key: 'bao-hong', href: 'bao-hong.html', icon: 'tools', text: 'Báo hỏng', perm: 'baohong.xuly', badge: () => (App.BaoHong ? App.BaoHong.demMoi() : 0) },
      { key: 'nhan-vien', href: 'nhan-vien.html', icon: 'person-badge', text: 'Nhân viên', perm: 'nhanvien' },
      { key: 'cai-dat', href: 'cai-dat.html', icon: 'gear', text: 'Cài đặt', perm: 'caidat' }
    ] }
  ];

  const TENANT_MENU = [
    { group: 'Phòng của tôi', items: [
      { key: 'index', href: 'index.html', icon: 'house-door', text: 'Tổng quan' },
      { key: 'hop-dong', href: 'hop-dong.html', icon: 'file-earmark-text', text: 'Hợp đồng' },
      { key: 'hoa-don', href: 'hoa-don.html', icon: 'receipt', text: 'Hóa đơn' },
      { key: 'bao-hong', href: 'bao-hong.html', icon: 'tools', text: 'Báo hỏng' }
    ] },
    { group: 'Tài khoản', items: [
      { key: 'tai-khoan', href: 'tai-khoan.html', icon: 'person-circle', text: 'Tài khoản' }
    ] }
  ];

  function sidebarHtml(menu, active, user) {
    let nav = '';
    menu.forEach(g => {
      const items = g.items.filter(it => !it.perm || App.auth.can(it.perm, user));
      if (!items.length) return;
      nav += `<div class="nav-group">${g.group}</div>`;
      items.forEach(it => {
        const n = it.badge ? it.badge() : 0;
        nav += `<a class="side-link${it.key === active ? ' active' : ''}" href="${it.href}">
          <i class="bi bi-${it.icon}"></i><span>${it.text}</span>
          ${n ? `<span class="badge rounded-pill text-bg-danger">${n}</span>` : ''}</a>`;
      });
    });
    return `
      <div class="sidebar-brand">
        <div class="logo"><i class="bi bi-buildings-fill"></i></div>
        <div><div class="brand-name">${App.config.appName}</div><div class="brand-sub">${App.config.slogan}</div></div>
      </div>
      <nav class="sidebar-nav">${nav}</nav>
      <div class="sidebar-footer">© ${new Date().getFullYear()} ${App.config.appName} · Đồ án 2</div>`;
  }

  function topbarHtml(title, user) {
    const initials = user.hoTen.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
    const tenantLinks = user.role === 'tenant'
      ? `<li><a class="dropdown-item" href="tai-khoan.html"><i class="bi bi-person me-2"></i>Tài khoản</a></li>`
      : `<li><a class="dropdown-item" href="#" data-act="doi-mat-khau"><i class="bi bi-key me-2"></i>Đổi mật khẩu</a></li>`;
    return `
      <button class="btn btn-icon d-lg-none" id="btnSidebar" aria-label="Mở menu"><i class="bi bi-list"></i></button>
      <h1 class="topbar-title">${U.esc(title)}</h1>
      <div class="ms-auto dropdown">
        <button class="btn user-chip dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
          <span class="avatar">${U.esc(initials)}</span>
          <span class="d-none d-sm-inline text-start lh-sm">
            <span class="d-block fw-semibold">${U.esc(user.hoTen)}</span>
            <small class="text-muted">${U.label('role', user.role)}</small>
          </span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow-sm">
          ${tenantLinks}
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" data-act="logout"><i class="bi bi-box-arrow-right me-2"></i>Đăng xuất</a></li>
        </ul>
      </div>`;
  }

  async function doiMatKhau(user) {
    const r = await U.swal({
      title: 'Đổi mật khẩu',
      html: `<input type="password" id="pwOld" class="form-control mb-2" placeholder="Mật khẩu hiện tại">
             <input type="password" id="pwNew" class="form-control mb-2" placeholder="Mật khẩu mới (ít nhất 6 ký tự)">
             <input type="password" id="pwNew2" class="form-control" placeholder="Nhập lại mật khẩu mới">`,
      showCancelButton: true, confirmButtonText: 'Lưu',
      preConfirm: () => {
        try {
          App.NguoiDung.doiMatKhau(user.id, $('#pwOld').val(), $('#pwNew').val(), $('#pwNew2').val());
          return true;
        } catch (e) { Swal.showValidationMessage(e.message); return false; }
      }
    });
    if (r.isConfirmed) U.toast('Đã đổi mật khẩu');
  }

  App.layout = {
    /* active: key menu; title: tiêu đề trang */
    render(active, title) {
      const user = App.auth.current();
      const menu = user.role === 'tenant' ? TENANT_MENU : ADMIN_MENU;
      $('#appSidebar').html(sidebarHtml(menu, active, user));
      $('#appTopbar').html(topbarHtml(title, user));
      document.title = `${title} · ${App.config.appName}`;
      if (!$('.sidebar-backdrop').length) $('body').append('<div class="sidebar-backdrop"></div>');

      $('#btnSidebar').on('click', () => $('body').addClass('sidebar-open'));
      $('.sidebar-backdrop').on('click', () => $('body').removeClass('sidebar-open'));
      $('#appTopbar').on('click', '[data-act="logout"]', e => { e.preventDefault(); App.auth.logout(); });
      $('#appTopbar').on('click', '[data-act="doi-mat-khau"]', e => { e.preventDefault(); doiMatKhau(user); });

      $('body').removeClass('app-loading');

      const flash = App.store.getObj('flash');
      if (flash) { App.store.setObj('flash', null); U.toast(flash, 'warning'); }
      return user;
    },

    // Làm mới số đếm trên menu (vd: sau khi xử lý báo hỏng)
    refreshBadges(active) {
      const user = App.auth.current();
      const menu = user.role === 'tenant' ? TENANT_MENU : ADMIN_MENU;
      $('#appSidebar').html(sidebarHtml(menu, active, user));
    }
  };
})();
