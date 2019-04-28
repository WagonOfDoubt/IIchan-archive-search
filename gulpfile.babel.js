import gulp from 'gulp';
import concat from 'gulp-concat';
import include from 'gulp-include';
import rename from 'gulp-rename';
import del from 'del';


const paths = {
  scripts: {
    src: [
      'src/*.meta.js',
      'src/*.main.js',
    ],
    dest: 'dist',
    watch: './src/**',
  },
};


export const clean = () => del(paths.scripts.dest);


export const build = () => {
  return gulp
    .src(paths.scripts.src)
    .pipe(concat('IIchan-archive-search'))
    .pipe(include({
      hardFail: true
    }))
    .pipe(rename({ suffix: '.user', extname: '.js' }))
    .pipe(gulp.dest(paths.scripts.dest));
};


export const watch = () => {
  gulp.watch(paths.scripts.watch, build);
};


export default build;
