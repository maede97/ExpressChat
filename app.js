// set global modules
var createError = require('http-errors');
var express = require('express');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var DataBase = require('./database');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var db = new DataBase("database.db");
var Router = require('./router')(db,io);
var ChatRouter = require('./chatRouter')(db,io);

io.on('connection',socket=> {
	socket.on('join',data=> {
		socket.join(data);
	})
	socket.on('typing-all',data=> {
		socket.broadcast.emit('typing-all',data); // send to all except sender
	});
	socket.on('typing-private', data => {
		console.log("private to " + data.toUser);
		io.to(data.toUser).emit('typing-private',data);
	})
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
	secret: 'super-awesome-secret-123456789!!!',
	resave: true,
	saveUninitialized: true
}));
app.use(logger('dev'));

// do all routing
app.use('/',Router);
app.use('/chat', ChatRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	// render the error page
	res.status(err.status || 500);
	res.render('error');
});
var server = http.listen(3000, () => {
	console.log("server started at " + server.address().port);
});
