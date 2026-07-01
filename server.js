const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = 3000;
const CONFIG_DIR = path.join(__dirname, 'config');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');

// Ensure dirs
[CONFIG_DIR, UPLOAD_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// Default settings
const defaultSettings = {
  avatar: '',
  nickname: 'User',
  description: 'Welcome to my profile!',
  title: 'My Profile',
  favicon: '',
  links: [],
  discord: '',
  telegram: '',
  github: '',
  youtube: '',
  bgType: 'color',
  bgValue: '#0a0a0f',
  bgVideo: '',
  music: '',
  musicName: '',
  accentColor: '#8b5cf6',
  glassBlur: 16,
  particleCount: 60,
  effects: { glow: true, particles: true, scanlines: false },
  stats: { views: 0, clicks: 0 }
};

const VISITORS_FILE = path.join(CONFIG_DIR, 'visitors.json');

// Init files
function initConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ setupDone: false, admin: {}, ngrokToken: '' }, null, 2));
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
  }
  if (!fs.existsSync(VISITORS_FILE)) {
    fs.writeFileSync(VISITORS_FILE, JSON.stringify([], null, 2));
  }
}
initConfig();

function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// Multer config
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, ''))
  }),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session.admin) return next();
  res.redirect('/login');
}

// Stats + visitor logging
app.use((req, res, next) => {
  if (req.path === '/admin' || req.path.startsWith('/admin/') || req.path.startsWith('/login') || req.path.startsWith('/setup') || req.path === '/favicon.ico') return next();
  const settings = readJSON(SETTINGS_FILE);
  settings.stats.views++;
  writeJSON(SETTINGS_FILE, settings);
  // Log visitor
  const visitors = readJSON(VISITORS_FILE);
  visitors.push({
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress,
    time: new Date().toISOString(),
    path: req.path,
    ua: (req.headers['user-agent'] || '').substring(0, 100)
  });
  if (visitors.length > 500) visitors.splice(0, visitors.length - 500);
  writeJSON(VISITORS_FILE, visitors);
  next();
});

// Routes
app.get('/', (req, res) => {
  const settings = readJSON(SETTINGS_FILE);
  res.render('index', { settings });
});

app.get('/setup', (req, res) => {
  const config = readJSON(CONFIG_FILE);
  if (config.setupDone) return res.redirect('/login');
  res.render('setup');
});

app.post('/setup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Fill all fields');
  const config = readJSON(CONFIG_FILE);
  config.setupDone = true;
  config.admin = { username, password: crypto.createHash('sha256').update(password).digest('hex') };
  config.ngrokToken = req.body.ngrokToken || config.ngrokToken || '';
  writeJSON(CONFIG_FILE, config);
  req.session.admin = true;
  res.redirect('/admin');
});

app.get('/login', (req, res) => {
  const config = readJSON(CONFIG_FILE);
  if (!config.setupDone) return res.redirect('/setup');
  res.render('login', { error: req.query.error });
});

app.post('/login', (req, res) => {
  const config = readJSON(CONFIG_FILE);
  const hash = crypto.createHash('sha256').update(req.body.password).digest('hex');
  if (req.body.username === config.admin.username && hash === config.admin.password) {
    req.session.admin = true;
    return res.redirect('/admin');
  }
  res.redirect('/login?error=1');
});

// Admin panel
app.get('/admin', requireAuth, (req, res) => {
  const config = readJSON(CONFIG_FILE);
  const settings = readJSON(SETTINGS_FILE);
  const visitors = readJSON(VISITORS_FILE).reverse();
  res.render('admin', { settings, config, visitors, msg: req.query.msg || '' });
});

app.post('/admin/settings', requireAuth, (req, res) => {
  const settings = readJSON(SETTINGS_FILE);
  const allowed = ['nickname', 'description', 'title', 'discord', 'telegram', 'github', 'youtube', 'bgType', 'bgValue', 'bgVideo', 'music', 'musicName', 'accentColor', 'glassBlur', 'particleCount'];
  allowed.forEach(k => { if (req.body[k] !== undefined) settings[k] = req.body[k]; });
  if (req.body.links) {
    try { settings.links = typeof req.body.links === 'string' ? JSON.parse(req.body.links) : req.body.links; } catch(e) {}
  }
  if (req.body.effects) {
    try { settings.effects = { ...settings.effects, ...(typeof req.body.effects === 'string' ? JSON.parse(req.body.effects) : req.body.effects) }; } catch(e) {}
  }
  settings.glassBlur = parseInt(settings.glassBlur) || 16;
  settings.particleCount = parseInt(settings.particleCount) || 60;
  writeJSON(SETTINGS_FILE, settings);
  res.redirect('/admin?msg=Settings saved');
});

app.post('/admin/avatar', requireAuth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.redirect('/admin?msg=No file');
  const settings = readJSON(SETTINGS_FILE);
  settings.avatar = '/uploads/' + req.file.filename;
  writeJSON(SETTINGS_FILE, settings);
  res.redirect('/admin?msg=Avatar updated');
});

app.post('/admin/favicon', requireAuth, upload.single('favicon'), (req, res) => {
  if (!req.file) return res.redirect('/admin?msg=No file');
  const settings = readJSON(SETTINGS_FILE);
  settings.favicon = '/uploads/' + req.file.filename;
  writeJSON(SETTINGS_FILE, settings);
  res.redirect('/admin?msg=Favicon updated');
});

app.post('/admin/music', requireAuth, upload.single('music'), (req, res) => {
  const settings = readJSON(SETTINGS_FILE);
  if (req.file) {
    settings.music = '/uploads/' + req.file.filename;
  }
  if (req.body.musicName !== undefined) settings.musicName = req.body.musicName;
  writeJSON(SETTINGS_FILE, settings);
  res.redirect('/admin?msg=Music updated');
});

app.post('/admin/ngrok', requireAuth, (req, res) => {
  const config = readJSON(CONFIG_FILE);
  config.ngrokToken = req.body.ngrokToken || '';
  writeJSON(CONFIG_FILE, config);
  res.redirect('/admin?msg=Ngrok token saved. Restart server to apply.');
});

app.post('/admin/password', requireAuth, (req, res) => {
  const config = readJSON(CONFIG_FILE);
  const oldHash = crypto.createHash('sha256').update(req.body.oldPassword).digest('hex');
  if (oldHash !== config.admin.password) return res.redirect('/admin?msg=Wrong password');
  config.admin.password = crypto.createHash('sha256').update(req.body.newPassword).digest('hex');
  writeJSON(CONFIG_FILE, config);
  res.redirect('/admin?msg=Password changed');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/click', (req, res) => {
  const settings = readJSON(SETTINGS_FILE);
  settings.stats.clicks++;
  writeJSON(SETTINGS_FILE, settings);
  res.json({ clicks: settings.stats.clicks });
});

// Start
async function start() {
  app.listen(PORT, () => {
    console.log(`\n  Server: http://localhost:${PORT}`);
  });

  const config = readJSON(CONFIG_FILE);
  if (config.setupDone && config.ngrokToken) {
    try {
      const ngrok = require('@ngrok/ngrok');
      await ngrok.authtoken(config.ngrokToken);
      const listener = await ngrok.connect({ addr: PORT });
      const url = listener.url();
      console.log(`  Ngrok: ${url}\n`);
      fs.writeFileSync(path.join(__dirname, 'ngrok_url.txt'), url);
    } catch (e) {
      console.log(`  Ngrok error: ${e.message}`);
      console.log('  Check your token or internet connection\n');
    }
  }
}

start();
