'use strict';

var betterStackTraces = /development/i.test(process.env.NODE_ENV) || /\bredis\b/i.test(process.env.NODE_DEBUG);
var errorClasses = require('./customErrors');

function Command (command, args, callback, call_on_write, timeout) {
    this.command = command;
    this.args = args;
    this.buffer_args = false;
    this.callback = callback;
    this.call_on_write = call_on_write;
    this.client = null;

    if (timeout) {
      var originalCallback = callback;
      this.callback = function() {
        originalCallback.apply(this, arguments);
        clearTimeout(this.timeout);
      }.bind(this);
      this.timeout = setTimeout(function() {
        this.timeout = true;
        var err = new errorClasses.AbortError({
          code: 'TIMEOUT',
          message: 'Command timed out after ' + timeout,
        });
        this.appendDetailToError(err);
        this.callback(err);
        this.callback = function() {};
        if (this.client) {
          this.client.emit('timeout');
          this.client.connection_gone('timeout');
        }
      }.bind(this), timeout);
    } else {
      this.timeout = null;
    }

    if (betterStackTraces) {
        this.error = new Error();
    }
}

Command.prototype.appendDetailToError = function (err) {
    err.command = this.command.toUpperCase();
    if (this.args && this.args.length) {
        err.args = this.args;
    }
}


module.exports = Command;
