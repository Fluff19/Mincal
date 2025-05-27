const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE);
    return JSON.parse(data);
  } catch {
    return { users: [], posts: [] };
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const pageCSS = `
  body {
    font-family: Arial, sans-serif;
    background: #f0f0f5;
    color: #222;
    max-width: 600px;
    margin: 2em auto;
    padding: 1em 2em;
    border-radius: 8px;
    box-shadow: 0 0 12px #ccc;
  }
  h1 {
    color: #0055aa;
    text-align: center;
  }
  form {
    margin-top: 1em;
  }
  input, button, textarea {
    display: block;
    width: 100%;
    padding: 0.5em;
    margin: 0.5em 0;
    font-size: 1em;
    border-radius: 4px;
    border: 1px solid #999;
  }
  button {
    background: #0055aa;
    color: white;
    border: none;
    cursor: pointer;
    font-weight: bold;
  }
  button:hover {
    background: #003d80;
  }
  a {
    color: #0055aa;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  .error {
    color: red;
  }
  .post {
    border: 1px solid #ccc;
    padding: 0.8em;
    margin-top: 1.2em;
    border-radius: 6px;
    background: white;
  }
  .post-header {
    font-weight: bold;
    color: #0055aa;
  }
  .comment {
    margin-left: 1.2em;
    border-left: 2px solid #0055aa;
    padding-left: 0.6em;
    margin-top: 0.5em;
  }
  .comment-header {
    font-weight: bold;
    color: #0077cc;
  }
`;

function renderPage(title, bodyHTML) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${title}</title>
    <style>${pageCSS}</style>
  </head>
  <body>
    <h1>${title}</h1>
    ${bodyHTML}
  </body>
  </html>
  `;
}

app.use((req, res, next) => {
  req.user = null;
  if (req.cookies.user && req.cookies.pass) {
    const db = readDB();
    const user = db.users.find(u => u.name === req.cookies.user && u.password === req.cookies.pass);
    if (user) req.user = user;
  }
  next();
});

// Home page - show posts and forms to post & comment
app.get('/', (req, res) => {
  if (!req.user) {
    res.redirect('/login');
    return;
  }

  const db = readDB();

  // Render posts and comments
  const postsHTML = db.posts.map(post => {
    const commentsHTML = (post.comments || []).map(comment =>
      `<div class="comment">
        <div class="comment-header">${escapeHTML(comment.author)} says:</div>
        <div>${escapeHTML(comment.text)}</div>
      </div>`
    ).join('');

    return `
      <div class="post">
        <div class="post-header">${escapeHTML(post.author)} posted:</div>
        <div>${escapeHTML(post.text)}</div>
        ${commentsHTML}
        <form method="POST" action="/comment">
          <input type="hidden" name="postId" value="${post.id}" />
          <textarea name="text" placeholder="Add a comment" required rows="2"></textarea>
          <button type="submit">Comment</button>
        </form>
      </div>
    `;
  }).join('');

  const html = `
    <p>Welcome, <strong>${escapeHTML(req.user.name)}</strong>! <form method="POST" action="/logout" style="display:inline"><button type="submit">Logout</button></form></p>

    <h2>Create a new post:</h2>
    <form method="POST" action="/post">
      <textarea name="text" placeholder="What's on your mind?" required rows="4"></textarea>
      <button type="submit">Post</button>
    </form>

    <h2>Posts:</h2>
    ${postsHTML || '<p>No posts yet.</p>'}
  `;

  res.send(renderPage('Home', html));
});

// Create a new post
app.post('/post', (req, res) => {
  if (!req.user) return res.redirect('/login');
  const text = (req.body.text || '').trim();
  if (!text) {
    return res.send(renderPage('Error', `<p class="error">Post text cannot be empty.</p><a href="/">Go back</a>`));
  }

  const db = readDB();

  const newPost = {
    id: Date.now().toString(),
    author: req.user.name,
    text,
    comments: []
  };

  db.posts.push(newPost);
  saveDB(db);

  res.redirect('/');
});

// Add a comment to a post
app.post('/comment', (req, res) => {
  if (!req.user) return res.redirect('/login');
  const postId = req.body.postId;
  const text = (req.body.text || '').trim();

  if (!postId || !text) {
    return res.send(renderPage('Error', `<p class="error">Comment text cannot be empty.</p><a href="/">Go back</a>`));
  }

  const db = readDB();
  const post = db.posts.find(p => p.id === postId);
  if (!post) {
    return res.send(renderPage('Error', `<p class="error">Post not found.</p><a href="/">Go back</a>`));
  }

  post.comments.push({
    author: req.user.name,
    text
  });

  saveDB(db);
  res.redirect('/');
});

// Signup, login, logout routes same as before

app.get('/signup', (req, res) => {
  if (req.user) return res.redirect('/');
  const html = `
    <form method="POST" action="/signup">
      <input name="name" placeholder="Username" required autocomplete="off" />
      <input type="password" name="password" placeholder="Password" required autocomplete="off" />
      <button type="submit">Sign Up</button>
    </form>
    <p>Already have an account? <a href="/login">Login here</a></p>
  `;
  res.send(renderPage('Sign Up', html));
});

app.post('/signup', (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.send(renderPage('Sign Up', `<p class="error">Missing username or password.</p><a href="/signup">Try again</a>`));
  }
  let db = readDB();
  if (db.users.find(u => u.name === name)) {
    return res.send(renderPage('Sign Up', `<p class="error">Username already taken.</p><a href="/signup">Try again</a>`));
  }
  db.users.push({ name, password });
  saveDB(db);
  res.cookie('user', name, { httpOnly: true, sameSite: 'lax' });
  res.cookie('pass', password, { httpOnly: true, sameSite: 'lax' });
  res.redirect('/');
});

app.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  const html = `
    <form method="POST" action="/login">
      <input name="name" placeholder="Username" required autocomplete="off" />
      <input type="password" name="password" placeholder="Password" required autocomplete="off" />
      <button type="submit">Login</button>
    </form>
    <p>Don't have an account? <a href="/signup">Sign up here</a></p>
  `;
  res.send(renderPage('Login', html));
});

app.post('/login', (req, res) => {
  const { name, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.name === name && u.password === password);
  if (!user) {
    return res.send(renderPage('Login', `<p class="error">Login failed: Invalid username or password.</p><a href="/login">Try again</a>`));
  }
  res.cookie('user', name, { httpOnly: true, sameSite: 'lax' });
  res.cookie('pass', password, { httpOnly: true, sameSite: 'lax' });
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  res.clearCookie('user');
  res.clearCookie('pass');
  res.redirect('/login');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Utility: escape HTML to prevent injection in output
function escapeHTML(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case '\'': return '&#39;';
      default: return m;
    }
  });
}
