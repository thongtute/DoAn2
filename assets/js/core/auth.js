/* Đăng nhập, phiên làm việc và phân quyền theo vai trò. */
(function () {
  const App = window.App;
  const S = App.store;

  // Quyền của từng vai trò. Chủ trọ ('*') có mọi quyền quản trị.
  const PERMS = {
    owner: ['*'],
    staff: [
      'dashboard', 'phong.view', 'phong.edit', 'khach.view', 'khach.edit', 'hopdong.view', 'hopdong.edit',
      'chiso', 'hoadon.view', 'hoadon.create', 'thutien', 'congno', 'baohong.xuly'
    ],
    tenant: ['tenant']
  };
  const OWNER_ONLY_NOT = ['tenant']; // quyền chủ trọ không có

  const A = App.auth = {
    PERMS,

    login(username, password) {
      S.ensure();
      const u = String(username || '').trim().toLowerCase();
      const user = S.find('users', x => x.username.toLowerCase() === u && x.password === password);
      if (!user || user.active === false) return null;
      S.setObj('session', { userId: user.id, at: Date.now() });
      return user;
    },

    logout() {
      S.setObj('session', null);
      location.href = '../public/login.html';
    },

    current() {
      const s = S.getObj('session');
      return s ? S.get('users', s.userId) : null;
    },

    can(perm, user) {
      user = user || A.current();
      if (!user) return false;
      const ps = PERMS[user.role] || [];
      if (ps.includes('*')) return !OWNER_ONLY_NOT.includes(perm);
      return ps.includes(perm);
    },

    home(user) {
      return user && user.role === 'tenant' ? '../tenant/index.html' : '../admin/dashboard.html';
    },

    /* Gọi ở đầu mỗi trang. Chưa đăng nhập -> về trang login; không đủ quyền -> về trang chủ của vai trò. */
    guard(perm) {
      S.ensure();
      const user = A.current();
      if (!user) { location.replace('../public/login.html'); return null; }
      if (perm && !A.can(perm, user)) {
        S.setObj('flash', 'Bạn không có quyền truy cập trang đó.');
        location.replace(A.home(user));
        return null;
      }
      return user;
    },

    /* null = được xem mọi khu; mảng = chỉ các khu trong mảng. */
    scopeKhuIds() {
      const u = A.current();
      if (!u) return [];
      if (u.role === 'owner') return null;
      if (u.role === 'staff') return u.khuIds || [];
      return [];
    },

    canKhu(khuId) {
      const ids = A.scopeKhuIds();
      return ids === null || ids.includes(khuId);
    }
  };
})();
