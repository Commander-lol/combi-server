(function(){
    "use strict";
    var CombiSocket = function() {
        if (this === window) {
            return new CombiSocket();
        }

        var that = this,
            pendingMessages = [],
            cbs = {};

        this.ws = new WebSocket("ws://" + location.host + "/");

        this.message = function (type, content) {
            var msg = {
                type: type,
                payload: JSON.stringify(content)
            };
            if (that.ws.readyState !== 1) {
                pendingMessages.push(msg);
            } else {
                that.ws.send(JSON.stringify(msg));
            }
        };

        this.on = function (event, callback) {
            if(!cbs.hasOwnProperty(event)) {
                cbs[event] = [function noop(){}];
            }
            cbs[event].push(callback);
        }

        this.ws.addEventListener("message", function(msg) {
            var data = JSON.parse(msg.data);
            if (cbs.hasOwnProperty(data.type)) {
                cbs[data.type].reduce(function(p, c) {
                    c(data.payload);
                });
            }
        });

        return this;
    }



    window.CombiSocket = CombiSocket;
}())
