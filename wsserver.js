var WSServer = require("websocket").server,
    q = require("q"),
    socketServer = function(options, connFuncs) {
        var that = this,
            onMessage = function(connection, message) {
                message = message.utf8Data;
                var msg, funcs,
                    unwindCallbacks = function (connection, cbs, message) {
                        return cbs.reduce(function(prev, cur){
                            return prev.then(cur.cb.bind(connection, connection, cur.type(message)));
                        }, q(message)).done();
                    };
                try {
                    msg = JSON.parse(message);
                } catch (e) {
                    connection.sendJson({type: "error", payload: {code: 400, message: "Bad request, must be valid JSON"}});
                    return;
                }

                if (!msg.type && !msg.payload) {
                    connection.sendJson({type: "error", payload: {code: 400, message: "Bad request, must contain 'type' and 'payload' parameters"}});
                    return;
                }

                if (!that.callbacks.hasOwnProperty(msg.type)) {
                    connection.sendJson({type: "error", payload: {code: 400, message: "Bad request, unsupported message type"}});
                    return;
                }

                funcs = that.callbacks[msg.type];
                return unwindCallbacks(connection, funcs, msg.payload);
            },
            curFunc, curEv, evParts, cType;

        this.callbacks = {};

        this.wss = new WSServer(options);
        this.clients = [];
        this.conversion = {
            "json": function(msg){
                if(typeof msg !== "object"){
                    return JSON.parse(msg);
                } else {
                    return msg;
                }
            },
            "string": String,
            "number": Number
        }

        for(curFunc = 0; curFunc < connFuncs.length; curFunc += 1) {
            evParts = connFuncs[curFunc].ev.split(":");
            curEv = evParts[0];
            if(evParts.length === 1) {
                if(that.callbacks[curEv]) {
                    that.callbacks[curEv].push({type: String, cb: connFuncs[curFunc].cb});
                } else {
                    that.callbacks[curEv] = [{type: String, cb: connFuncs[curFunc].cb}];
                }
            } else {
                cType = that.conversion[evParts[1].toLowerCase()] || String;
                if(that.callbacks[curEv]) {
                    that.callbacks[curEv].push({type: cType, cb: connFuncs[curFunc].cb});
                } else {
                    that.callbacks[curEv] = [{type: cType, cb: connFuncs[curFunc].cb}];
                }
            }
        }

        this.wss.on("request", function(request) {
            var connection = request.accept(null, request.origin),
                cind = that.clients.push(connection) - 1,
                func,
                type,
                evName,
                evParts;

            connection.sendJson = function(json) {
                connection.sendUTF(JSON.stringify(json));
            };
            connection._id = cind;

            connection.on("message", onMessage.bind(connection, connection));

            connection.on("end", function() {
                that.clients.splice(cind, 1);
            });
        });

        this.broadcast = function(message){
            if(that.clients.length === 0){
                return false;
            } else {
                that.clients.reduce(function(p, cur){
                    cur.sendUTF(message);
                });
                return true;
            }
        }

        return this;
    };

module.exports = socketServer;
