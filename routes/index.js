/*
 * GET home page.
 */

var md5 = require('crypto-js/md5');
var logger = require('log4js').getLogger();
var us = require('underscore');

exports.index = function (req, res) {
    if (req.session.user) {
        // logger.debug(req.session.user);
        res.render('index', {
            title: 'ELSAA',
            page: 'index'
        });
    } else {
        res.redirect('/login');
    }
};

exports.login = function (req, res) {
    res.render('login', {
        title: 'ELSAA Login',
        page: 'login',
        locale: {
            'signInHeading': 'Please sign in',
            'username': 'Username',
            'password': 'Password',
            'rememberMe': 'Remember me',
            'signIn': 'Sign in'
        }
    });
};

exports.loginAuthenticate = function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
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

exports.logout = function (req, res) {
    if (req.session.user) {
        delete req.session.user;
    }
    res.redirect('/login');
};

exports.admin = function (req, res) {
    if (req.session.adminuser) {
        res.render('adminindex', {
            title: 'ELSAA Admin',
            page: 'adminindex',
            permissions: req.session.adminuser.permissions
        });
    } else {
        res.redirect('/admin/login');
    }
};

exports.adminLogin = function (req, res) {
    res.render('adminlogin', {
        title: 'ELSAA Admin Login',
        page: 'adminlogin',
        locale: {
            'signInHeading': 'Please sign in',
            'username': 'Username',
            'password': 'Password',
            'rememberMe': 'Remember me',
            'signIn': 'Sign in'
        }
    });
};

exports.adminLoginAuthenticate = function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    global.acl.Authenticate(username, password, function (result) {
        if (result !== false) {
            req.session.adminuser = result;
            // logger.debug(req.session.adminuser);
            var adminAccess = us.findWhere(req.session.adminuser.permissions, {
                'NAME': 'Admin Access'
            }) != undefined;
            if (adminAccess) {
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

exports.adminLogout = function (req, res) {
    if (req.session.adminuser) {
        delete req.session.adminuser;
    }
    res.redirect('/admin/login');
};
