/*\
title: $:/plugins/felixhayashi/taskgraph/tgmacro.js
type: application/javascript
module-type: macro

In connection with taskgraph, this macro allows us to access some
needed information from within tiddlers as well as to execute some
util functions.

\*/
(function(){
  
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  var utils = require("$:/plugins/felixhayashi/taskgraph/utils.js").utils;

  /*
  Information about this macro
  */

  exports.name = "tgmacro";

  // unfortunately tw forces us to specify params in advance so I will
  // reserve some argument slots here.. lets say five.
  exports.params = (function(maxArgs) {
    var arr = [];
    for(var i = 0; i < maxArgs; i++) {
      arr.push({ name : ("arg" + i) });
    };
    return arr;
  })(5);
  
  var getErrorNotification = function() {
    return 
  };

  exports.run = function() {
    
    //~ if($tw.taskgraph.opt.tw.debug) console.log("macro called with arguments");
    //~ if($tw.taskgraph.opt.tw.debug) console.log(arguments);
    
    switch(arguments[0]) {
      
      case "basename":
      
        return utils.getBasename(arguments[1]);
        
      case "option":
      
        var prop = $tw.taskgraph.opt;
        var propertyPath = arguments[1].split(".");
        //~ if($tw.taskgraph.opt.tw.debug) console.log(propertyPath);
        //~ if($tw.taskgraph.opt.tw.debug) console.log(prop);
        for(var i = 0; i < propertyPath.length; i++) {
          if(typeof prop == "object" && propertyPath[i] in prop) {
            prop = prop[propertyPath[i]];
          } else {
            return "property doesn't exist";
          }          
        }
        
        if(!(typeof prop == "string")) return "property is not a string";
        
        return prop;
    } 
    
    return "wrong signature";
    
  };

})();
