(function(exports) {
  /* jshint node:true */
  'use strict';

  var fs = require('fs');
  var path = require('path');
  var stream = require('stream');
  var cp = require('child_process');
  var _ = require('./vendor/underscore-min.js');

  var SQLITE_EXE = 'sqlite3';
  ['sqlite3', 'sqlite3.exe'].forEach(function(sqliteExe) {
    var sqlitePath = path.join(path.dirname(process.execPath), sqliteExe);
    SQLITE_EXE = fs.existsSync(sqlitePath) ? sqlitePath : SQLITE_EXE;
  });

  exports.Sqlite = Sqlite;

  function Sqlite(file) {
    this._file = file;
  }

  var $class = Sqlite.prototype;

  $class.run = function(stmt) {
    this.exec(stmt, function(){});
  };

  $class.runSync = function(stmt) {
    this.execSync(stmt);
  };

  $class.exec = function(stmt, done) {
    var sqlite = cp.spawn(SQLITE_EXE, [this._file], {stdio: 'pipe'});
    var output = '';
    sqlite.stdout.on('data', function(data) {
      output += data.toString();
    });
    sqlite.on('close', function(code) {
      output = _buildOutput(output);
      done(code || null, output);
    });
    sqlite.stdin.write(stmt);
    sqlite.stdin.end();
  };

  $class.execSync = function(stmt) {
    var sqlite = cp.spawnSync(SQLITE_EXE, [this._file], {input: stmt});
    var output = _buildOutput(sqlite.stdout);
    return output;
  };

  function _buildOutput(stdout) {
    var output = stdout.toString().split('\n');
    output = output.reduce(function(sum, line) {
      if (line) sum.push(line);
      return sum;
    }, []);
    output = output.map(function(line) { return line.split('|'); });
    return output;
  }

})(((typeof(module) !== 'undefined') && module.exports) || window);
