var express = require('express');
var router = express.Router();
var createDOMPurify = require('dompurify');
var { JSDOM } = require('jsdom');
var window = (new JSDOM('')).window;
var DOMPurify = createDOMPurify(window);

module.exports = function (db, io) {
    router.get('/', (req, res) => {
        res.redirect('/home');
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
    router.post('/register', (req, res) => {
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
    router.post('/login', (req, res) => {
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
    router.post('/message', (req, res) => {
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
    router.post('/message/:user', (req, res) => {
        if (req.session.loggedin && DOMPurify.sanitize(req.body.message) != "") {
            db.insertPrivateMessage(req.session.username, req.params.user, DOMPurify.sanitize(req.body.message)).then((resolve, reject) => {
                if (reject) {
                    console.log("Error on /message/:user: " + reject);
                    res.sendStatus(500);
                } else {
                    io.emit('privateMessage', { mFrom: req.session.username, mTo: req.params.user, message: DOMPurify.sanitize(req.body.message) });
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