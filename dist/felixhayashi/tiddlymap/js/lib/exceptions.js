'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/exception
type: application/javascript
module-type: library

@preserve

\*/
/* @preserve TW-Guard */

/**
 * Base class for all Exceptions in TiddlyMap
 */
var TiddlyMapError = function (_Error) {
  _inherits(TiddlyMapError, _Error);

  /**
   *
   * @param {string} message
   * @param {array} payload
   */
  function TiddlyMapError(message, payload) {
    _classCallCheck(this, TiddlyMapError);

    var _this = _possibleConstructorReturn(this, (TiddlyMapError.__proto__ || Object.getPrototypeOf(TiddlyMapError)).call(this, message));

    _this.payload = payload;
    return _this;
  }

  _createClass(TiddlyMapError, [{
    key: 'getPayload',
    value: function getPayload() {
      return this.payload;
    }
  }]);

  return TiddlyMapError;
}(Error);

/**
 * Thrown if a css or dom structure is not present but was expected by TiddlyMap.
 */


var EnvironmentError = exports.EnvironmentError = function (_TiddlyMapError) {
  _inherits(EnvironmentError, _TiddlyMapError);

  function EnvironmentError(aspect) {
    _classCallCheck(this, EnvironmentError);

    return _possibleConstructorReturn(this, (EnvironmentError.__proto__ || Object.getPrototypeOf(EnvironmentError)).call(this, 'Critical parts of the underlying system changed: ' + aspect));
  }

  return EnvironmentError;
}(TiddlyMapError);

/**
 * Thrown if a plugin or any other kind of required dependency is missing.
 */


var DependencyError = exports.DependencyError = function (_TiddlyMapError2) {
  _inherits(DependencyError, _TiddlyMapError2);

  function DependencyError(dep) {
    _classCallCheck(this, DependencyError);

    return _possibleConstructorReturn(this, (DependencyError.__proto__ || Object.getPrototypeOf(DependencyError)).call(this, 'TiddlyMap cannot run without: : ' + dep));
  }

  return DependencyError;
}(TiddlyMapError);

/**
 * Thrown if an interface method is not fully implemented.
 */


var MissingOverrideError = exports.MissingOverrideError = function (_TiddlyMapError3) {
  _inherits(MissingOverrideError, _TiddlyMapError3);

  function MissingOverrideError(context, methodName) {
    _classCallCheck(this, MissingOverrideError);

    return _possibleConstructorReturn(this, (MissingOverrideError.__proto__ || Object.getPrototypeOf(MissingOverrideError)).call(this, context.constructor.name + ' does not override method "' + methodName + '"'));
  }

  return MissingOverrideError;
}(TiddlyMapError);

/**
 * Thrown if a resource such as a node, edge, view, tiddler etc. cannot be located
 * in the system.
 */


var ResourceNotFoundException = exports.ResourceNotFoundException = function (_TiddlyMapError4) {
  _inherits(ResourceNotFoundException, _TiddlyMapError4);

  /**
   * @param {string} resourceType
   * @param {*} payload
   */
  function ResourceNotFoundException(resourceType) {
    _classCallCheck(this, ResourceNotFoundException);

    for (var _len = arguments.length, payload = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      payload[_key - 1] = arguments[_key];
    }

    return _possibleConstructorReturn(this, (ResourceNotFoundException.__proto__ || Object.getPrototypeOf(ResourceNotFoundException)).call(this, 'Cannot resolve ' + resourceType, payload));
  }

  return ResourceNotFoundException;
}(TiddlyMapError);

/**
 * Thrown if a resource such as a node, edge, view, tiddler etc. cannot be located
 * in the system.
 */


var InvalidArgumentException = exports.InvalidArgumentException = function (_TiddlyMapError5) {
  _inherits(InvalidArgumentException, _TiddlyMapError5);

  function InvalidArgumentException() {
    _classCallCheck(this, InvalidArgumentException);

    for (var _len2 = arguments.length, payload = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      payload[_key2] = arguments[_key2];
    }

    return _possibleConstructorReturn(this, (InvalidArgumentException.__proto__ || Object.getPrototypeOf(InvalidArgumentException)).call(this, 'Invalid or missing argument provided', payload));
  }

  return InvalidArgumentException;
}(TiddlyMapError);
//# sourceMappingURL=./maps/felixhayashi/tiddlymap/js/lib/exceptions.js.map
