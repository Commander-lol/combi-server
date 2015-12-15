var path = require("path"),
    fs = require("fs"),
    q = require("q"),
    findstatic = function(staticpath, req, res, next){
        var fullpath = path.join(staticpath, req.url),
            results = q.defer(),
            stream, stat;
        try {
            if(fs.existsSync(fullpath) && (stat = fs.statSync(fullpath)).isFile()){
                stream = fs.createReadStream(fullpath, {encoding: 'utf8'});
                stream.on('end', function(){
                    results.resolve([req, res]);
                });
                stat.filepath = fullpath;
                res.sendFileStream(stream, stat);
            } else {
                results.resolve(next());
            }
        } catch (e) {
            results.reject(e);
        }
        return results.promise;
    }

module.exports = function bindstatic(staticpath){
    return findstatic.bind(null, staticpath);
}
