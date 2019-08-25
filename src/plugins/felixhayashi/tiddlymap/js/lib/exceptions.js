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
class TiddlyMapError extends Error {

  /**
   *
   * @param {string} message
   * @param {array} payload
   */
  constructor(message, payload) {
    super(message);
    this.payload = payload;
  }

  getPayload() {
    return this.payload;
  }

}

/**
 * Thrown if a css or dom structure is not present but was expected by TiddlyMap.
 */
export class EnvironmentError extends TiddlyMapError {
  constructor(aspect) {
    super(`Critical parts of the underlying system changed: ${aspect}`);
  };
}

/**
 * Thrown if a plugin or any other kind of required dependency is missing.
 */
export class DependencyError extends TiddlyMapError {
  constructor(dep) {
    super(`TiddlyMap cannot run without: : ${dep}`);
  };
}

/**
 * Thrown if an interface method is not fully implemented.
 */
export class MissingOverrideError extends TiddlyMapError {
  constructor(context, methodName) {
    super(`${context.constructor.name} does not override method "${methodName}"`);
  };
}

/**
 * Thrown if a resource such as a node, edge, view, tiddler etc. cannot be located
 * in the system.
 */
export class ResourceNotFoundException extends TiddlyMapError {

  /**
   * @param {string} resourceType
   * @param {*} payload
   */
  constructor(resourceType, ...payload) {
    super(`Cannot resolve ${resourceType}`, payload);
  };

}

/**
 * Thrown if a resource such as a node, edge, view, tiddler etc. cannot be located
 * in the system.
 */
export class InvalidArgumentException extends TiddlyMapError {
  constructor(...payload) {
    super('Invalid or missing argument provided', payload);
  };
}
