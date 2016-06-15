'use strict';

var fs = require('fs'),
	path = require('path');

var gulp = require('gulp'),
	mergeStream = require('merge-stream'),
	browserify = require('browserify'),
	source = require('vinyl-source-stream'),
	buffer = require('vinyl-buffer'),
	loadPlugins = require('gulp-load-plugins');

var plugins = loadPlugins({
	config: path.join(__dirname, 'package.json')
});

var pkg = require('./package.json');

var header = ['/**',
		' * <%= pkg.name %>',
		' * <%= pkg.description %>',
		' * @version v<%= pkg.version %>',
		' * @link <%= pkg.homepage %>',
		' * @license <%= pkg.license %>',
		' */',
		''
	].join('\n');

gulp.task('build-dependencies', function() {
	return browserify()
		.require('string-mask', {
			expose: 'string-mask'
		})
		.require('moment', {
			expose: 'moment'
		})
		.require('br-validations', {
			expose: 'br-validations'
		})
		.bundle()
		.pipe(source('angular-simple-number-mask-dependencies.js'))
		.pipe(buffer())
		.pipe(gulp.dest('./build/'))
		.pipe(plugins.uglify())
		.pipe(plugins.rename({
			extname: '.min.js'
		}))
		.pipe(gulp.dest('./build/'));
});

gulp.task('build', ['build-dependencies'], function() {
	var files = [{
		fileName: 'angular-simple-number-mask.js',
		debug: false,
		bundleExternal: false
	}, {
		fileName: 'angular-simple-number-mask.js',
		outputFileName: 'angular-simple-number-mask-standalone.js',
		debug: false,
		bundleExternal: true
	}, {
		fileName: 'angular-simple-number-mask.js',
		outputFileName: 'angular-simple-number-mask-debug.js',
		debug: true,
		bundleExternal: true
	}];

	var tasks = files.map(function(entry) {
		return browserify({
			entries: entry.fileName,
			detectGlobals: false,
			basedir: './src/',
			debug: entry.debug,
			bundleExternal: entry.bundleExternal,
		})
		.bundle()
		.pipe(source(entry.outputFileName || entry.fileName))
		.pipe(buffer())
		.pipe(plugins.header(header, {pkg: pkg}))
		.pipe(gulp.dest('./build/'))
		.pipe(plugins.uglify())
		.pipe(plugins.rename({
			extname: '.min.js'
		}))
		.pipe(gulp.dest('./build/'));
	});

	return mergeStream(tasks);
});

var VERSION;

gulp.task('getVersion', function() {
	var argv = require('minimist')(process.argv.slice(2));

	VERSION = argv.version || pkg.version;
});

var bowerConfig = {
	repository: 'git@github.com:dimitarnestorov/angular-simple-number-mask.git',
	path: './bower-angular-simple-number-mask'
};

gulp.task('default', ['build'], function() {
	gulp.watch('src/**/*.js', ['build']);
});

gulp.task('serve', ['build'], function(done) {
	var express = require('express');
	var server = express();

	server.use(express.static('./'));
	server.listen(8000, function() {
		console.log('Server running in port 8000');
		done();
	});
});

gulp.task('changelog', ['getVersion'], function(done) {
	var changelog = require('conventional-changelog');

	var options = {
		repository: pkg.homepage,
		version: VERSION,
		file: 'CHANGELOG.md'
	};

	var filePath = path.join(__dirname, options.file);
	changelog(options, function(err, log) {
		if (err) {
			throw err;
		}

		fs.writeFile(filePath, log, done);
	});
});

function bumpVersion(folder) {
	return gulp.src([
		'bower.json',
		'package.json'
	], {
		cwd: folder
	})
	.pipe(plugins.bump({
		version: VERSION
	}))
	.pipe(gulp.dest(folder));
}

gulp.task('version-bump', ['getVersion'], function() {
	return bumpVersion('./');
});

gulp.task('release', ['version-bump', 'changelog']);

gulp.task('bower-clone', ['build'], function(done) {
	plugins.git.clone(bowerConfig.repository, {
		args: '--depth=2'
	}, function(err) {
		if (err) {
			throw err;
		}

		done();
	});
});

gulp.task('bower-commit', ['getVersion', 'bower-clone'], function() {
	return mergeStream(
			bumpVersion(bowerConfig.path),
			gulp.src('./build/**/*.*')
				.pipe(gulp.dest(bowerConfig.path))
		)
		.pipe(plugins.git.add({
			cwd: bowerConfig.path
		}))
		.pipe(plugins.git.commit('release: version ' + VERSION, {
			cwd: bowerConfig.path
		}));
});

gulp.task('bower-tag', ['getVersion', 'bower-commit'], function(done) {
	plugins.git.tag(VERSION, 'v' + VERSION, {
		cwd: bowerConfig.path
	}, function(err) {
		if (err) {
			throw err;
		}

		done();
	});
});

gulp.task('bower-push', ['bower-tag'], function(done) {
	plugins.git.push('origin', 'master', {
		args: ' --follow-tags',
		cwd: bowerConfig.path
	}, function(err) {
		if (err) {
			throw err;
		}

		done();
	});
});

gulp.task('bower-release', ['bower-push']);
