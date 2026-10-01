/* Lớp lưu trữ: mỗi collection là một key JSON trong LocalStorage.
   Có bộ nhớ đệm để không phải JSON.parse lại nhiều lần trong cùng một trang. */
(function () {
  const App = window.App;
  const mem = {};   // dự phòng khi trình duyệt chặn LocalStorage
  const cache = {}; // name -> mảng/đối tượng đã parse

  let ls = null;
  try {
    ls = window.localStorage;
    ls.setItem('__tropro_test', '1');
    ls.removeItem('__tropro_test');
  } catch (e) { ls = null; }

  const key = n => App.config.storagePrefix + n;

  function read(n) {
    if (n in cache) return cache[n];
    let v = null;
    try {
      const raw = ls ? ls.getItem(key(n)) : mem[n];
      v = raw ? JSON.parse(raw) : null;
    } catch (e) { v = null; }
    cache[n] = v;
    return v;
  }

  function write(n, v) {
    cache[n] = v;
    const raw = JSON.stringify(v);
    if (ls) {
      try { ls.setItem(key(n), raw); return; } catch (e) { console.warn('Không ghi được LocalStorage', e); }
    }
    mem[n] = raw;
  }

  // Tab khác thay đổi dữ liệu -> xóa cache để đọc lại
  window.addEventListener('storage', e => {
    if (e.key && e.key.indexOf(App.config.storagePrefix) === 0) delete cache[e.key.slice(App.config.storagePrefix.length)];
  });

  const S = App.store = {
    COLLECTIONS: ['users', 'khuTro', 'phong', 'khachThue', 'hopDong', 'chiSo', 'hoaDon', 'thanhToan', 'baoHong'],

    // Trả về bản sao nông của mảng; không sửa trực tiếp các phần tử trả về.
    all(n) { return (read(n) || []).slice(); },
    saveAll(n, arr) { write(n, arr); },
    get(n, id) { return (read(n) || []).find(x => x.id === id) || null; },
    find(n, fn) { return (read(n) || []).find(fn) || null; },
    filter(n, fn) { return (read(n) || []).filter(fn); },

    insert(n, obj, prefix) {
      const rec = Object.assign({}, obj, { id: obj.id || App.utils.uid(prefix || n) });
      write(n, S.all(n).concat([rec]));
      return rec;
    },
    update(n, id, patch) {
      const arr = S.all(n);
      const i = arr.findIndex(x => x.id === id);
      if (i < 0) throw new Error('Không tìm thấy dữ liệu cần cập nhật.');
      arr[i] = Object.assign({}, arr[i], patch, { id });
      write(n, arr);
      return arr[i];
    },
    remove(n, id) { write(n, S.all(n).filter(x => x.id !== id)); },

    getObj(n, def) { const v = read(n); return v === null ? (def === undefined ? null : def) : v; },
    setObj(n, v) { write(n, v); },

    /* Lần đầu chạy (hoặc khi đổi dataVersion) thì nạp dữ liệu mẫu. */
    ensure() {
      if (S.getObj('version') !== App.config.dataVersion) S.reset();
    },
    reset() {
      S.COLLECTIONS.forEach(c => write(c, []));
      write('settings', null);
      App.seed();
      write('version', App.config.dataVersion);
    },

    exportAll() {
      const out = { app: App.config.appName, version: App.config.dataVersion, exportedAt: new Date().toISOString(), settings: S.getObj('settings') };
      S.COLLECTIONS.forEach(c => { out[c] = S.all(c); });
      return out;
    },
    importAll(obj) {
      if (!obj || !Array.isArray(obj.users) || !Array.isArray(obj.phong)) throw new Error('File sao lưu không hợp lệ.');
      S.COLLECTIONS.forEach(c => write(c, Array.isArray(obj[c]) ? obj[c] : []));
      write('settings', obj.settings || null);
      write('version', App.config.dataVersion);
    }
  };
})();
