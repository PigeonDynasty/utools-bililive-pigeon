"use strict";

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

/**
 * This file contains class definitions of BaseConnection and CascadeConnection.
 * bilibili-danmaku-client is built upon layers of connections, as seen in the
 * Transport Protocol and the Application prototol, while BaseConnection and
 * CascadeConnection provides an identical, flexible, easy-to-use infrastructure
 * for implementing connection layers.
 * The API of the connections look just like that of ws, see documentation. As
 * a result, the WebSocket class of ws can be used directly as a BaseConnection,
 * as seen in WebSocketConnection.js.
 * These two classes are considered internal, that is, applications should not
 * use them directly.
 */
var EventEmitter = require('events');

var _require = require('lodash'),
    defaults = _require.defaults;
/**
 * The base class of all connections.
 * A BaseConnection is an abstraction of all the connections used in this package.
 * All implementations of BaseConnections share the same lifecycle:
 * - Start from state 'opening'.
 * - 'opening' -> 'opened', if the connection is opened succssfully. Emit event 'open'.
 *             -> 'closing', if close() was called.
 *             -> 'closed', if the connection got an error or was closed by the other
 *                side. Emit event 'close'. On error, emit event 'error' with error.
 * - 'opened' -> 'closing', if close() was called.
 *               'closed', if the connection got an error or was closed by the other
 *               side. Emit event 'close'. Or error, emit event 'error' with error.
 * - 'closing' -> 'closed', if the connection was closed. Emit event 'close'.
 * - End in state 'closed'.
 * And in addition to event 'open', 'close', 'error', an event 'message' is emitted
 * on receiving an message from the other side.
 * Note that all methos of BaseConnection have applicable states, check documentation
 * for details.
 */


var BaseConnection =
/*#__PURE__*/
function (_EventEmitter) {
  _inheritsLoose(BaseConnection, _EventEmitter);

  /**
   * Construct a new BaseConnection.
   * The returned BaseConnection will always be in 'opening' state.
   * Implementations should start the connection internally here, and call
   * onOpen() when the connection is successfully opened, or onClose() if the
   * connection is closed from the otherside, or onError() if the connection
   * bumps into an error. Failing to do so will lead to misbahavior of applications.
   */
  function BaseConnection() {
    var _this;

    _this = _EventEmitter.call(this) || this;
    _this.state = 'opening';
    return _this;
  }
  /**
   * Request the connection to close. Internal abstract method.
   * Implementation MUST close the connection at invocation, and invoke onClose()
   * when the connection is closed or onError() when the connection is unable
   * to close. Meanwhile, implementations should setup calling onMessage() on
   * arrival of a message. Otherwise, applications are likely to behave strangely.
   * It is not recommended to dispose of resources here, since closing on error
   * or from the other side will not invoke this method. listen to the 'close'
   * event instead.
   * This method will only be called at state 'closing'.
   */


  var _proto = BaseConnection.prototype;

  _proto.requestClose = function requestClose() {};
  /**
   * Request the connection to send the given data. Internal abstract method.
   * Implementations CAN throw an error if the given data cannot be sent.
   * This method will only be called at state 'opened'.
   * @param {any} data The data to send.
   */


  _proto.requestSend = function requestSend(data) {}; // eslint-disable-line no-unused-vars

  /**
   * Request the connection to close. Final API.
   * This method will only be available at state 'opening' and 'opened'. Otherwise,
   * invocations will be ignored.
   * Note that only at event 'close' will the connection be actually closed.
   * It internally calls requestClose().
   */


  _proto.close = function close() {
    switch (this.state) {
      case 'opening':
      case 'opened':
        this.state = 'closing';
        this.requestClose();
        break;

      default:
    }
  };
  /**
   * Request the connection to send given data. Final API.
   * This method will only be available at state 'opened'. Otherwise, invocations
   * will be ignored.
   * Note that this method might throw an error or ignore invalid date silently. The
   * behavior is up to the definition.
   * It internally calls requestSend().
   * @param {*} data The data to send.
   */


  _proto.send = function send(data) {
    switch (this.state) {
      case 'opened':
        this.requestSend(data);
        break;

      default:
    }
  };
  /**
   * Notify that the connection has opened. Internal callback.
   * This method will manage the lifecycle and emit events.
   * This method will only be available at state 'opening'. Otherwise, invocations
   * will be ignored.
   * This method can be used as a callback to enable asynchronous operations.
   */


  _proto.onOpen = function onOpen() {
    switch (this.state) {
      case 'opening':
        this.state = 'opened';
        this.emit('open');
        break;

      default:
    }
  };
  /**
   * Notify that the connection has bumped into an error. Internal callback.
   * This method will manage the lifecycle and emit events.
   * This method will not be available at state 'closed'. In this case, invocations
   * will be ignored.
   * This method can be used as a callback to enable asynchronous operations.
   */


  _proto.onError = function onError(err) {
    switch (this.state) {
      case 'opening':
      case 'opened':
        this.state = 'closed';
        this.emit('error', err);
        this.emit('close');
        break;

      case 'closing':
        this.state = 'closed';
        this.emit('close');
        break;

      default:
    }
  };
  /**
   * Notify that the connection has closed. Internal callback.
   * This method will manage the lifecycle and emit events.
   * This method will not be available at state 'closed'. In this case, invocations
   * will be ignored.
   * This method can be used as a callback to enable asynchronous operations.
   */


  _proto.onClose = function onClose() {
    switch (this.state) {
      case 'opening':
      case 'opened':
      case 'closing':
        this.state = 'closed';
        this.emit('close');
        break;

      default:
    }
  };
  /**
   * Notify that the connection has received a message. Internal callback.
   * This method will manage the lifecycle and emit events.
   * This method will only be available at state 'opened'. Otherwise, invocations
   * will be ignored.
   * @param {any} data The received data.
   */


  _proto.onMessage = function onMessage(data) {
    switch (this.state) {
      case 'opened':
        this.emit('message', data);
        break;

      default:
    }
  };

  return BaseConnection;
}(EventEmitter);
/**
 * The BaseConnection implementation that connects upon a parent BaseConnection.
 * The CascadeConnection listens to events of the parent BaseConnection to manage its
 * own lifecycle, and delegates methods to the parent BaseConnection. By default, it
 * inherits all events and delegates all methods, however this can be configurated.
 * Meanwhile, it enables transformation and detransformation of sent and received
 * messages.
 */


var CascadeConnection =
/*#__PURE__*/
function (_BaseConnection) {
  _inheritsLoose(CascadeConnection, _BaseConnection);

  /**
   * Constructs a new CascadeConnection with the given BaseConnection.
   * this.parent will be used to store the given parent BaseConnection.
   * inherits determines which events are inherited. By default all events are
   * inherited, that is, 'open', 'close', 'message' and 'error'. Inheritance
   * of event X can be disabled by specifying X: false in inherits, like
   * inherits = { open: false }.
   * On disable the inheritance of event X, implementations should implement
   * the behavior itself by calling onOpen(), onClose(), onError() or onMessage().
   * For disabling inheritance of methods, see documentation of each method.
   * If 'message' event is inherited, detransform() is used to transform data
   * received from parent back to data acceptable by this connection.
   * @param {BaseConnection} parent The parent to inherit.
   * @param {Object} inherits To config which events to inherit.
   */
  function CascadeConnection(parent, inherits) {
    var _this2;

    if (inherits === void 0) {
      inherits = {};
    }

    _this2 = _BaseConnection.call(this) || this;
    _this2.parent = parent;

    var _defaults = defaults(inherits, {
      error: true,
      close: true,
      open: true,
      message: true
    }),
        error = _defaults.error,
        close = _defaults.close,
        open = _defaults.open,
        message = _defaults.message;

    if (error) parent.on('error', _this2.onError.bind(_assertThisInitialized(_assertThisInitialized(_this2))));
    if (close) parent.on('close', _this2.onClose.bind(_assertThisInitialized(_assertThisInitialized(_this2))));
    if (open) parent.on('open', _this2.onOpen.bind(_assertThisInitialized(_assertThisInitialized(_this2))));

    if (message) {
      parent.on('message', function (data) {
        var detransformed = _this2.detransform(data);

        if (typeof detransformed === 'undefined') return;

        _this2.onMessage(detransformed);
      });
    }

    return _this2;
  }
  /**
   * Request connection to send given data. Inherited from BaseConnection.
   * By default, this method uses transform() to transform provided data to data
   * acceptable by parent and use parent.send(). Implementations can override this
   * method to disable delegation.
   * @param {any} data The data to send.
   */


  var _proto2 = CascadeConnection.prototype;

  _proto2.requestSend = function requestSend(data) {
    this.parent.send(this.transform(data));
  };
  /**
   * Request connection to close. Inherited from BaseConnection.
   * By default, this method calls parent.close(). Implementation can override this
   * to disable delegation or add additional behavior.
   */


  _proto2.requestClose = function requestClose() {
    this.parent.ws ? this.parent.ws.close() : this.parent.close();
  };
  /**
   * Detransform data received from parent back to data acceptable by this connection.
   * By default, this method keeps the data as-is.
   * If undefined is returned, this.onMessage() will not be called.
   * @param {any} data The data to detransform.
   */


  _proto2.detransform = function detransform(data) {
    return data;
  };
  /**
   * Detransform data to send to data acceptable by parent.
   * By default, this method keeps the data as-is.
   * @param {any} data The data to detransform.
   */


  _proto2.transform = function transform(data) {
    return data;
  };

  return CascadeConnection;
}(BaseConnection);

module.exports = {
  BaseConnection: BaseConnection,
  CascadeConnection: CascadeConnection
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlsL2Nvbm5lY3Rpb24uanMiXSwibmFtZXMiOlsiRXZlbnRFbWl0dGVyIiwicmVxdWlyZSIsImRlZmF1bHRzIiwiQmFzZUNvbm5lY3Rpb24iLCJzdGF0ZSIsInJlcXVlc3RDbG9zZSIsInJlcXVlc3RTZW5kIiwiZGF0YSIsImNsb3NlIiwic2VuZCIsIm9uT3BlbiIsImVtaXQiLCJvbkVycm9yIiwiZXJyIiwib25DbG9zZSIsIm9uTWVzc2FnZSIsIkNhc2NhZGVDb25uZWN0aW9uIiwicGFyZW50IiwiaW5oZXJpdHMiLCJlcnJvciIsIm9wZW4iLCJtZXNzYWdlIiwib24iLCJiaW5kIiwiZGV0cmFuc2Zvcm1lZCIsImRldHJhbnNmb3JtIiwidHJhbnNmb3JtIiwid3MiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7Ozs7Ozs7Ozs7O0FBYUEsSUFBTUEsZUFBZUMsUUFBUSxRQUFSLENBQXJCOztlQUNxQkEsUUFBUSxRQUFSLEM7SUFBYkMsUSxZQUFBQSxRO0FBRVI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQW1CTUMsYzs7Ozs7QUFDSjs7Ozs7Ozs7QUFRQSw0QkFBYztBQUFBOztBQUNaO0FBRUEsVUFBS0MsS0FBTCxHQUFhLFNBQWI7QUFIWTtBQUliO0FBRUQ7Ozs7Ozs7Ozs7Ozs7OztTQVdBQyxZLDJCQUFnQixDQUFHLEM7QUFDbkI7Ozs7Ozs7O1NBTUFDLFcsd0JBQWFDLEksRUFBTSxDQUFHLEMsRUFBQzs7QUFFdkI7Ozs7Ozs7OztTQU9BQyxLLG9CQUFTO0FBQ1AsWUFBUSxLQUFLSixLQUFiO0FBQ0UsV0FBSyxTQUFMO0FBQWdCLFdBQUssUUFBTDtBQUNkLGFBQUtBLEtBQUwsR0FBYSxTQUFiO0FBQ0EsYUFBS0MsWUFBTDtBQUNBOztBQUNGO0FBTEY7QUFPRCxHO0FBRUQ7Ozs7Ozs7Ozs7O1NBU0FJLEksaUJBQU1GLEksRUFBTTtBQUNWLFlBQVEsS0FBS0gsS0FBYjtBQUNFLFdBQUssUUFBTDtBQUNFLGFB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LE1BQUwsQ0FBWVUsRUFBWixDQUFlbkIsS0FBZixFQUFqQixHQUEwQyxLQUFLUyxNQUFMLENBQVlULEtBQVosRUFBMUM7QUFDRCxHO0FBRUQ7Ozs7Ozs7O1VBTUFpQixXLHdCQUFhbEIsSSxFQUFNO0FBQUUsV0FBT0EsSUFBUDtBQUFjLEc7QUFDbkM7Ozs7Ozs7VUFLQW1CLFMsc0JBQVduQixJLEVBQU07QUFBRSxXQUFPQSxJQUFQO0FBQWMsRzs7O0VBbEVISixjOztBQXFFaEN5QixPQUFPQyxPQUFQLEdBQWlCO0FBQ2YxQixnQ0FEZTtBQUVmYTtBQUZlLENBQWpCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRoaXMgZmlsZSBjb250YWlucyBjbGFzcyBkZWZpbml0aW9ucyBvZiBCYXNlQ29ubmVjdGlvbiBhbmQgQ2FzY2FkZUNvbm5lY3Rpb24uXHJcbiAqIGJpbGliaWxpLWRhbm1ha3UtY2xpZW50IGlzIGJ1aWx0IHVwb24gbGF5ZXJzIG9mIGNvbm5lY3Rpb25zLCBhcyBzZWVuIGluIHRoZVxyXG4gKiBUcmFuc3BvcnQgUHJvdG9jb2wgYW5kIHRoZSBBcHBsaWNhdGlvbiBwcm90b3RvbCwgd2hpbGUgQmFzZUNvbm5lY3Rpb24gYW5kXHJcbiAqIENhc2NhZGVDb25uZWN0aW9uIHByb3ZpZGVzIGFuIGlkZW50aWNhbCwgZmxleGlibGUsIGVhc3ktdG8tdXNlIGluZnJhc3RydWN0dXJlXHJcbiAqIGZvciBpbXBsZW1lbnRpbmcgY29ubmVjdGlvbiBsYXllcnMuXHJcbiAqIFRoZSBBUEkgb2YgdGhlIGNvbm5lY3Rpb25zIGxvb2sganVzdCBsaWtlIHRoYXQgb2Ygd3MsIHNlZSBkb2N1bWVudGF0aW9uLiBBc1xyXG4gKiBhIHJlc3VsdCwgdGhlIFdlYlNvY2tldCBjbGFzcyBvZiB3cyBjYW4gYmUgdXNlZCBkaXJlY3RseSBhcyBhIEJhc2VDb25uZWN0aW9uLFxyXG4gKiBhcyBzZWVuIGluIFdlYlNvY2tldENvbm5lY3Rpb24uanMuXHJcbiAqIFRoZXNlIHR3byBjbGFzc2VzIGFyZSBjb25zaWRlcmVkIGludGVybmFsLCB0aGF0IGlzLCBhcHBsaWNhdGlvbnMgc2hvdWxkIG5vdFxyXG4gKiB1c2UgdGhlbSBkaXJlY3RseS5cclxuICovXHJcblxyXG5jb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKTtcclxuY29uc3QgeyBkZWZhdWx0cyB9ID0gcmVxdWlyZSgnbG9kYXNoJyk7XHJcblxyXG4vKipcclxuICogVGhlIGJhc2UgY2xhc3Mgb2YgYWxsIGNvbm5lY3Rpb25zLlxyXG4gKiBBIEJhc2VDb25uZWN0aW9uIGlzIGFuIGFic3RyYWN0aW9uIG9mIGFsbCB0aGUgY29ubmVjdGlvbnMgdXNlZCBpbiB0aGlzIHBhY2thZ2UuXHJcbiAqIEFsbCBpbXBsZW1lbnRhdGlvbnMgb2YgQmFzZUNvbm5lY3Rpb25zIHNoYXJlIHRoZSBzYW1lIGxpZmVjeWNsZTpcclxuICogLSBTdGFydCBmcm9tIHN0YXRlICdvcGVuaW5nJy5cclxuICogLSAnb3BlbmluZycgLT4gJ29wZW5lZCcsIGlmIHRoZSBjb25uZWN0aW9uIGlzIG9wZW5lZCBzdWNjc3NmdWxseS4gRW1pdCBldmVudCAnb3BlbicuXHJcbiAqICAgICAgICAgICAgIC0+ICdjbG9zaW5nJywgaWYgY2xvc2UoKSB3YXMgY2FsbGVkLlxyXG4gKiAgICAgICAgICAgICAtPiAnY2xvc2VkJywgaWYgdGhlIGNvbm5lY3Rpb24gZ290IGFuIGVycm9yIG9yIHdhcyBjbG9zZWQgYnkgdGhlIG90aGVyXHJcbiAqICAgICAgICAgICAgICAgIHNpZGUuIEVtaXQgZXZlbnQgJ2Nsb3NlJy4gT24gZXJyb3IsIGVtaXQgZXZlbnQgJ2Vycm9yJyB3aXRoIGVycm9yLlxyXG4gKiAtICdvcGVuZWQnIC0+ICdjbG9zaW5nJywgaWYgY2xvc2UoKSB3YXMgY2FsbGVkLlxyXG4gKiAgICAgICAgICAgICAgICdjbG9zZWQnLCBpZiB0aGUgY29ubmVjdGlvbiBnb3QgYW4gZXJyb3Igb3Igd2FzIGNsb3NlZCBieSB0aGUgb3RoZXJcclxuICogICAgICAgICAgICAgICBzaWRlLiBFbWl0IGV2ZW50ICdjbG9zZScuIE9yIGVycm9yLCBlbWl0IGV2ZW50ICdlcnJvcicgd2l0aCBlcnJvci5cclxuICogLSAnY2xvc2luZycgLT4gJ2Nsb3NlZCcsIGlmIHRoZSBjb25uZWN0aW9uIHdhcyBjbG9zZWQuIEVtaXQgZXZlbnQgJ2Nsb3NlJy5cclxuICogLSBFbmQgaW4gc3RhdGUgJ2Nsb3NlZCcuXHJcbiAqIEFuZCBpbiBhZGRpdGlvbiB0byBldmVudCAnb3BlbicsICdjbG9zZScsICdlcnJvcicsIGFuIGV2ZW50ICdtZXNzYWdlJyBpcyBlbWl0dGVkXHJcbiAqIG9uIHJlY2VpdmluZyBhbiBtZXNzYWdlIGZyb20gdGhlIG90aGVyIHNpZGUuXHJcbiAqIE5vdGUgdGhhdCBhbGwgbWV0aG9zIG9mIEJhc2VDb25uZWN0aW9uIGhhdmUgYXBwbGljYWJsZSBzdGF0ZXMsIGNoZWNrIGRvY3VtZW50YXRpb25cclxuICogZm9yIGRldGFpbHMuXHJcbiAqL1xyXG5jbGFzcyBCYXNlQ29ubmVjdGlvbiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0IGEgbmV3IEJhc2VDb25uZWN0aW9uLlxyXG4gICAqIFRoZSByZXR1cm5lZCBCYXNlQ29ubmVjdGlvbiB3aWxsIGFsd2F5cyBiZSBpbiAnb3BlbmluZycgc3RhdGUuXHJcbiAgICogSW1wbGVtZW50YXRpb25zIHNob3VsZCBzdGFydCB0aGUgY29ubmVjdGlvbiBpbnRlcm5hbGx5IGhlcmUsIGFuZCBjYWxsXHJcbiAgICogb25PcGVuKCkgd2hlbiB0aGUgY29ubmVjdGlvbiBpcyBzdWNjZXNzZnVsbHkgb3BlbmVkLCBvciBvbkNsb3NlKCkgaWYgdGhlXHJcbiAgICogY29ubmVjdGlvbiBpcyBjbG9zZWQgZnJvbSB0aGUgb3RoZXJzaWRlLCBvciBvbkVycm9yKCkgaWYgdGhlIGNvbm5lY3Rpb25cclxuICAgKiBidW1wcyBpbnRvIGFuIGVycm9yLiBGYWlsaW5nIHRvIGRvIHNvIHdpbGwgbGVhZCB0byBtaXNiYWhhdmlvciBvZiBhcHBsaWNhdGlvbnMuXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG5cclxuICAgIHRoaXMuc3RhdGUgPSAnb3BlbmluZyc7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXF1ZXN0IHRoZSBjb25uZWN0aW9uIHRvIGNsb3NlLiBJbnRlcm5hbCBhYnN0cmFjdCBtZXRob2QuXHJcbiAgICogSW1wbGVtZW50YXRpb24gTVVTVCBjbG9zZSB0aGUgY29ubmVjdGlvbiBhdCBpbnZvY2F0aW9uLCBhbmQgaW52b2tlIG9uQ2xvc2UoKVxyXG4gICAqIHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgY2xvc2VkIG9yIG9uRXJyb3IoKSB3aGVuIHRoZSBjb25uZWN0aW9uIGlzIHVuYWJsZVxyXG4gICAqIHRvIGNsb3NlLiBNZWFud2hpbGUsIGltcGxlbWVudGF0aW9ucyBzaG91bGQgc2V0dXAgY2FsbGluZyBvbk1lc3NhZ2UoKSBvblxyXG4gICAqIGFycml2YWwgb2YgYSBtZXNzYWdlLiBPdGhlcndpc2UsIGFwcGxpY2F0aW9ucyBhcmUgbGlrZWx5IHRvIGJlaGF2ZSBzdHJhbmdlbHkuXHJcbiAgICogSXQgaXMgbm90IHJlY29tbWVuZGVkIHRvIGRpc3Bvc2Ugb2YgcmVzb3VyY2VzIGhlcmUsIHNpbmNlIGNsb3Npbmcgb24gZXJyb3JcclxuICAgKiBvciBmcm9tIHRoZSBvdGhlciBzaWRlIHdpbGwgbm90IGludm9rZSB0aGlzIG1ldGhvZC4gbGlzdGVuIHRvIHRoZSAnY2xvc2UnXHJcbiAgICogZXZlbnQgaW5zdGVhZC5cclxuICAgKiBUaGlzIG1ldGhvZCB3aWxsIG9ubHkgYmUgY2FsbGVkIGF0IHN0YXRlICdjbG9zaW5nJy5cclxuICAgKi9cclxuICByZXF1ZXN0Q2xvc2UgKCkgeyB9XHJcbiAgLyoqXHJcbiAgICogUmVxdWVzdCB0aGUgY29ubmVjdGlvbiB0byBzZW5kIHRoZSBnaXZlbiBkYXRhLiBJbnRlcm5hbCBhYnN0cmFjdCBtZXRob2QuXHJcbiAgICogSW1wbGVtZW50YXRpb25zIENBTiB0aHJvdyBhbiBlcnJvciBpZiB0aGUgZ2l2ZW4gZGF0YSBjYW5ub3QgYmUgc2VudC5cclxuICAgKiBUaGlzIG1ldGhvZCB3aWxsIG9ubHkgYmUgY2FsbGVkIGF0IHN0YXRlICdvcGVuZWQnLlxyXG4gICAqIEBwYXJhbSB7YW55fSBkYXRhIFRoZSBkYXRhIHRvIHNlbmQuXHJcbiAgICovXHJcbiAgcmVxdWVzdFNlbmQgKGRhdGEpIHsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVudXNlZC12YXJzXHJcblxyXG4gIC8qKlxyXG4gICAqIFJlcXVlc3QgdGhlIGNvbm5lY3Rpb24gdG8gY2xvc2UuIEZpbmFsIEFQSS5cclxuICAgKiBUaGlzIG1ldGhvZCB3aWxsIG9ubHkgYmUgYXZhaWxhYmxlIGF0IHN0YXRlICdvcGVuaW5nJyBhbmQgJ29wZW5lZCcuIE90aGVyd2lzZSxcclxuICAgKiBpbnZvY2F0aW9ucyB3aWxsIGJlIGlnbm9yZWQuXHJcbiAgICogTm90ZSB0aGF0IG9ubHkgYXQgZXZlbnQgJ2Nsb3NlJyB3aWxsIHRoZSBjb25uZWN0aW9uIGJlIGFjdHVhbGx5IGNsb3NlZC5cclxuICAgKiBJdCBpbnRlcm5hbGx5IGNhbGxzIHJlcXVlc3RDbG9zZSgpLlxyXG4gICAqL1xyXG4gIGNsb3NlICgpIHtcclxuICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xyXG4gICAgICBjYXNlICdvcGVuaW5nJzogY2FzZSAnb3BlbmVkJzpcclxuICAgICAgICB0aGlzLnN0YXRlID0gJ2Nsb3NpbmcnO1xyXG4gICAgICAgIHRoaXMucmVxdWVzdENsb3NlKCk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXF1ZXN0IHRoZSBjb25uZWN0aW9uIHRvIHNlbmQgZ2l2ZW4gZGF0YS4gRmluYWwgQVBJLlxyXG4gICAqIFRoaXMgbWV0aG9kIHdpbGwgb25seSBiZSBhdmFpbGFibGUgYXQgc3RhdGUgJ29wZW5lZCcuIE90aGVyd2lzZSwgaW52b2NhdGlvbnNcclxuICAgKiB3aWxsIGJlIGlnbm9yZWQuXHJcbiAgICogTm90ZSB0aGF0IHRoaXMgbWV0aG9kIG1pZ2h0IHRocm93IGFuIGVycm9yIG9yIGlnbm9yZSBpbnZhbGlkIGRhdGUgc2lsZW50bHkuIFRoZVxyXG4gICAqIGJlaGF2aW9yIGlzIHVwIHRvIHRoZSBkZWZpbml0aW9uLlxyXG4gICAqIEl0IGludGVybmFsbHkgY2FsbHMgcmVxdWVzdFNlbmQoKS5cclxuICAgKiBAcGFyYW0geyp9IGRhdGEgVGhlIGRhdGEgdG8gc2VuZC5cclxuICAgKi9cclxuICBzZW5kIChkYXRhKSB7XHJcbiAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcclxuICAgICAgY2FzZSAnb3BlbmVkJzpcclxuICAgICAgICB0aGlzLnJlcXVlc3RTZW5kKGRhdGEpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTm90aWZ5IHRoYXQgdGhlIGNvbm5lY3Rpb24gaGFzIG9wZW5lZC4gSW50ZXJuYWwgY2FsbGJhY2suXHJcbiAgICogVGhpcyBtZXRob2Qgd2lsbCBtYW5hZ2UgdGhlIGxpZmVjeWNsZSBhbmQgZW1pdCBldmVudHMuXHJcbiAgICogVGhpcyBtZXRob2Qgd2lsbCBvbmx5IGJlIGF2YWlsYWJsZSBhdCBzdGF0ZSAnb3BlbmluZycuIE90aGVyd2lzZSwgaW52b2NhdGlvbnNcclxuICAgKiB3aWxsIGJlIGlnbm9yZWQuXHJcbiAgICogVGhpcyBtZXRob2QgY2FuIGJlIHVzZWQgYXMgYSBjYWxsYmFjayB0byBlbmFibGUgYXN5bmNocm9ub3VzIG9wZXJhdGlvbnMuXHJcbiAgICovXHJcbiAgb25PcGVuICgpIHtcclxuICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xyXG4gICAgICBjYXNlICdvcGVuaW5nJzpcclxuICAgICAgICB0aGlzLnN0YXRlID0gJ29wZW5lZCc7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdvcGVuJyk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBOb3RpZnkgdGhhdCB0aGUgY29ubmVjdGlvbiBoYXMgYnVtcGVkIGludG8gYW4gZXJyb3IuIEludGVybmFsIGNhbGxiYWNrLlxyXG4gICAqIFRoaXMgbWV0aG9kIHdpbGwgbWFuYWdlIHRoZSBsaWZlY3ljbGUgYW5kIGVtaXQgZXZlbnRzLlxyXG4gICAqIFRoaXMgbWV0aG9kIHdpbGwgbm90IGJlIGF2YWlsYWJsZSBhdCBzdGF0ZSAnY2xvc2VkJy4gSW4gdGhpcyBjYXNlLCBpbnZvY2F0aW9uc1xyXG4gICAqIHdpbGwgYmUgaWdub3JlZC5cclxuICAgKiBUaGlzIG1ldGhvZCBjYW4gYmUgdXNlZCBhcyBhIGNhbGxiYWNrIHRvIGVuYWJsZSBhc3luY2hyb25vdXMgb3BlcmF0aW9ucy5cclxuICAgKi9cclxuICBvbkVycm9yIChlcnIpIHtcclxuICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xyXG4gICAgICBjYXNlICdvcGVuaW5nJzogY2FzZSAnb3BlbmVkJzpcclxuICAgICAgICB0aGlzLnN0YXRlID0gJ2Nsb3NlZCc7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdjbG9zZScpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlICdjbG9zaW5nJzpcclxuICAgICAgICB0aGlzLnN0YXRlID0gJ2Nsb3NlZCc7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdjbG9zZScpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTm90aWZ5IHRoYXQgdGhlIGNvbm5lY3Rpb24gaGFzIGNsb3NlZC4gSW50ZXJuYWwgY2FsbGJhY2suXHJcbiAgICogVGhpcyBtZXRob2Qgd2lsbCBtYW5hZ2UgdGhlIGxpZmVjeWNsZSBhbmQgZW1pdCBldmVudHMuXHJcbiAgICogVGhpcyBtZXRob2Qgd2lsbCBub3QgYmUgYXZhaWxhYmxlIGF0IHN0YXRlICdjbG9zZWQnLiBJbiB0aGlzIGNhc2UsIGludm9jYXRpb25zXHJcbiAgICogd2lsbCBiZSBpZ25vcmVkLlxyXG4gICAqIFRoaXMgbWV0aG9kIGNhbiBiZSB1c2VkIGFzIGEgY2FsbGJhY2sgdG8gZW5hYmxlIGFzeW5jaHJvbm91cyBvcGVyYXRpb25zLlxyXG4gICAqL1xyXG4gIG9uQ2xvc2UgKCkge1xyXG4gICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XHJcbiAgICAgIGNhc2UgJ29wZW5pbmcnOiBjYXNlICdvcGVuZWQnOiBjYXNlICdjbG9zaW5nJzpcclxuICAgICAgICB0aGlzLnN0YXRlID0gJ2Nsb3NlZCc7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdjbG9zZScpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTm90aWZ5IHRoYXQgdGhlIGNvbm5lY3Rpb24gaGFzIHJlY2VpdmVkIGEgbWVzc2FnZS4gSW50ZXJuYWwgY2FsbGJhY2suXHJcbiAgICogVGhpcyBtZXRob2Qgd2lsbCBtYW5hZ2UgdGhlIGxpZmVjeWNsZSBhbmQgZW1pdCBldmVudHMuXHJcbiAgICogVGhpcyBtZXRob2Qgd2lsbCBvbmx5IGJlIGF2YWlsYWJsZSBhdCBzdGF0ZSAnb3BlbmVkJy4gT3RoZXJ3aXNlLCBpbnZvY2F0aW9uc1xyXG4gICAqIHdpbGwgYmUgaWdub3JlZC5cclxuICAgKiBAcGFyYW0ge2FueX0gZGF0YSBUaGUgcmVjZWl2ZWQgZGF0YS5cclxuICAgKi9cclxuICBvbk1lc3NhZ2UgKGRhdGEpIHtcclxuICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xyXG4gICAgICBjYXNlICdvcGVuZWQnOlxyXG4gICAgICAgIHRoaXMuZW1pdCgnbWVzc2FnZScsIGRhdGEpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFRoZSBCYXNlQ29ubmVjdGlvbiBpbXBsZW1lbnRhdGlvbiB0aGF0IGNvbm5lY3RzIHVwb24gYSBwYXJlbnQgQmFzZUNvbm5lY3Rpb24uXHJcbiAqIFRoZSBDYXNjYWRlQ29ubmVjdGlvbiBsaXN0ZW5zIHRvIGV2ZW50cyBvZiB0aGUgcGFyZW50IEJhc2VDb25uZWN0aW9uIHRvIG1hbmFnZSBpdHNcclxuICogb3duIGxpZmVjeWNsZSwgYW5kIGRlbGVnYXRlcyBtZXRob2RzIHRvIHRoZSBwYXJlbnQgQmFzZUNvbm5lY3Rpb24uIEJ5IGRlZmF1bHQsIGl0XHJcbiAqIGluaGVyaXRzIGFsbCBldmVudHMgYW5kIGRlbGVnYXRlcyBhbGwgbWV0aG9kcywgaG93ZXZlciB0aGlzIGNhbiBiZSBjb25maWd1cmF0ZWQuXHJcbiAqIE1lYW53aGlsZSwgaXQgZW5hYmxlcyB0cmFuc2Zvcm1hdGlvbiBhbmQgZGV0cmFuc2Zvcm1hdGlvbiBvZiBzZW50IGFuZCByZWNlaXZlZFxyXG4gKiBtZXNzYWdlcy5cclxuICovXHJcbmNsYXNzIENhc2NhZGVDb25uZWN0aW9uIGV4dGVuZHMgQmFzZUNvbm5lY3Rpb24ge1xyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgQ2FzY2FkZUNvbm5lY3Rpb24gd2l0aCB0aGUgZ2l2ZW4gQmFzZUNvbm5lY3Rpb24uXHJcbiAgICogdGhpcy5wYXJlbnQgd2lsbCBiZSB1c2VkIHRvIHN0b3JlIHRoZSBnaXZlbiBwYXJlbnQgQmFzZUNvbm5lY3Rpb24uXHJcbiAgICogaW5oZXJpdHMgZGV0ZXJtaW5lcyB3aGljaCBldmVudHMgYXJlIGluaGVyaXRlZC4gQnkgZGVmYXVsdCBhbGwgZXZlbnRzIGFyZVxyXG4gICAqIGluaGVyaXRlZCwgdGhhdCBpcywgJ29wZW4nLCAnY2xvc2UnLCAnbWVzc2FnZScgYW5kICdlcnJvcicuIEluaGVyaXRhbmNlXHJcbiAgICogb2YgZXZlbnQgWCBjYW4gYmUgZGlzYWJsZWQgYnkgc3BlY2lmeWluZyBYOiBmYWxzZSBpbiBpbmhlcml0cywgbGlrZVxyXG4gICAqIGluaGVyaXRzID0geyBvcGVuOiBmYWxzZSB9LlxyXG4gICAqIE9uIGRpc2FibGUgdGhlIGluaGVyaXRhbmNlIG9mIGV2ZW50IFgsIGltcGxlbWVudGF0aW9ucyBzaG91bGQgaW1wbGVtZW50XHJcbiAgICogdGhlIGJlaGF2aW9yIGl0c2VsZiBieSBjYWxsaW5nIG9uT3BlbigpLCBvbkNsb3NlKCksIG9uRXJyb3IoKSBvciBvbk1lc3NhZ2UoKS5cclxuICAgKiBGb3IgZGlzYWJsaW5nIGluaGVyaXRhbmNlIG9mIG1ldGhvZHMsIHNlZSBkb2N1bWVudGF0aW9uIG9mIGVhY2ggbWV0aG9kLlxyXG4gICAqIElmICdtZXNzYWdlJyBldmVudCBpcyBpbmhlcml0ZWQsIGRldHJhbnNmb3JtKCkgaXMgdXNlZCB0byB0cmFuc2Zvcm0gZGF0YVxyXG4gICAqIHJlY2VpdmVkIGZyb20gcGFyZW50IGJhY2sgdG8gZGF0YSBhY2NlcHRhYmxlIGJ5IHRoaXMgY29ubmVjdGlvbi5cclxuICAgKiBAcGFyYW0ge0Jhc2VDb25uZWN0aW9ufSBwYXJlbnQgVGhlIHBhcmVudCB0byBpbmhlcml0LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBpbmhlcml0cyBUbyBjb25maWcgd2hpY2ggZXZlbnRzIHRvIGluaGVyaXQuXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IocGFyZW50LCBpbmhlcml0cyA9IHt9KSB7XHJcbiAgICBzdXBlcigpO1xyXG5cclxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG5cclxuICAgIGNvbnN0IHsgZXJyb3IsIGNsb3NlLCBvcGVuLCBtZXNzYWdlIH0gPVxyXG4gICAgICBkZWZhdWx0cyhpbmhlcml0cywgeyBlcnJvcjogdHJ1ZSwgY2xvc2U6IHRydWUsIG9wZW46IHRydWUsIG1lc3NhZ2U6IHRydWUgfSk7XHJcbiAgICBpZiAoZXJyb3IpIHBhcmVudC5vbignZXJyb3InLCB0aGlzLm9uRXJyb3IuYmluZCh0aGlzKSk7XHJcbiAgICBpZiAoY2xvc2UpIHBhcmVudC5vbignY2xvc2UnLCB0aGlzLm9uQ2xvc2UuYmluZCh0aGlzKSk7XHJcbiAgICBpZiAob3BlbikgcGFyZW50Lm9uKCdvcGVuJywgdGhpcy5vbk9wZW4uYmluZCh0aGlzKSk7XHJcbiAgICBpZiAobWVzc2FnZSkge1xyXG4gICAgICBwYXJlbnQub24oJ21lc3NhZ2UnLCAoZGF0YSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGRldHJhbnNmb3JtZWQgPSB0aGlzLmRldHJhbnNmb3JtKGRhdGEpO1xyXG4gICAgICAgIGlmICh0eXBlb2YgZGV0cmFuc2Zvcm1lZCA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybjtcclxuICAgICAgICB0aGlzLm9uTWVzc2FnZShkZXRyYW5zZm9ybWVkKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXF1ZXN0IGNvbm5lY3Rpb24gdG8gc2VuZCBnaXZlbiBkYXRhLiBJbmhlcml0ZWQgZnJvbSBCYXNlQ29ubmVjdGlvbi5cclxuICAgKiBCeSBkZWZhdWx0LCB0aGlzIG1ldGhvZCB1c2VzIHRyYW5zZm9ybSgpIHRvIHRyYW5zZm9ybSBwcm92aWRlZCBkYXRhIHRvIGRhdGFcclxuICAgKiBhY2NlcHRhYmxlIGJ5IHBhcmVudCBhbmQgdXNlIHBhcmVudC5zZW5kKCkuIEltcGxlbWVudGF0aW9ucyBjYW4gb3ZlcnJpZGUgdGhpc1xyXG4gICAqIG1ldGhvZCB0byBkaXNhYmxlIGRlbGVnYXRpb24uXHJcbiAgICogQHBhcmFtIHthbnl9IGRhdGEgVGhlIGRhdGEgdG8gc2VuZC5cclxuICAgKi9cclxuICByZXF1ZXN0U2VuZCAoZGF0YSkge1xyXG4gICAgdGhpcy5wYXJlbnQuc2VuZCh0aGlzLnRyYW5zZm9ybShkYXRhKSk7XHJcbiAgfVxyXG4gIC8qKlxyXG4gICAqIFJlcXVlc3QgY29ubmVjdGlvbiB0byBjbG9zZS4gSW5oZXJpdGVkIGZyb20gQmFzZUNvbm5lY3Rpb24uXHJcbiAgICogQnkgZGVmYXVsdCwgdGhpcyBtZXRob2QgY2FsbHMgcGFyZW50LmNsb3NlKCkuIEltcGxlbWVudGF0aW9uIGNhbiBvdmVycmlkZSB0aGlzXHJcbiAgICogdG8gZGlzYWJsZSBkZWxlZ2F0aW9uIG9yIGFkZCBhZGRpdGlvbmFsIGJlaGF2aW9yLlxyXG4gICAqL1xyXG4gIHJlcXVlc3RDbG9zZSAoKSB7XHJcbiAgICB0aGlzLnBhcmVudC53cyA/IHRoaXMucGFyZW50LndzLmNsb3NlKCkgOiB0aGlzLnBhcmVudC5jbG9zZSgpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGV0cmFuc2Zvcm0gZGF0YSByZWNlaXZlZCBmcm9tIHBhcmVudCBiYWNrIHRvIGRhdGEgYWNjZXB0YWJsZSBieSB0aGlzIGNvbm5lY3Rpb24uXHJcbiAgICogQnkgZGVmYXVsdCwgdGhpcyBtZXRob2Qga2VlcHMgdGhlIGRhdGEgYXMtaXMuXHJcbiAgICogSWYgdW5kZWZpbmVkIGlzIHJldHVybmVkLCB0aGlzLm9uTWVzc2FnZSgpIHdpbGwgbm90IGJlIGNhbGxlZC5cclxuICAgKiBAcGFyYW0ge2FueX0gZGF0YSBUaGUgZGF0YSB0byBkZXRyYW5zZm9ybS5cclxuICAgKi9cclxuICBkZXRyYW5zZm9ybSAoZGF0YSkgeyByZXR1cm4gZGF0YTsgfVxyXG4gIC8qKlxyXG4gICAqIERldHJhbnNmb3JtIGRhdGEgdG8gc2VuZCB0byBkYXRhIGFjY2VwdGFibGUgYnkgcGFyZW50LlxyXG4gICAqIEJ5IGRlZmF1bHQsIHRoaXMgbWV0aG9kIGtlZXBzIHRoZSBkYXRhIGFzLWlzLlxyXG4gICAqIEBwYXJhbSB7YW55fSBkYXRhIFRoZSBkYXRhIHRvIGRldHJhbnNmb3JtLlxyXG4gICAqL1xyXG4gIHRyYW5zZm9ybSAoZGF0YSkgeyByZXR1cm4gZGF0YTsgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBCYXNlQ29ubmVjdGlvbixcclxuICBDYXNjYWRlQ29ubmVjdGlvbixcclxufTtcclxuIl19