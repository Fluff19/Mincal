// firebase-fs.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json'); // Not in GitHub

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://<your-project-id>.firebaseio.com'
});

const dbRef = admin.database().ref('/file/db.json');

module.exports = {
  readFileSync: (path, encoding) => {
    // pretend to read from db.json
    const done = require('deasync').loopWhile;
    let finished = false;
    let result = '';

    dbRef.once('value', (snapshot) => {
      result = JSON.stringify(snapshot.val() || {});
      finished = true;
    });

    done(() => !finished);
    return result;
  },

  writeFileSync: (path, data) => {
    dbRef.set(JSON.parse(data));
  }
};
