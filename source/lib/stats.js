(function(exports) {
  /* jshint node:true */
  'use strict';

  var _ = require('./vendor/underscore-min.js');

  var SHUTDOWN_UPDATE_INTERVAL_MS = 5000;

  exports.Stats = Stats;

  function Stats(db, moonshot) {
    this._db = db;

    _.bindAll(this,
      'onMoonshotStart',
      'onGameStart',
      'onGameEnd',
      'onGameError',
      'onAttractStart',
      'onAttractEnd',
      'onCoin'
    );

    moonshot.on('moonshot:start', this.onMoonshotStart);
    moonshot.on('game:start', this.onGameStart);
    moonshot.on('game:end', this.onGameEnd);
    moonshot.on('game:error', this.onGameError);
    moonshot.on('attract:start', this.onAttractStart);
    moonshot.on('attract:end', this.onAttractEnd);
    moonshot.on('input:coin', this.onCoin);

    this._onBoot();
  }

  var $class = Stats.prototype;

  $class._onBoot = function() {
    this._recordSync({event: 'boot'});
    this._startShutdownMarkerLoop();
  };

  $class.onMoonshotStart = function() {
    this._record({event: 'moonshot_start'});
  };

  $class.onGameStart = function(gameSlug) {
    this._record({event: 'game_start', game: gameSlug});
  };

  $class.onGameEnd = function(gameSlug, duration) {
    this._record({
      game: gameSlug,
      event: 'game_end',
      notes: (duration / 60000).toFixed(2) + 'm'
    });
  };

  $class.onGameError = function(gameSlug, err) {
    this._record({event: 'game_error', game: gameSlug, notes: err.toString()});
  };

  $class.onAttractStart = function() {
    this._record({event: 'attract_start'});
  };

  $class.onAttractEnd = function() {
    this._record({event: 'attract_end'});
  };

  $class.onCoin = function(gameSlug) {
    this._record({event: 'coin', game: gameSlug});
  };

  // Not sure we can reliably detect shutdown, so create a shutdown marker at
  // boot and keep advancing its timestamp as long as we're alive.
  $class._startShutdownMarkerLoop = function() {
    var self = this;
    var insertMarkerStmt = 'INSERT INTO stats' +
      " (event) VALUES ('shutdown'); SELECT last_insert_rowid();";
    var updateMarkerStmt = 'UPDATE stats' +
      ' SET event_at = CURRENT_TIMESTAMP WHERE id = ';

    var data = this._db.execSync(insertMarkerStmt);
    var markerID = data[0][0];
    setInterval(function() {
      self._db.run(updateMarkerStmt + markerID + ';', function(){});
    }, SHUTDOWN_UPDATE_INTERVAL_MS);
  };

  $class._record = function(data) {
    this._db.run('INSERT INTO stats (game, event, notes) VALUES (' +
      '"' + (data.game || '') + '",' +
      '"' + (data.event || '') + '",' +
      '"' + (data.notes || '') + '"' +
      ');', function(){});
  };

  $class._recordSync = function(data) {
    this._db.runSync('INSERT INTO stats (game, event, notes) VALUES (' +
      '"' + (data.game || '') + '",' +
      '"' + (data.event || '') + '",' +
      '"' + (data.notes || '') + '"' +
      ');');
  };



})(((typeof(module) !== 'undefined') && module.exports) || window);
