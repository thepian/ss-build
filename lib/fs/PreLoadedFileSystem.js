/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra

 or perhaps ReadOnlyFileSystem
 - read gets preloaded or actual fs content
 - write saves in preloaded data
 */
'use strict';

var fs = require('fs'),
    path = require('path');

function PreloadedFileSystem(data) {
    this.data = data || {};
    this.defaultDate = new Date();
}
module.exports = PreloadedFileSystem;

function isDir(item) {
    if(typeof item !== "object") return false;
    return item[""] === true;
}

function isFile(item) {
    if(typeof item !== "object") return false;
    return !item[""];
}

function pathToArray(path) {
    var nix = /^\//.test(path);
    if(!nix) {
        if(!/^[A-Za-z]:/.test(path)) throw new Error("Invalid path '" + path + "'");
        path = path.replace(/[\\\/]+/g, "\\"); // multi slashs
        path = path.split(/[\\\/]/);
        path[0] = path[0].toUpperCase();
    } else {
        path = path.replace(/\/+/g, "/"); // multi slashs
        path = path.substr(1).split("/");
    }
    if(!path[path.length-1]) path.pop();
    return path;
}

function trueFn() { return true; }
function falseFn() { return false; }



PreloadedFileSystem.prototype.statSync = function(_path) {
    var path = pathToArray(_path);
    console.log('stat on',path);

    var current = this.data;
    for(var i = 0; i < path.length - 1; i++) {
        if(!isDir(current[path[i]]))
            //throw new Error("Path doesn't exist '" + _path + "'");
            return this._statFS(_path);
        current = current[path[i]];
    }
    if(_path === "/" || isDir(current[path[i]])) {
        console.log('dir stat',_path);
        return {
            ctime: this.defaultDate,
            atime: this.defaultDate,
            mtime: this.defaultDate,
            birthtime: this.defaultDate,

            isFile: falseFn,
            isDirectory: trueFn,
            isBlockDevice: falseFn,
            isCharacterDevice: falseFn,
            isSymbolicLink: falseFn,
            isFIFO: falseFn,
            isSocket: falseFn
        };
    } else if(isFile(current[path[i]])) {
        console.log('file stat',_path);
        return {
            ctime: this.defaultDate,
            atime: this.defaultDate,
            mtime: this.defaultDate,
            birthtime: this.defaultDate,

            isFile: trueFn,
            isDirectory: falseFn,
            isBlockDevice: falseFn,
            isCharacterDevice: falseFn,
            isSymbolicLink: falseFn,
            isFIFO: falseFn,
            isSocket: falseFn
        };
    } else
        //throw new Error("Path doesn't exist '" + _path + "'");
        return this._statFS(_path);
};

PreloadedFileSystem.prototype._statFS = function(_path) {
    return fs.statSync(_path);
};

PreloadedFileSystem.prototype.readFileSync = function(_path, encoding) {
    var path = pathToArray(_path);
    var current = this.data;
    for(var i = 0; i < path.length - 1; i++) {
        if(!isDir(current[path[i]]))
            //throw new Error("Path doesn't exist '" + _path + "'");
            return this._readFileFS(_path, encoding);
        current = current[path[i]];
    }
    if(!isFile(current[path[i]])) {
        //if(isDir(current[path[i]]))
        //    throw new Error("Cannot readFile on directory '" + _path + "'");
        //else
        //    throw new Error("Path doesn't exist '" + _path + "'");
        return this._readFileFS(_path, encoding);
    }
    current = current[path[i]];
    console.log( 'read from cache:',_path );
    return encoding && current.toString ? current.toString(encoding) : current;
};

PreloadedFileSystem.prototype._readFileFS = function(_path, encoding) {
    console.log('read uncached:',_path);
  return fs.readFileSync(_path, encoding);
};

PreloadedFileSystem.prototype.readdirSync = function(_path) {
    if(_path === "/") return Object.keys(this.data).filter(Boolean);
    var path = pathToArray(_path);
    var current = this.data;
    for(var i = 0; i < path.length - 1; i++) {
        if(!isDir(current[path[i]]))
            throw new Error("Path doesn't exist '" + _path + "'");
        current = current[path[i]];
    }
    if(!isDir(current[path[i]])) {
        if(isFile(current[path[i]]))
            throw new Error("Cannot readdir on file '" + _path + "'");
        else
            throw new Error("Path doesn't exist '" + _path + "'");
    }
    return Object.keys(current[path[i]]).filter(Boolean);
};

PreloadedFileSystem.prototype.mkdirpSync = function(_path) {
    var path = pathToArray(_path);
    if(path.length === 0) return;
    var current = this.data;
    for(var i = 0; i < path.length; i++) {
        if(isFile(current[path[i]]))
            throw new Error("Path is a file '" + _path + "'");
        else if(!isDir(current[path[i]]))
            current[path[i]] = {"":true};
        current = current[path[i]];
    }
    return;
};

PreloadedFileSystem.prototype.mkdirSync = function(_path) {
    var path = pathToArray(_path);
    if(path.length === 0) return;
    var current = this.data;
    for(var i = 0; i < path.length - 1; i++) {
        if(!isDir(current[path[i]]))
            throw new Error("Path doesn't exist '" + _path + "'");
        current = current[path[i]];
    }
    if(isDir(current[path[i]]))
        throw new new Error("Directory already exist '" + _path + "'");
    else if(isFile(current[path[i]]))
        throw new Error("Cannot mkdir on file '" + _path + "'");
    current[path[i]] = {"":true};
    return;
};

PreloadedFileSystem.prototype._remove = function(_path, name, testFn) {
    var path = pathToArray(_path);
    if(path.length === 0) throw new Error("Path cannot be removed '" + _path + "'");
    var current = this.data;
    for(var i = 0; i < path.length - 1; i++) {
        if(!isDir(current[path[i]]))
            throw new Error("Path doesn't exist '" + _path + "'");
        current = current[path[i]];
    }
    if(!testFn(current[path[i]]))
        throw new Error("'" + name + "' doesn't exist '" + _path + "'");
    delete current[path[i]];
    return;
};

PreloadedFileSystem.prototype.rmdirSync = function(_path) {
    return this._remove(_path, "Directory", isDir);
};

PreloadedFileSystem.prototype.unlinkSync = function(_path) {
    return this._remove(_path, "File", isFile);
};

PreloadedFileSystem.prototype.purge = function(changes) {
    fs.purge(changes);
};

PreloadedFileSystem.prototype.cacheFile = function(_path, content, encoding) {
    console.log('caching',_path);
    this.mkdirpSync(path.dirname(_path));
    this.writeFileSync(_path, content, encoding);
};

PreloadedFileSystem.prototype.writeFileSync = function(_path, content, encoding) {
    if(!content && !encoding) throw new Error("No content");
    var path = pathToArray(_path);
    if(path.length === 0) throw new Error("Path is not a file '" + _path + "'");
    var current = this.data;
    for(var i = 0; i < path.length - 1; i++) {
        if(!isDir(current[path[i]]))
            throw new Error("Path doesn't exist '" + _path + "'");
        current = current[path[i]];
    }
    if(isDir(current[path[i]]))
        throw new Error("Cannot writeFile on directory '" + _path + "'");

    //TODO make it configurable if stored as buffer or string by default, avoids double conversion when writing and reading strings
    current[path[i]] = encoding || typeof content === "string" ? new Buffer(content, encoding) : content;
};

PreloadedFileSystem.prototype.join = function(a, b) {
    if(a[a.length-1] === "/") return a + b;
    if(a[a.length-1] === "\\") return a + b;
    return a + "/" + b;
};

// async functions

["stat", "readdir", "mkdirp", "mkdir", "rmdir", "unlink"].forEach(function(fn) {
    PreloadedFileSystem.prototype[fn] = function(path, callback) {
        console.log('calling PFS',fn,path);
        try {
            var result = this[fn + "Sync"](path);
        } catch(e) {
            console.log('failed PFS.',fn,path,e)
            return callback(e);
        }
        return callback(null, result);
    };
});

PreloadedFileSystem.prototype.readFile = function(path, optArg, callback) {
    if(!callback) {
        callback = optArg;
        optArg = undefined;
    }
    try {
        var result = this.readFileSync(path, optArg);
    } catch(e) {
        console.log('readFile error',e);
        return callback(e);
    }
    return callback(null, result);
};

PreloadedFileSystem.prototype.writeFile = function (path, content, encoding, callback) {
    if(!callback) {
        callback = encoding;
        encoding = undefined;
    }
    try {
        this.writeFileSync(path, content, encoding);
    } catch(e) {
        console.log('writeFile',e);
        return callback(e);
    }
    return callback();
};
