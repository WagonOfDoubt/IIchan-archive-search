const gulp          = require('gulp');
const include       = require('gulp-include');
const concat        = require('gulp-concat');
const pump          = require('pump');


gulp.task('make', function(cb) {
  return pump([
    gulp.src(['src/IIchan-archive-search.meta.js', 'src/IIchan-archive-search.main.js']),
    concat('IIchan-archive-search.user.js'),
    include({hardFail: true}),
    gulp.dest('')
  ]);
});


gulp.task('make:watch', function () {
  gulp.watch('./src/**', ['make']);
});


gulp.task('default', ['make']);
