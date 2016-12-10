// @preserve
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/exception
type: application/javascript
module-type: library

@preserve

\*/

export class EnvironmentError extends Error {
  constructor(aspect) {
    super(`Critical parts of the underlying system changed: ${aspect}`);
  };
}

export class DependencyError extends Error {
  constructor(dep) {
    super(`TiddlyMap cannot run without: : ${dep}`);
  };
}

export class MissingOverrideError extends Error {
  constructor(context, methodName) {
    super(`${context.constructor.name} does not override method "${methodName}"`);
  };
}