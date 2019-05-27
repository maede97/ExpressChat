const sqlite3 = require('sqlite3').verbose();
const Promise = require('bluebird');

class DataBase {
  constructor(dbFilePath) {
    this.db = new sqlite3.Database(dbFilePath, (err) => {
      if (err) {
        console.log("Could not connect to database", err);
      } else {
        this.db.run('CREATE TABLE IF NOT EXISTS `users` \
    ( `id` INTEGER PRIMARY KEY AUTOINCREMENT, `username` TEXT NOT NULL, `password` TEXT NOT NULL, \
    `created` DATETIME DEFAULT CURRENT_TIMESTAMP, lastOnline DATETIME DEFAULT CURRENT_TIMESTAMP)');
        this.db.run('CREATE TABLE IF NOT EXISTS `chat` \
    ( `id` INTEGER PRIMARY KEY AUTOINCREMENT, `user_id` INTEGER, `to_user_id` INTEGER, `message` TEXT, \
    `sent` DATETIME DEFAULT CURRENT_TIMESTAMP, \
    FOREIGN KEY(`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE, \
    FOREIGN KEY(`to_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE)');
      }
    });
  }

  deleteOldMessages() {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM `chat` WHERE id <= (SELECT id FROM (SELECT id FROM `chat` ORDER BY id DESC LIMIT 1 OFFSET 100) foo)', [], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  updateLastAction(username) {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE users SET lastOnline=CURRENT_TIMESTAMP WHERE username=?', [username], (err) => {
        if (err) {
          console.log("Error: " + err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  alreadyExists(username) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) FROM users WHERE username=?', [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    })
  }

  insertUser(username, password) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO users(username, password, status) VALUES (?, ?, ?)', [username, password, 'Happy to check this out.'], (err) => {
        if (err) {
          reject(err);
          console.log("Error on insertUser");
        } else {
          resolve();
          console.log("A new user " + username + " has been created.");
        }
      });
    });
  }

  checkLogin(username, password) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) FROM users WHERE username=? and password=?', [username, password], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  getUserID(username) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT id FROM users WHERE username=?', [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      })
    })
  }

  getPublicMessages() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT username as mFrom, "" as mTo, message, sent FROM chat, users WHERE chat.user_id = users.id AND chat.to_user_id IS NULL', [], (err, rows) => {
        if (err) {
          console.log('Error running sql getPublicMessages');
          console.log(err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  insertPrivateMessage(username, toUser, message) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO chat (user_id, to_user_id, message) VALUES \
      ((SELECT id FROM users WHERE username=?), (SELECT id FROM USERS WHERE username=?), ?)', [username, toUser, message], function (err) {
          if (err) {
            console.log('Error running sql insertMessage');
            console.log(err);
            reject(err);
          } else {
            resolve({ id: this.lastID });
          }
        });
    });
  }

  insertMessage(username, message) {
    // wants username, message
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO chat (user_id, message) VALUES ((SELECT id FROM users WHERE username=?), ?)', [username, message], function (err) {
        if (err) {
          console.log('Error running sql insertMessage');
          console.log(err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  getLastOnline(username) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT lastOnline FROM users WHERE username=?', [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  getAllMessagesWithUser(username, other) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM (SELECT id, (SELECT username FROM users WHERE id=chat.user_id) AS mFrom, \
      (SELECT username FROM users WHERE id=chat.to_user_id) AS mTo, message, sent FROM chat WHERE \
      chat.user_id = (SELECT id FROM users WHERE username=?) AND chat.to_user_id = (SELECT id FROM users WHERE username=?) UNION \
      SELECT id, (SELECT username FROM users WHERE id=chat.user_id) AS mFrom, \
      (SELECT username FROM users WHERE id=chat.to_user_id) AS mTo, message, sent FROM chat WHERE \
      chat.user_id = (SELECT id FROM users WHERE username=?) AND chat.to_user_id = (SELECT id FROM users WHERE username=?)) ORDER BY id ASC',
        [username, other, other, username], (err, rows) => {
          if (err) {
            console.log("Error: getAllMessagesToUser: " + err);
            reject(err);
          } else {
            resolve(rows);
          }
        });
    });
  }
}

module.exports = DataBase
