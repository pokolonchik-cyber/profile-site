const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// PostgreSQL setup (Render free, persists forever)
const { Pool } = require('pg');
const pgPool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;

const app = express();
const PORT = 3000;
const CONFIG_DIR = process.env.CONFIG_DIR || path.join(__dirname, 'config');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'public', 'uploads');
const BACKUP_DIR = '/tmp/render-config';
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

// Init files and DB
async function initConfig() {
  // Load from PostgreSQL first
  if (pgPool) {
    await pgInit();
    var dbSettings = await loadSettings();
    if (dbSettings) {
      if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(dbSettings, null, 2));
      console.log('Settings restored from PostgreSQL');
    }
    var dbConfig = await loadConfig();
    if (dbConfig) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(dbConfig, null, 2));
      console.log('Config restored from PostgreSQL');
    }
  }
  // Restore from /tmp backup
  try {
    if (fs.existsSync(path.join(BACKUP_DIR, 'settings.json'))) {
      if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.copyFileSync(path.join(BACKUP_DIR, 'settings.json'), SETTINGS_FILE);
      if (fs.existsSync(path.join(BACKUP_DIR, 'config.json')))
        fs.copyFileSync(path.join(BACKUP_DIR, 'config.json'), CONFIG_FILE);
      if (fs.existsSync(path.join(BACKUP_DIR, 'visitors.json')))
        fs.copyFileSync(path.join(BACKUP_DIR, 'visitors.json'), VISITORS_FILE);
    }
  } catch(e) { console.error('Backup restore failed:', e.message); }
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
initConfig().catch(function(e) { console.error('Init error:', e.message); });

// Debug: show DB status after init
setTimeout(function() {
  console.log('DB_URL set:', !!process.env.DATABASE_URL);
  console.log('pgPool:', !!pgPool);
}, 1000);

// PostgreSQL helper
async function pgQuery(text, params) {
  if (!pgPool) return null;
  try { return await pgPool.query(text, params); } catch(e) { console.error('DB error:', e.message); return null; }
}
async function pgInit() {
  if (!pgPool) {
    console.log('PG: no pool (DATABASE_URL not set)');
    return;
  }
  try {
    await pgQuery(`CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value JSONB)`);
    console.log('PG: table ready');
    // Check if we have data
    var r = await pgQuery('SELECT key FROM config');
    if (r && r.rows) console.log('PG: stored keys:', r.rows.map(function(r) { return r.key; }));
  } catch(e) {
    console.error('PG init error:', e.message);
  }
}
async function pgGet(key) {
  var r = await pgQuery('SELECT value FROM config WHERE key=$1', [key]);
  if (r && r.rows.length) return r.rows[0].value;
  return null;
}
async function pgSet(key, val) {
  await pgQuery('INSERT INTO config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2', [key, JSON.stringify(val)]);
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch(e) { return fallback || {}; }
}
function writeJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch(e) { console.error('Write failed:', e.message); }
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.writeFileSync(path.join(BACKUP_DIR, path.basename(file)), JSON.stringify(data, null, 2));
  } catch(e) { console.error('Backup failed:', e.message); }
  // Fire-and-forget to PostgreSQL
  if (pgPool) {
    if (file === SETTINGS_FILE) saveSettings(data).catch(function(){});
    else if (file === CONFIG_FILE) saveConfig(data).catch(function(){});
  }
}
// Persistent save via PostgreSQL
async function saveSettings(data) { if (pgPool) await pgSet('settings', data); }
async function loadSettings() {
  if (!pgPool) return null;
  var v = await pgGet('settings');
  return v;
}
async function saveConfig(data) { if (pgPool) await pgSet('config', data); }
async function loadConfig() {
  if (!pgPool) return null;
  var v = await pgGet('config');
  return v;
}

function parseUA(ua) {
  let browser = 'Unknown', os = 'Unknown', device = 'Desktop';
  if (!ua) return { browser, os, device };
  const b = ua.toLowerCase();
  if (b.includes('edg')) browser = 'Edge';
  else if (b.includes('vivaldi')) browser = 'Vivaldi';
  else if (b.includes('opr') || b.includes('opera')) browser = 'Opera';
  else if (b.includes('chrome')) browser = 'Chrome';
  else if (b.includes('firefox')) browser = 'Firefox';
  else if (b.includes('safari') && !b.includes('chrome')) browser = 'Safari';
  if (b.includes('iphone') || b.includes('ipad')) device = 'Mobile';
  else if (b.includes('android')) device = 'Mobile';
  else if (b.includes('mobile')) device = 'Mobile';
  else if (b.includes('tablet')) device = 'Tablet';
  if (b.includes('windows')) os = 'Windows';
  else if (b.includes('mac os') || b.includes('macintosh')) os = 'macOS';
  else if (b.includes('linux') && !b.includes('android')) os = 'Linux';
  else if (b.includes('android')) os = 'Android';
  else if (b.includes('iphone') || b.includes('ipad') || b.includes('like mac os')) os = 'iOS';
  return { browser, os, device };
}

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
app.use('/uploads', express.static(UPLOAD_DIR));
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
  if (!req.body || !req.body.password) return res.redirect('/login?error=1');
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
  const visitors = readJSON(VISITORS_FILE).reverse().map(v => ({ ...v, parsed: parseUA(v.ua) }));
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

app.post('/admin/bg-image', requireAuth, upload.single('bgImage'), (req, res) => {
  if (!req.file) return res.redirect('/admin?msg=No file');
  const settings = readJSON(SETTINGS_FILE);
  settings.bgType = 'image';
  settings.bgValue = '/uploads/' + req.file.filename;
  writeJSON(SETTINGS_FILE, settings);
  res.redirect('/admin?msg=Background image uploaded');
});

app.post('/admin/bg-video', requireAuth, upload.single('bgVideo'), (req, res) => {
  if (!req.file) return res.redirect('/admin?msg=No file');
  const settings = readJSON(SETTINGS_FILE);
  settings.bgType = 'video';
  settings.bgValue = '/uploads/' + req.file.filename;
  writeJSON(SETTINGS_FILE, settings);
  res.redirect('/admin?msg=Background video uploaded');
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

// Debug: check DB + settings status (admin only)
app.get('/admin/dbcheck', requireAuth, function(req, res) {
  res.json({
    dbUrl: !!process.env.DATABASE_URL,
    pgPool: !!pgPool,
    settingsFile: require('fs').existsSync(SETTINGS_FILE),
    settings: readJSON(SETTINGS_FILE, null),
    dbSettings: null
  });
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
