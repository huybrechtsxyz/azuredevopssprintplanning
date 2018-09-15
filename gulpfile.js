'use strict';

let gulp       = require('gulp'),
    rename     = require("gulp-rename"),
    concat     = require('gulp-concat'),
    uglify     = require('gulp-uglify'),
    sourcemaps = require('gulp-sourcemaps'),
    http       = require('http'),
    st         = require('st'),
    livereload = require('gulp-livereload'),
    replace    = require('gulp-replace'),
    copy       = require('gulp-copy'),
    webserver  = require('gulp-webserver'),
    fs         = require('fs'),
    util       = require("gulp-util"),
    del        = require('del');

let publisherId = 'yanivsegev'
try{
    publisherId = fs.readFileSync('publisherid', 'utf8');
}catch(e){
    util.log('If your publisher id from microsoft visual studio is not "' + publisherId + '", create a file at the root of the project with your publisher id inside');
}

let css = {
    sourceFiles: ['styles/main.css', 'styles/jquery-ui.css'],
    fileName: 'dropPlan',
    environment: {
        dev:{
            path: './dist/dev/styles/',
            extension: '.css'
        },
        prod:{
            path: './dist/prod/styles/',
            extension: '.min.css'
        }
    }
};

let js = {
    sourceFiles: ["scripts/Promise.js"
    ,"scripts/Polyfill.js"
    ,"scripts/components/SprintData.js"
    ,"scripts/components/Workitem.js"
    ,"scripts/components/VSSRepository.js"    
    ,"scripts/jquery-1.12.1.min.js"
    ,"scripts/jquery-ui.min.js"
    ,"scripts/VSS.SDK.min.js"
    ,"scripts/TableLock.js"
    ,"scripts/DateHealpers.js"
    ,"scripts/DropPlanHelper.js"
    ,"scripts/arrows.js"
    ,"scripts/themes.js"
    ,"scripts/DropPlanVSS.js"],
    fileName: 'dropPlan',
    environment: {
        dev: {
            path: './dist/dev/scripts/',
            extension: '.js'
        },
        prod: {
            path: './dist/prod/scripts/',
            extension: '.min.js',
            sourceFiles: ["scripts/ga.js"
            ,"scripts/trackjs.js"]
        }
    }
};

let Development = {
    Scripts: function(){
        return gulp.src(js.sourceFiles)
          .pipe(concat(js.fileName + js.environment.dev.extension))
          .pipe(sourcemaps.init({loadMaps: true}))
          .pipe(sourcemaps.write('.', {addComment: false}))
          .pipe(gulp.dest(js.environment.dev.path))
          .pipe(livereload());
    },
    Styles: function(){
        return gulp.src(css.sourceFiles)
          .pipe(concat(css.fileName + css.environment.dev.extension))
          .pipe(gulp.dest(css.environment.dev.path))
          .pipe(livereload());
    },
    Env: 'dev'
};
let Production = {
    Scripts: function(){
        return gulp.src([
            js.environment.prod.sourceFiles[0]
          , js.environment.prod.sourceFiles[1]
          , js.environment.dev.path + js.fileName + js.environment.dev.extension])
          .pipe(concat(js.fileName + js.environment.prod.extension))
          .pipe(sourcemaps.init({loadMaps: true}))
          //.pipe(uglify())
          .pipe(sourcemaps.write('.', {addComment: false}))
          .pipe(gulp.dest(js.environment.prod.path));
    },
    Styles: function(){
        return gulp.src([css.environment.dev.path + css.fileName + css.environment.dev.extension])
          .pipe(rename({extname: css.environment.prod.extension}))
          .pipe(gulp.dest(css.environment.prod.path));
    },
    Env: 'prod'
};

function clean(){
    return del('dist');
}
function copyStaticFiles(env){
    return function CopyEnvStaticFiles(){
        return gulp.src(['styles/*.css', '!styles/jquery-ui.css',
                        'images/*',
                        'README.md',
                        'LICENSE'])
        .pipe(copy('./dist/' + env + '/'));
    }
}
function copyDynamicFiles(env, templateData){
    return function BuildAndCopyDynamicFiles(){
        let task = gulp.src(['index.html', 'vss-extension.json'])  
            
        templateData.forEach(function(data, index){
            task.pipe(replace(data.Key, data.Value));
        });
        task.pipe(gulp.dest('./dist/' + env));
        return task;
    }
}
exports.watch = function(done){
    build( () => {
        livereload.listen();
        gulp.watch('scripts/**/*.js', Development.Scripts);
        gulp.watch('styles/**/*.css', Development.Styles);
        gulp.watch('images/**/*.*', copyStaticFiles(Development.Env));
        gulp.watch('*.html', copyDynamicFiles(Development.Env, [
            {Key: '#{now}', Value: new Date().toJSON()},
            {Key: '#{testing-flag}', Value: '-test'},
            {Key: '"public": false', Value: '"public": false'},
            {Key: '"yanivsegev"', Value: '"' + publisherId + '"'},
            {Key: '"uri": "index.html"', Value: '"uri": "https://localhost:8080"'},
            {Key: '#{isMinified}', Value: ''}
        ]));
        
        gulp.src('./dist/dev')
        .pipe(webserver({
        livereload: false,
        directoryListing: false,
        open: false,
        https: true,
        port: 8080
        }));

    });
}
let build = gulp.series(
        clean, 
        gulp.parallel(
            Development.Styles, 
            Development.Scripts,
            copyStaticFiles(Development.Env),
            copyStaticFiles(Production.Env),
            copyDynamicFiles(Development.Env, [
                {Key: '#{now}', Value: new Date().toJSON()},
                {Key: '#{testing-flag}', Value: '-test'},
                {Key: '"public": false', Value: '"public": false'},
                {Key: '"yanivsegev"', Value: '"' + publisherId + '"'},
                {Key: '"uri": "index.html"', Value: '"uri": "https://localhost:8080"'},
                {Key: '#{isMinified}', Value: ''}
            ]),
            copyDynamicFiles(Production.Env, [
                {Key: '#{now}', Value: new Date().toJSON()},
                {Key: '#{testing-flag}', Value: ''},
                {Key: '"public": false', Value: '"public": true'},
                //{Key: '"yanivsegev"', Value: '"yanivsegev"'},
                //{Key: '"uri": "index.html"', Value: '"uri": "index.html"'},
                {Key: '#{isMinified}', Value: '.min'}
            ])),
            gulp.parallel(
                Production.Scripts,
                Production.Styles
            ));

exports.default = build;
exports.clean = clean
exports.styles = Development.Styles
exports.scripts = Development.Scripts