
/********************************************************************
 * Imports
 *******************************************************************/

var gulp = require("gulp");
var gutil = require("gulp-util");
var sass = require("gulp-sass");
var addsrc = require('gulp-add-src');
var clean = require('gulp-clean');

/********************************************************************
 * Tasks
 *******************************************************************/

gulp.task("clean", function () { 

  return gulp.src('../dist/', { read: false })
        .pipe(clean({force : true }));
  
});

gulp.task("compile", ["clean"], function () {

  // copy everything that doesn't need further processing
  gulp.src(["plugins/**", "!plugins/**/*.scss"])
    .pipe(gulp.dest("../dist/"));
    
  // compile styles
  gulp.src("plugins/**/*.scss")
    .pipe(sass({ style: "expanded" }))
    .pipe(gulp.dest("../dist/"));
    
});

gulp.task("default", ["compile"]);