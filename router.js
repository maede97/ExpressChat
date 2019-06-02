var express = require('express');
var router = express.Router();
var createDOMPurify = require('dompurify');
var { JSDOM } = require('jsdom');
var window = (new JSDOM('')).window;
var DOMPurify = createDOMPurify(window);
var fileUpload = require('express-fileupload');
var bodyParser = require('body-parser');

module.exports = function (db, io) {
    router.get('/', (req, res) => {
        res.redirect('/home');
    });

    router.post('/image', fileUpload(), (req, res) => {
        if (req.session.loggedin) {
            if (Object.keys(req.files).length == 0) {
                return res.status(400).send('No files were uploaded.');
            }
            let image = req.files.image;
            image.mv('./public/images/chat/' + image.name, function (err) {
                if (err) {
                    return res.status(500).send(err);
                } else {
                    db.insertImage(req.session.username, '/images/chat/' + image.name).then((re, rej) => {
                        if (rej) {
                            res.send('Error on insert');
                        } else {
                            io.emit('message', { mFrom: req.session.username, mTo: 'all', message: '/images/chat/' + image.name, image:true});
                            db.updateLastAction(req.session.username).then((re, rej) => {
                                res.sendStatus(200);
                            });
                        }
                    });
                }
            });
        } else {
            res.redirect('/login');
        }
    });
    router.post('/image/:user', fileUpload(), (req, res) => {
        if (req.session.loggedin) {
            if (Object.keys(req.files).length == 0) {
                return res.status(400).send('No files were uploaded.');
            }
            let image = req.files.image;
            image.mv('./public/images/chat/' + image.name, function (err) {
                if (err) {
                    return res.status(500).send(err);
                } else {
                    db.insertPrivateImage(req.session.username, req.params.user, '/images/chat/' + image.name).then((re, rej) => {
                        if (rej) {
                            res.send('Error on insert');
                        } else {
                            io.to(req.session.username).emit('privateMessage', { mFrom: req.session.username, mTo: req.params.user, message: '/images/chat/' + image.name, image:true});
                            io.to(req.params.user).emit('privateMessage', { mFrom: req.session.username, mTo: req.params.user, message: '/images/chat/' + image.name, image:true});
                            db.updateLastAction(req.session.username).then((re, rej) => {
                                res.sendStatus(200);
                            });
                        }
                    });
                }
            });
        } else {
            res.redirect('/login');
        }
    });

    // home route
    router.get('/home', function (req, res) {
        if (req.session.loggedin) {
            db.deleteOldMessages().then((re, rej) => {
                db.getPublicMessages().then((rows, err) => {
                    if (err) {
                        console.log("error fetching public messages");
                        res.render('index', { title: 'Chat | ' + req.session.username, loggedin: true, username: req.session.username, chat: [] });
                    } else {
                        db.updateLastAction(req.session.username).then((re, rej) => {
                            res.render('index', { title: 'Chat | ' + req.session.username, loggedin: true, username: req.session.username, chat: rows, name: 'home' });
                        });
                    }
                });
            });
        } else {
            res.render('login', { title: 'Login', warning: 'Please login to use this page.', loggedin: false, name: 'login' });
        }
    });

    // register route
    router.post('/register', bodyParser.urlencoded({ extended: true }), bodyParser.json(), (req, res) => {
        if (req.session.loggedin) {
            res.redirect('/home');
            return;
        }
        var username = DOMPurify.sanitize(req.body.username);
        var password = DOMPurify.sanitize(req.body.password);
        if (username && password) {
            db.alreadyExists(username).then(row => {
                if (row['COUNT(*)'] == 0) {
                    db.insertUser(username, password).then(() => {
                        req.session.loggedin = true;
                        req.session.username = username;
                        io.emit('register', { user: username });
                        res.redirect('/home');
                    });
                } else {
                    res.render('login', { warning: 'Please choose a different username', title: 'Login', loggedin: false, name: 'login' });
                }
            });
        } else {
            res.render('login', { title: 'Login', warning: 'Please submit username and password', loggedin: false, name: 'login' });
        }
    });

    // login route
    router.get('/login', (req, res) => {
        if (req.session.loggedin) {
            res.redirect('/home');
        } else {
            res.render('login', { title: 'Login', loggedin: false, name: 'login' });
        }
    });

    // logout route
    router.get('/logout', (req, res) => {
        if (req.session.loggedin) {
            io.emit('logout', { user: req.session.username });
            req.session.loggedin = false;
            req.session.username = undefined;
        }
        res.redirect('/login');
    });

    // authentication
    router.post('/login', bodyParser.urlencoded({ extended: true }), bodyParser.json(), (req, res) => {
        if (req.session.loggedin) {
            res.redirect('/home');
            return;
        }
        var username = req.body.username;
        var password = req.body.password;
        if (username && password) {
            db.checkLogin(username, password).then(row => {
                if (row['COUNT(*)'] == 1) {
                    req.session.loggedin = true;
                    req.session.username = username;
                    io.emit('login', { user: username });
                    res.redirect('/home');
                } else {
                    res.render('login', { warning: 'Wrong login credentials.', title: 'Login', loggedin: false, name: 'login' });
                }
            });
        } else {
            res.render('login', { title: 'Login', warning: 'Please submit username and password', loggedin: false, name: 'login' });
        }
    });

    // submit new message
    router.post('/message', bodyParser.urlencoded({ extended: true }), bodyParser.json(), (req, res) => {
        if (req.session.loggedin && DOMPurify.sanitize(req.body.message) != "") {
            db.insertMessage(req.session.username, DOMPurify.sanitize(req.body.message)).then((resolve, reject) => {
                if (reject) {
                    console.log("Error on /message (using POST): " + reject);
                    res.sendStatus(500);
                } else {
                    io.emit('message', { mFrom: req.session.username, mTo: 'all', message: DOMPurify.sanitize(req.body.message) });
                    db.updateLastAction(req.session.username).then((re, rej) => {
                        res.sendStatus(200);
                    });
                }
            });
        } else {
            res.send('You are not logged in.');
        }
    });

    // send message to specific user
    router.post('/message/:user', bodyParser.urlencoded({ extended: true }), bodyParser.json(), (req, res) => {
        if (req.session.loggedin && DOMPurify.sanitize(req.body.message) != "") {
            db.insertPrivateMessage(req.session.username, req.params.user, DOMPurify.sanitize(req.body.message)).then((resolve, reject) => {
                if (reject) {
                    console.log("Error on /message/:user: " + reject);
                    res.sendStatus(500);
                } else {
                    io.sockets.in(req.session.username).emit('privateMessage', { mFrom: req.session.username, mTo: req.params.user, message: DOMPurify.sanitize(req.body.message) });
                    io.sockets.in(req.params.user).emit('privateMessage', { mFrom: req.session.username, mTo: req.params.user, message: DOMPurify.sanitize(req.body.message) });
                    db.updateLastAction(req.session.username).then((re, rej) => {
                        res.sendStatus(200);
                    });
                }
            });
        } else {
            res.send('You are not logged in.');
        }
    });

    return router;
};