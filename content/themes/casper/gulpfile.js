const { series, watch, src, dest, parallel } = require('gulp');
const scss = require('gulp-sass')(require('sass'));
const pump = require('pump');
const autoprefixer = require('gulp-autoprefixer');
const imagemin = require('gulp-imagemin');

const zip = require('gulp-zip');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const beeper = require('beeper');
const clean = require('gulp-clean');

function serve(done) {
    done();
}

const handleError = (done) => {
    return function (err) {
        if (err) {
            beeper();
        }
        return done(err);
    };
};

function hbs(done) {
    pump([
        src(['*.hbs', 'partials/**/*.hbs']),
        dest('assets/built/hbs')
    ], handleError(done));
}

function styles(done) {
    pump([
        src('assets/scss/*.scss', { sourcemaps: true }),
        concat('style.min.css'),
        scss({ outputStyle: 'compressed' }).on('error', scss.logError),
        autoprefixer({
            cascade: false,
            overrideBrowserslist: ['last 8 versions']
        }),
        dest('assets/built/css/', { sourcemaps: '.' }),
    ], handleError(done));
}

function fonts(done) {
    pump([
        src('assets/fonts/**/*'),
        dest('assets/built/fonts/')
    ], handleError(done))
}

function js(done) {
    pump([
        src([
            'assets/js/lib/*.js',
            'assets/js/*.js'
        ], { sourcemaps: true }),
        concat('casper.js'),
        uglify(),
        dest('assets/built/js/', { sourcemaps: '.' }),
    ], handleError(done));
}

function zipper(done) {
    const filename = require('./package.json').name + '.zip';

    pump([
        src([
            '**',
            '!node_modules', '!node_modules/**',
            '!dist', '!dist/**',
            '!yarn-error.log',
            '!yarn.lock',
            '!gulpfile.js'
        ]),
        zip(filename),
        dest('dist/')
    ], handleError(done));
}

function images(done) {
    pump([
        src('assets/images/**/*'),
        imagemin(),
        dest('assets/built/images')
    ], handleError(done));
};

function cleanBuilt(done) {
    pump([
        src('assets/built', { read: false }),
        clean()
    ], handleError(done))
}

const scssWatcher = () => watch('assets/scss/**', styles);
const jsWatcher = () => watch('assets/js/**', js);
const hbsWatcher = () => watch(['*.hbs', 'partials/**/*.hbs'], hbs);
const fontsWatcher = () => watch('assets/fonts/**/*', fonts);
const imagesWatcher = () => watch('app/images/**/*', images)
const watcher = parallel(scssWatcher, jsWatcher, hbsWatcher, fontsWatcher, imagesWatcher);
const build = series(cleanBuilt, styles, js, fonts, images);

exports.imagemin = imagemin;
exports.build = build;
exports.zip = series(build, zipper);
exports.default = series(build, serve, watcher);
exports.styles = styles;
exports.fonts = fonts;
exports.cleanBuilt = cleanBuilt;