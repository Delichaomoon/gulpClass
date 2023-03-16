var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var sass = require('gulp-sass')(require('sass'));
var autoprefixer = require('autoprefixer');
var mainBowerFiles = require('main-bower-files');
var browserSync = require('browser-sync').create();
var minimist = require('minimist');
var gulpSequence = require('gulp-sequence');


var envOptions = {
  string: 'env',
  default: {env: 'develop'}
}
var options =minimist(process.argv.slice(2),envOptions)
console.log(options);

gulp.task('clean', function () {
  return gulp.src(['./.tmp','./public'], {read: false, allowEmpty :true })
    .pipe($.clean());
});


gulp.task('copyHTML',function(){
    return gulp.src('./source/**/*.html')
    .pipe(gulp.dest('./public/'))
});

gulp.task('jade', function() {
    // var YOUR_LOCALS = {};
    gulp.src('./source/**/*.jade')
      .pipe($.plumber())
      .pipe($.data(function(){
          var khData = require('./source/data/data.json');
          var menu = require('./source/data/menu.json');
          var source = {
            'khData': khData,
            'menu': menu
          };
          return source;
        }))
      .pipe($.jade({
        pretty: true
        // locals: YOUR_LOCALS
      }))
      .pipe(gulp.dest('./public/'))
      .pipe(browserSync.stream());
  });

function buildStyles() {
  return gulp.src('./source/**/*.scss')
    .pipe($.plumber())
		.pipe($.sourcemaps.init())
    .pipe(sass({
      includePaths:['./node_modules/bootstrap/scss']
    })
      .on('error', sass.logError))
    //編譯完成
    .pipe($.postcss([autoprefixer()]))
    .pipe($.if(options.env === "production", $.minifyCss()))
		.pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('./public/css'))
    .pipe(browserSync.stream());
};
  
exports.buildStyles = buildStyles;
exports.watch = function () {
  gulp.watch('./source/**/*.scss', ['buildStyles']);
  gulp.watch('./source/**/*.jade',['jade'])
  gulp.watch('source/**/*.js',['babel'])
  gulp.watch(['./source/scss/**/*.scss'], function() {  
    // 直接呼叫 sass 這個 Task
    gulp.start('buildStyles');
  });
};

gulp.task('babel', () =>
	gulp.src('source/**/*.js')
		.pipe($.sourcemaps.init())
		.pipe($.babel({
			presets: ['@babel/preset-env']
		}))
		.pipe($.concat('all.js'))
		.pipe($.uglify({
      compress:{
        drop_console: true
      }
    }))
    .pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest('./public/js'))
    .pipe(browserSync.stream())
);

gulp.task('bower', function() {
  return gulp.src(mainBowerFiles({
    "overrides":{
      "vue": {
        "main" :'dist/vue.js'
      }
    }
  }))
    .pipe(gulp.dest('./.tmp/vendors'))
});
gulp.task('vendorJS' ,function(){
  return gulp.src(
    './.tmp/vendors/**/**.js',
    '.\node_modules\bootstrap\dist\js\bootstrap.bundle.min.js')
  .pipe($.order([
    'jquery.js',
    'bootstrap.js'
  ]))
  .pipe($.concat('vendor.js'))
  .pipe($.if(options.env === "production",$.uglify()))
  .pipe(gulp.dest('./public/js'))
})

gulp.task('image',function() {
  return gulp.src('./source/img/**/*')
  .pipe($.if(options.env ==='production', $.imagemin()))
  .pipe(gulp.dest('./public/img/'));
});


gulp.task('browser-sync', function() {
  browserSync.init({
    server: {
        baseDir: "./public/"
    },
    reloadDebounce:2000
  });
});

// gulp.task('deploy', () => gulp.src('./public/**/*').pipe($.ghPages()));


// gulp.task('build', gulpSequence('clean','jade','buildStyles','image','babel','vendorJS'))


// gulp.task('default',['jade','buildStyles','babel','vendorJS','image','browser-sync','watch']);

gulp.task('build',
  gulp.series(
    'clean',
    'bower',
    'vendorJS',
    gulp.parallel('jade','buildStyles','babel','image')
  )
)

gulp.task('default',
  gulp.series(
    'clean',
    'bower',
    'vendorJS',
    gulp.parallel('jade','buildStyles','babel','image'),
    function(done){
      browserSync.init({
        server: {
            baseDir: "./public/"
        },
        reloadDebounce:2000
      });
      gulp.watch('./source/**/*.scss', gulp.series('buildStyles'));
      gulp.watch('./source/**/*.jade', gulp.series('jade'));
      gulp.watch('source/**/*.js',gulp.series('babel'));
      done();
    }
  )
)