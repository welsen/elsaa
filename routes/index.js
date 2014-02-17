/*
 * GET home page.
 */

var md5 = require('crypto-js/md5');
var log4js = require('log4js');
log4js.configure({
    appenders: [
        {
            type: 'console'
        },
        {
            type: 'file',
            filename: 'logs/server.log',
            category: 'server'
        }
  ]
});
var logger = log4js.getLogger('server');
var us = require('underscore');

var Main = (function () {
    function Main() {}
    Main.prototype.Index = function (req, res) {
        if (req.session.user) {
            // logger.debug(req.session.user);
            res.render('main/index', {
                title: 'ELSAA',
                page: 'main/index'
            });
        } else {
            res.redirect('/login');
        }
    };

    Main.prototype.Login = function (req, res) {
        res.render('main/login', {
            title: 'ELSAA Login',
            page: 'main/login',
            locale: {
                'signInHeading': 'Please sign in',
                'username': 'Username',
                'password': 'Password',
                'rememberMe': 'Remember me',
                'loginHelp': 'For admin login click <a href="/admin">here</a>',
                'signIn': 'Sign in'
            }
        });
    };

    Main.prototype.LoginAuthenticate = function (req, res) {
        var username = req.body.username;
        var password = md5(req.body.password).toString();
        // logger.debug(password);
        global.acl.Authenticate(username, password, function (result) {
            if (result !== false) {
                req.session.user = result;
                res.redirect('/');
            } else {
                res.redirect('/login');
            }
        });
    };

    Main.prototype.Logout = function (req, res) {
        if (req.session.user) {
            delete req.session.user;
        }
        res.redirect('/login');
    };

    return Main;
})();

var Admin = (function () {
    function Admin() {}
    Admin.prototype.Index = function (req, res) {
        if (req.session.adminuser) {
            // logger.debug(req.session.user);
            res.render('admin/index', {
                title: 'ELSAA Admin',
                page: 'admin/index',
                permissions: req.session.adminuser.permissions,
                perms: req.session.adminuser.perms,
                subpage: 'dashboard'
            });
        } else {
            res.redirect('/admin/login');
        }
    };

    Admin.prototype.Login = function (req, res) {
        res.render('admin/login', {
            title: 'ELSAA Login',
            page: 'admin/login',
            locale: {
                'signInHeading': 'Please sign in',
                'username': 'Username',
                'password': 'Password',
                'rememberMe': 'Remember me',
                'signIn': 'Sign in'
            }
        });
    };

    Admin.prototype.LoginAuthenticate = function (req, res) {
        var username = req.body.username;
        var password = md5(req.body.password).toString();
        global.acl.Authenticate(username, password, function (result) {
            if (result !== false) {
                req.session.adminuser = result;
                // logger.debug(req.session.adminuser);
                if (req.session.adminuser.perms['Admin Access']) {
                    req.session.user = us.clone(req.session.adminuser);
                    res.redirect('/admin');
                } else {
                    req.session.user = us.clone(req.session.adminuser);
                    delete req.session.adminuser;
                    res.redirect('/');
                }
            } else {
                res.redirect('/admin/login');
            }
        });
    };

    Admin.prototype.Logout = function (req, res) {
        if (req.session.adminuser) {
            delete req.session.adminuser;
        }
        if (req.session.user) {
            delete req.session.user;
        }
        res.redirect('/login');
    };

    Admin.prototype.Permissions = function (req, res) {
        if (req.session.adminuser) {
            global.acl.GetPermissions(function (permissionList) {
                res.render('admin/permissions', {
                    title: 'ELSAA Admin [Permissions]',
                    page: 'admin/permissions',
                    permissions: req.session.adminuser.permissions,
                    perms: req.session.adminuser.perms,
                    permissionList: permissionList,
                    subpage: 'permissions'
                });
            });
        } else {
            res.redirect('/admin/login');
        }
    }

    Admin.prototype.AddPermissions = function (req, res) {
        if (req.session.adminuser) {
            var parent = req.body.parent;
            var name = req.body.name;
            var description = req.body.description;
            var deletable = req.body.deletable;
            global.acl.AddPermission(name, description, parent, deletable, function () {
                res.json(true);
            });
        } else {
            res.redirect('/admin/login');
        }
    }

    Admin.prototype.DeletePermissions = function (req, res) {
        if (req.session.adminuser) {
            var id = req.body.id;
            global.acl.DeletePermission(id, function () {
                res.json(true);
            });
        } else {
            res.redirect('/admin/login');
        }
    }

    return Admin;
})();

exports.main = new Main();
exports.admin = new Admin();
