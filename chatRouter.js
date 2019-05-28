var express = require('express');
var router = express.Router();

module.exports = function (db, io) {
    router.get('/', (req, res) => {
        res.redirect('/home');
    });
    router.get('/:user', (req, res) => {
        if (req.session.loggedin) {
            if (req.params.user === req.session.username) {
                res.redirect('/home');
            } else {
                db.deleteOldMessages().then((re, rej) => {
                    db.getAllMessagesWithUser(req.session.username, req.params.user).then((rows, err) => {
                        if (err) {
                            res.send('Error fetching your chat: ' + err);
                        } else {
                            db.getLastOnline(req.params.user).then((r, err2) => {
                                if (err2) {
                                    res.send('Error fetching last online');
                                } else {
                                    db.updateLastAction(req.session.username).then((re, rej) => {
                                        res.render('singleChat', {
                                            title: 'Chat | ' + req.params.user, name: 'chat', chat: rows,
                                            loggedin: true, username: req.session.username, toUser: req.params.user,
                                            lastOnline: r.lastOnline
                                        });
                                    });
                                }

                            });
                        }
                    });
                });
            }
        } else {
            res.redirect('/login')
        }
    });
    return router;
}