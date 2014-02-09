$(function () {
    var $localUsername = localStorage.username;
    var $localPassword = localStorage.password;
    var $localRemember = localStorage.remember;

    $('[role=form]').on({
        submit: function (e) {
            if ($localUsername && $localRemember) {
                var $username = $localUsername;
            } else {
                var $username = $('[data-access="username"]').val();
            }
            $('[data-access="username"]').val($username);
            if ($localPassword && $localRemember) {
                var $password = $localPassword;
            } else {
                var $password = CryptoJS.MD5($('[data-access="password"]').val()).toString(CryptoJS.enc.Hex);
            }
            $('[data-access="password"]').val($password);
            if ($localRemember) {
                var $remember = $localRemember

            } else {
                var $remember = $('[data-access="remember"]').is(':checked');
            }
            $('[data-access="remember"]').prop(':checked', $remember);
            if ($remember) {
                localStorage['username'] = $username;
                localStorage['password'] = $password;
                localStorage['remember'] = $remember;
            }
        }
    });

    if ($localUsername && $localPassword && $localRemember) {
        $('[role=form]').submit();
    }
});
