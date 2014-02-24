var zlib = require('zlib');
var fs = require('fs');
var path = require('path');
var events = new require('events');
var util = new require('util');
var readline = require('readline');

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var EventEmitter = function () {
    events.EventEmitter.call(this);
};
util.inherits(EventEmitter, events.EventEmitter);
var EventHandler = new EventEmitter();

EventHandler.on('ask.module.routes', askModuleRoutes);

var moduleName = "";
var moduleDesc = "";
var moduleVersion = "";
var moduleRoutes = [];

rl.question("Module Name: ", function (answer) {
    moduleName = answer;
    rl.question("Module Description: ", function (answer) {
        moduleDesc = answer;
        rl.question("Module Version: ", function (answer) {
            moduleVersion = answer;
            EventHandler.emit('ask.module.routes');
        });
    });
});

function askModuleRoutes() {
    var moduleRoute = "";
    var moduleCall = "";
    rl.question("Route: ", function (answer) {
        moduleRoute = answer;
        rl.question("Call: ", function (answer) {
            moduleCall = answer;
            moduleRoutes.push({
                route: moduleRoute,
                call: moduleCall
            });
            rl.question("Add more routes (default: no)? ", function (answer) {
                if (/^(y|Y|yes|Yes|YES)$/.test(answer)) {
                    EventHandler.emit('ask.module.routes');
                } else {
                    compressModule();
                }
            });
        });
    });
}

var ElsaaModule = (function () {
    function ElsaaModule(name, desc, routes) {
        this.name = name;
        this.desc = desc;
        this.routes = routes;
        this.viewsFiles = {};
        this.jsFiles = {};
        this.cssFiles = {};
        this.moduleFile = null;

        return loadFiles(this);
    }

    function loadFiles(self) {
        var viewsPath = path.join('.', 'views', self.name);
        if (fs.existsSync(viewsPath)) {
            var files = fs.readdirSync(viewsPath);
            files.forEach(function (file) {
                self.viewsFiles[file] = fs.readFileSync(path.join(viewsPath, file)).toString('base64');
            });
        }
        var jsPath = path.join('.', 'public', 'javascripts', self.name);
        if (fs.existsSync(jsPath)) {
            var files = fs.readdirSync(jsPath);
            files.forEach(function (file) {
                self.jsFiles[file] = fs.readFileSync(path.join(jsPath, file)).toString('base64');
            });
        }
        var cssPath = path.join('.', 'public', 'stylesheets', self.name);
        if (fs.existsSync(cssPath)) {
            var files = fs.readdirSync(cssPath);
            files.forEach(function (file) {
                self.cssFiles[file] = fs.readFileSync(path.join(cssPath, file)).toString('base64');
            });
        }
        var modulePath = path.join('.', 'modules', self.name + '.js');
        if (fs.existsSync(modulePath)) {
            self.moduleFile = fs.readFileSync(modulePath).toString('base64');
        }
        return self;
    }

    ElsaaModule.prototype.toJSON = function () {
        var meta = {
            name: this.name,
            description: this.desc,
        }
        var routes = this.routes;
        return JSON.stringify({
            meta: meta,
            routes: routes,
            files: {
                'module': this.moduleFile,
                views: this.viewsFiles,
                js: this.jsFiles,
                css: this.cssFiles
            }
        });
    }

    return ElsaaModule;
})();

function compressModule() {
    console.log("creating compressed elsaa module file");
    var elsaaModule = new ElsaaModule(moduleName, moduleDesc, moduleRoutes);

    zlib.gzip(new Buffer(new Buffer(JSON.stringify(elsaaModule)).toString('base64')), function (err, buffer) {
        if (!err) {
            // console.log(buffer);
            fs.writeFileSync(elsaaModule.name + '.elsaa', "ELSAAv10" + buffer.toString('binary'), {
                encoding: 'binary'
            });
            checkModule(elsaaModule.name + '.elsaa');
            rl.close();
        }
    });
}

function checkModule(file) {
    var moduleFile = fs.readFileSync(file);
    // console.log(moduleFile.slice(8));
    zlib.gunzip(moduleFile.slice(8), function (err, buffer) {
        if (!err) {
            var loaded = JSON.parse(new Buffer(buffer.toString(), 'base64').toString());
            var loadedModule = (new Function("return " + loaded + ";"))();
            // console.log((new Buffer(loadedModule.files.module, 'base64').toString()));
        } else
            console.log(err);
    });
}
