
/********************************************************************
 * Imports
 *******************************************************************/

var gulp = require("gulp");
var gutil = require("gulp-util");
var sass = require("gulp-sass");
var addsrc = require("gulp-add-src"); // https://github.com/gulpjs/gulp/issues/396
var addsrc = require("gulp-uglify");
var esprima = require('gulp-esprima');
var debug = require('gulp-debug');
//~ var jsdoc = require("gulp-jsdoc");

// non gulp
var del = require("del"); // rm -rf
//var jsdoc = require("jsdoc");

/********************************************************************
 * Tasks
 *******************************************************************/

// clean will not be run twice, even though it is called as a dependency twice.
// @see https://github.com/gulpjs/gulp/blob/master/docs/recipes/running-tasks-in-series.md
gulp.task("clean", function (cb) { 

  var options = { force: true };
  del([ "../dist/"/*, "../docs/"*/ ], options, cb);
  
});

// TODO: minify and uglify
gulp.task("compile", ["clean"], function () {

  // copy everything that doesn't need further processing
  gulp.src(["plugins/**", "!plugins/**/*.scss"])
    .pipe(gulp.dest("../dist/"));
    
  // compile styles
  gulp.src("plugins/**/*.scss")
    .pipe(sass({ style: "expanded" }))
    .pipe(gulp.dest("../dist/"));
    
});

gulp.task("create docs", ["clean"], function () {

  //~ gulp.src([ "plugins/felixhayashi/taskgraph/jsdoc_typedefs.js" ])
    //~ .pipe(jsdoc("../docs/"));
    
});

gulp.task("default", ["compile", "create docs"]);