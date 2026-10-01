/* Trang đăng nhập */
$(function () {
  App.store.ensure();

  // Đã đăng nhập thì vào thẳng trang chủ theo vai trò
  const cur = App.auth.current();
  if (cur) { location.replace(App.auth.home(cur)); return; }

  $('#loginForm').on('submit', function (e) {
    e.preventDefault();
    const user = App.auth.login($('#username').val(), $('#password').val());
    if (!user) {
      $('#loginError').text('Tên đăng nhập hoặc mật khẩu không đúng.').removeClass('d-none');
      return;
    }
    location.href = App.auth.home(user);
  });

  $('.demo-accounts [data-u]').on('click', function () {
    $('#username').val($(this).data('u'));
    $('#password').val('123456');
    $('#loginError').addClass('d-none');
  });

  $('#togglePw').on('click', function () {
    const $pw = $('#password');
    const show = $pw.attr('type') === 'password';
    $pw.attr('type', show ? 'text' : 'password');
    $(this).find('i').toggleClass('bi-eye bi-eye-slash');
  });
});
