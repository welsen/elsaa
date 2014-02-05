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
var vidStreamer = require("vid-streamer");

var ElsaaEventEmitter = function () {
    events.EventEmitter.call(this);
};
util.inherits(ElsaaEventEmitter, events.EventEmitter);
var ElsaaEventHandler = new ElsaaEventEmitter();

ElsaaEventHandler.on('elsaa.init.done', function () {
    initDatabase();
});
ElsaaEventHandler.on('elsaa.database.done', function () {
    initRoutes();
});
ElsaaEventHandler.on('elsaa.routes.done', function () {
    initServer();
});
ElsaaEventHandler.on('elsaa.server.done', function () {
    startElsaa();
});

var sessionSecret = "47b879d554800d2ef0605cddd359fd82";
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
var auth = null;

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
    app.use(express.logger('dev'));
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
    app.get('/', routes.index);
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
        console.log(util.format('WebServer listening on port: %d', app.get('port-http')));
    });
    serverHttps = https.createServer(credentials, app).listen(app.get('port-https'), function () {
        initWebsocket(websocketHttps, serverHttps, true);
        console.log(util.format('Secure WebServer listening on port: %d', app.get('port-https')));
    });
}

function initDatabase() {
    db = new sqlite3.Database(dbPath, function (error) {
        if (error === null) {
            console.log('Connection with Database established');
            ElsaaEventHandler.emit('elsaa.database.done');
        }
    });
}

init();
