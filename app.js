/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var io = require('socket.io');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var util = require('util');
var events = require('events');
var sqlite3 = require('sqlite3').verbose();
var md5 = require('crypto-js/md5');
var vidStreamer = require("vid-streamer");
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

function serverLogger() {
    var immediate = arguments[0];
    return function (req, res, next) {
        // debugger;
        var sock = req.socket;
        req._startTime = new Date;
        var url = req.originalUrl || req.url;
        var method = req.method;
        var responseTime = String(Date.now() - req._startTime);
        var status = res.statusCode || null;
        var referer = req.headers['referer'] || req.headers['referrer'];

        var remoteAddr = null;
        if (req.ip) remoteAddr = req.ip;
        if (req._remoteAddress) remoteAddr = req._remoteAddress;
        if (sock.socket) remoteAddr = sock.socket.remoteAddress;
        remoteAddr = sock.remoteAddress;

        var httpVersion = req.httpVersionMajor + '.' + req.httpVersionMinor;
        var userAgent = req.headers['user-agent'];

        function logRequest() {
            res.removeListener('finish', logRequest);
            res.removeListener('close', logRequest);
            debugger;
            logger.info(util.format('%s "%s %s HTTP/%s" %s %s "%s" "%s" "response: %s ms"',
                remoteAddr, method, url, httpVersion, status, res._headers['content-length'], referer, userAgent, responseTime));
        };

        // immediate
        if (immediate) {
            logRequest();
            // proxy end to output logging
        } else {
            res.on('finish', logRequest);
            res.on('close', logRequest);
        }

        next();
    }
}

var Acl = require('./modules/acl').Acl;

var ElsaaEventEmitter = function () {
    events.EventEmitter.call(this);
};
util.inherits(ElsaaEventEmitter, events.EventEmitter);
var ElsaaEventHandler = new ElsaaEventEmitter();

ElsaaEventHandler.on('elsaa.init.done', function () {
    logger.info('Init done...');
    initDatabase();
});
ElsaaEventHandler.on('elsaa.database.done', function () {
    logger.info('Database initilaized...');
    initRoutes();
});
ElsaaEventHandler.on('elsaa.routes.done', function () {
    logger.info('Routes initialized...');
    initServer();
});
ElsaaEventHandler.on('elsaa.server.done', function () {
    logger.info('Server ready...');
    startElsaa();
});

var sessionSecret = md5('ELSAA').toString();
var dbPath = path.join(__dirname, 'database', 'elsaa.sq3');

var privateKey = fs.readFileSync(path.join(__dirname, 'ssl', 'localhost.key')).toString();
var certRequest = fs.readFileSync(path.join(__dirname, 'ssl', 'localhost.csr')).toString();
var certificate = fs.readFileSync(path.join(__dirname, 'ssl', 'localhost.crt')).toString();

var credentials = {
    key: privateKey,
    ca: certRequest,
    cert: certificate
};

var app = null;
var serverHttp = null;
var serverHttps = null;
var websocketHttp = null;
var websocketHttps = null;
var db = null;
var acl = null;

var vidStreamerOptions = {
    "mode": "development",
    "forceDownload": false,
    "random": false,
    "rootFolder": path.join(__dirname, 'public', 'videos'),
    "rootPath": "videos/",
    "server": "VidStreamer.js/0.1.4"
};

vidStreamer.settings(vidStreamerOptions);

function init() {
    app = express();

    // all environments
    app.set('port-http', 8080);
    app.set('port-https', 8443);
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(serverLogger());
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.multipart());
    app.use(express.cookieParser());
    app.use(express.session({
        secret: sessionSecret
    }));
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));

    // development only
    if ('development' == app.get('env')) {
        app.use(express.errorHandler());
    }

    ElsaaEventHandler.emit('elsaa.init.done');
}

function initRoutes() {
    app.get('/', routes.main.Index);
    app.get('/login', routes.main.Login);
    app.post('/login/authenticate', routes.main.LoginAuthenticate);
    app.get('/logout', routes.main.Logout);

    app.get('/admin', routes.admin.Index);
    app.get('/admin/login', routes.admin.Login);
    app.post('/admin/login/authenticate', routes.admin.LoginAuthenticate);
    app.get('/admin/logout', routes.admin.Logout);

    app.get('/videos/', vidStreamer);

    ElsaaEventHandler.emit('elsaa.routes.done');
}

function initWebsocket(websocket, server, secure) {
    websocket = io.listen(server, {
        secure: secure
    });
    websocket.set('log level', 0);
    chat = websocket.of('/chat').on('connection', function (socket) {
        socket.on('login', function (options, id) {
            var data = {
                'message': 'Logged in successfully'
            };
            socket.emit('login', data, id);
        }).on('say', function (options, id) {
            var data = {
                'message': options
            };
            chat.emit('say', data, id);
        }).on('disconnect', function () {
            var data = {
                'message': util.format('User disconnected: %s', socket.id)
            };
            chat.emit('say', data, '#chatMain');
        });
    });
}

function initServer() {
    serverHttp = http.createServer(app).listen(app.get('port-http'), function () {
        initWebsocket(websocketHttp, serverHttp);
        logger.info(util.format('WebServer listening on port: %d', app.get('port-http')));
    });
    serverHttps = https.createServer(credentials, app).listen(app.get('port-https'), function () {
        initWebsocket(websocketHttps, serverHttps, true);
        logger.info(util.format('Secure WebServer listening on port: %d', app.get('port-https')));
    });
    ElsaaEventHandler.emit('elsaa.server.done');
}

function initDatabase() {
    db = global.db = new sqlite3.Database(dbPath, function (error) {
        if (error === null) {
            db.get("select 'SQLite Version: ' || sqlite_version() as version;", function (error, row) {
                if (error === null) {
                    if (row !== undefined) {
                        logger.info(row.version);
                        logger.info('Connection with Database established');
                        ElsaaEventHandler.emit('elsaa.database.done');
                    }
                }
            });
        }
    });
}

function startElsaa() {
    logger.info("Starting ELSAA...");
    acl = global.acl = new Acl(db);

    //    acl.AddRole('administrator', 'administrator', null);
    //    acl.AddRole('moderator', 'moderator', 1);
    //    acl.GetRolesUnder(1, function (data) {
    //        data = data.slice(1, data.length);
    //        console.log(data);
    //    });
    //    acl.AddLocalUser('simpleuser', md5('password').toString(), 'simple user', 'simple.user@email.tld', function () {
    //    acl.Authenticate('simpleuser', md5('password').toString(), function (result) {
    //        logger.info(result);
    //    });
    //    });
}

init();
