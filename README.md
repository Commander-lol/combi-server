# combi-server
_A lightweight combined http/ws API server framework built to be extended_
combi-server is a framework for easily creating Node.js API servers, with a focus on serving responses with JSON to emphasise a disconnect between client and
server functionality. It comes bundled with a mono-roomed WebSocket server that executes based on typed requests.

## Installation
As with all node modules, you can install combi-server from NPM with the `npm install --save combi-server` command. It can then be used in your Node.js servers
with `var http = require("combi-server");`. If you don't have access to NPM, simply download the latest release from GitHub and drop the contents (as reflected
in the GitHub file viewer) into this folder relative to the root of you Node.js project: `/node_modules/combi-server/`.

## Using combi-server
There are three stages to creating a *combi-server* server. Note that setting the port that the server will be listening to is done when initialising the server,
not when calling the listen function.

### Initialising The Server
Requiring the combi-server module returns a function. Calling this function with a configuration object will give you a fully configured server; the configuration
object is a standard javascript object with one required and several optional properties. The server integrates the options into the server object, allowing end 
users to set arbitrary methods that can be called on the resultant server object. Optional properties that are not defined will have certain default behaviours but
will not be set as such.

**Required**:
* _port_: The port number of the local machine to listen on

**Optional**:
* _appname_: The name to show up in the server logs on boot. Otherwise doesn't do much by default. (Default Behaviour: undefined)
* _useAnsi_: Use ansi colour codes in the server logs. (Default Behaviour: false)
* _websocket_: An object with configuration properties for the websocket server. (Default Behaviour: WS server not created)

**Websocket**:
* _enabled_: Whether or not the WS server will be created (Default Behaviour: false)

Options with other names will be added to the server object, allowing for custom functions to be added, but will be overwritten by default methods and properties 
with the same name (options integration happens before internal config). The following properties and methods are set after options are added (will overwrite 
custom properties): `funcList`, `wsList`, `ws`, `wss`, `use`, `static`, `next`, `enhanceRequest`, `enhanceResponse`, `listen`, `server`.

### Adding Middleware

#### HTTP Middleware
Without adding any other functions, the http server will spit back a 404 for every request. In order to do anything, you'll need to add middleware functions; by using 
the `http.use(fn)` function you can add arbitrary functions to be executed in order. Each function added will be provided with the `req`, `res`, and `next` parameters
and must return either an object that conforms to the Promises/A spec _and_ has a `.spread` method (for async middleware) or null (returning anything else is also
the same as returning null). 

##### REQ
_TODO_: Add info about enhanced req
* req.ip

##### RES
_TODO_: Add info about enhanced res
* res.json(obj)
* res.error(status, obj)
* res.send(status, data[, headers])
* res.sendFile(filestream, statObj)
* res.sendFileStream(req, path)
* res.setHeader(key, val)
* res.setHeaders(headers)
* res.finish()
* res.finished
* res.headers

#### WS Middleware
The raw websocket server can be accessed via the `http.wss` property (assigned during the `http.listen()` call). In order to access the combi-server WS middleware API,
you need to call methods on the `http.ws` object. `http.ws.do(type, fn)` is the websocket version of `http.use(fn)`; it requires a type parameter that corresponds to
the custom websocket event that you want the function to listen for, as well as a callback function that will recieve the `connection` and `data` parameters that correspond to 
the enhanced connection object of the client and the payload of the request respectively.

The type parameter is a string identifying the request type to handle. This can be literally anything that you need for your API (`bob`, `secrets` and `breakThisThing`
are all fine, if somewhat questionable). It can also optionally contain one of three data types in order to define a conversion for the payload. By setting a data type,
the `data` parameter provided to the callback will be in that format. If none is provided, it will be a string. Data types are defined with a colon followed by the type;
`bob:string`, `bob:number` and `bob:json` are all valid type parameters (*N.B* Bare arrays are valid JSON, so use the `json` type for those).

##### Connection
_TODO_: Add info about enhanced connection
* conn.sendJson(obj)
* conn._id

### Listening To A Port
In order to recieve a request, the server needs to listen to a port. While the port is defined when the combi-server instance is created, the server won't listen to the port
until the `http.listen()` function is called. This allows all the middleware and programatic configuration to occur before requests start coming in. Simply call the listen
function and you're golden.