/*jslint node: true */
'use strict';
var util = require("bp-utilities"),
    ansi = util.ansi,
    mime = util.mime,
    jsn = util.jsn,
    q = require("q"),
    fs = require("fs"),
    http = require("http"),
    WSServer = require("./wsserver"),
    promiseConstructor = q.resolve(1).constructor,
    querystring = require("querystring"),
    HttpServer = function (config) {
        var that = this, p;
        that.funcList = [];
        that.wsList = [];
        for (p in config) {
            if (config.hasOwnProperty(p)) {
                that[p] = config[p];
            }
        };
        that.ws = {
            do: function addWsFunc(event, callback) {
                that.wsList.push({ev: event, cb: callback});
            },
            broadcast: function(obj) {
                that.wss.broadcast(JSON.stringify(obj));
            }
        };
        that.use = function (fn) {
            that.funcList.push(fn);
        };
        that.next = function () {
            return q.resolve(arguments);
        };
        that.enhanceRequest = function (req) {
            // First check if the request was proxied,
            // then if any of the other variables are
            // set depending on the connection type
            req.ip = req.headers['x-forwarded-for'] ||
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress ||
                     req.connection.socket.remoteAddress;
            return req;
        };
        that.enhanceResponse = function (res) {
            res.finished = false;
            res.headers = {};
            res.setHeader = function setHeader(key, value) {
                res.headers[key] = value;
            };
            res.setHeaders = function setHeaders(headers) {
                res.headers = jsn.merge(res.headers, headers);
            };
            res.json = function json(obj) {
                this.send(200, JSON.stringify(obj), {'Content-Type': 'application/json'});
            };
            res.error = function error(code, obj) {
                this.send(code, JSON.stringify(obj), { 'Content-Type': 'application/json' });
            };
            res.send = function send(code, data, headers) {
                headers = jsn.merge(res.headers, headers);
                headers = jsn.merge({'Content-Type': 'text/plain'}, headers);
                if (!this.headersSent) {
                    this.writeHead(code, headers);
                }
                this.write(data);
                this.finish();
            };
            res.sendFileStream = function sendFileStream(fileStream, stat) {
                if (!this.headersSent) {
                    this.writeHead(200, {
                        'Content-Type': mime.find(stat.filepath),
                        'Content-Length': stat.size
                    });
                }
                fileStream.on("end", function () {
                    res.finish();
                });
                fileStream.pipe(this);
            };
            res.sendFile = function (req, path) {
                var results = q.defer(),
                    stat,
                    stream;
                try {
                    if (fs.existsSync(path) && (stat = fs.statSync(path)).isFile()) {
                        stream = fs.createReadStream(path, {encoding: 'utf8'});
                        stream.on('end', function () {
                            results.resolve([req, res]);
                        });
                        stat.filepath = path;
                        res.sendFileStream(stream, stat);
                    } else {
                        res.error(404, {code: 404, message: "File " + path + " not found"});
                        results.resolve([req, res]);
                    }
                } catch (e) {
                    results.reject(e);
                }
                return results.promise;
            };
            res.finish = function finish() {
                this.end();
                this.finished = true;
            };
            return res;
        };

        that.listen = function listen() {
            that.server = http.createServer(function (req, res) {
                var reqx = that.enhanceRequest(req),
                    resx = that.enhanceResponse(res),
                    wrapfunc = function (fn, req, res) {
                        var core = q.defer(),
                            result,
                            next = function () {
                                core.resolve([req, res]);
                                return [req, res];
                            };

                        if (res.finished) {
                            next();
                        } else {
                            result = fn(req, res, next);
                            if (typeof (result) === 'object' && result.then && result.spread) {
                                core.resolve(result);
                            } else {
                                next();
                            }
                        }
                        return core.promise;
                    };
                if(that.websocket.enabled) {
                    resx.wss = that.wss;
                }
                resx.on("finish", function () {
                    var col = ansi.green;
                    if (resx.statusCode >= 300) {
                        col = ansi.blue;
                    }
                    if (resx.statusCode >= 400) {
                        col = ansi.red;
                    }

                    console.log(ansi.blue(req.ip) + " " + req.method + " " + ansi.bold(col(resx.statusCode)) + " " + reqx.url);
                    if (reqx.db && that.closeDBonFinish) {
                        reqx.db.close();
                    }
                });

                that.funcList.reduce(function (chain, fn) {
                    return chain.spread(wrapfunc.bind(fn, fn));
                }, q([reqx, resx])).done(function ensureEnd() {
                    if (!resx.finished) {
                        resx.error(404, {code: 404, message: "No resolution for request " + reqx.url});
                    }
                });
            }).listen(that.port);
            console.log(ansi.blue(that.appname) + " now listening on port " + ansi.magenta(that.port));

            if(that.websocket.enabled) {
                that.wss = new WSServer({httpServer: that.server}, that.wsList);
                console.log(ansi.blue(that.appname) + " websocket listening on port " + ansi.magenta(that.port));
            } else {
                that.wss = null;
            }

            return that.server;
        };
    };

module.exports = function HttpServerWrapper(conf) {
    return new HttpServer(conf);
};
