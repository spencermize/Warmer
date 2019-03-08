var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var compression = require('compression');
var hbs = require('express-hbs');

const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const config = require('./webpack.config.js');
const compiler = webpack(config);

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');

module.exports = function(){
	var app = express();

	//view engine setup
	app.set('views',path.join(__dirname,'views'));
	app.set('view engine','hbs');
	app.engine('hbs',hbs.express4({
		defaultLayout: path.join(__dirname,'/views/layout.hbs'),
		partialsDir: path.join(__dirname,'/views/partials/')
	}));

	app.use(compression());
	app.use(logger('dev'));
	app.use(express.json());
	app.use(express.urlencoded({ extended: false }));
	app.use(cookieParser());

	app.use(webpackDevMiddleware(compiler,{
		publicPath: config.output.publicPath
	}));

	app.use(express.static(path.join(__dirname,'public')));

	app.use('/',indexRouter);
	app.use('/api/',apiRouter);

	//catch 404 and forward to error handler
	app.use(function(req,res,next){
		next(createError(404));
	});

	//error handler
	app.use(function(err,req,res,_next){
		//set locals, only providing error in development
		res.locals.message = err.message;
		res.locals.error = req.app.get('env') === 'development' ? err : {};

		//render the error page
		res.status(err.status || 500);
		res.render('error');
	});

	return app;
};
