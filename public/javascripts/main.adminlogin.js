$(function () {
    var $localAdmiUsername = localStorage.adminusername;
    var $localAdminPassword = localStorage.adminpassword;
    var $localAdminRemember = localStorage.adminremember;

    $('[role=form]').on({
        submit: function (e) {
            if ($localAdmiUsername && $localAdminRemember) {
                var $username = $localAdmiUsername;
            } else {
                var $username = $('[data-access="username"]').val();
            }
            $('[data-access="username"]').val($username);
            if ($localAdminPassword && $localAdminRemember) {
                var $password = $localAdminPassword;
            } else {
                var $password = CryptoJS.MD5($('[data-access="password"]').val()).toString(CryptoJS.enc.Hex);
            }
            $('[data-access="password"]').val($password);
            if ($localAdminRemember) {
                var $remember = $localAdminRemember

            } else {
                var $remember = $('[data-access="remember"]').is(':checked');
            }
            $('[data-access="remember"]').prop(':checked', $remember);
            if ($remember) {
                localStorage['adminusername'] = $username;
                localStorage['adminpassword'] = $password;
                localStorage['adminremember'] = $remember;
            }
        }
    });

    if ($localAdmiUsername && $localAdminPassword && $localAdminRemember) {
        $('[role=form]').submit();
    }
});
