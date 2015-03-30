/*\
title: $:/plugins/felixhayashi/tiddlymap/map-macro.js
type: application/javascript
module-type: macro

In connection with tiddlymap, this macro allows us to access
system information from within tiddlers as well as to execute some
util functions.

@preserve

\*/

(function(){
  
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  var utils = require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;

  /*
  Information about this macro
  */

  exports.name = "map-macro";

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
       
    switch(arguments[0]) {
      
      case "basename":
      
        return utils.getBasename(arguments[1]);
        
      case "testJSON": 
      
        var tObj = $tw.wiki.getTiddler(this.getVariable("currentTiddler"));
        //console.log("haalloo", tObj, this.getVariable("currentTiddler"), arguments);
        try {
          JSON.parse(tObj.fields[arguments[1]]);
          return "✔ (Valid JSON)";
        } catch(SyntaxError) {
          return "✘ (Malformed JSON)";
        }
        
      case "splitAndSelect":
      
        var str = this.getVariable("currentTiddler");
        var result = str.split(arguments[1])[arguments[2]];
        
        return (result != null ? result : str);
        
      
      case "option":
      
        var prop = $tw.tmap.opt;
        var propertyPath = arguments[1].split(".");

        for(var i = 0; i < propertyPath.length; i++) {
          if(typeof prop == "object" && prop[propertyPath[i]]) {
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
