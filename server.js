const express = require('express');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data directories
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const ITEM_DB = path.join(DATA_DIR, 'item_list.csv');
const LISTS_DIR = path.join(DATA_DIR, 'lists');
if (!fs.existsSync(LISTS_DIR)) fs.mkdirSync(LISTS_DIR);

// Load item DB synchronously by reading lines and splitting columns
let itemDB = {};
function loadItemDB() {
  itemDB = {};
  if (!fs.existsSync(ITEM_DB)) return;
  const content = fs.readFileSync(ITEM_DB, 'utf8');
  const lines = content.split(/\r?\n/);
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    const code = cols[0].trim();
    const brand = cols[1] || '';
    const description = cols[2] || '';
    const price = parseFloat(cols[13] || '0');
    itemDB[code] = { brand, description, price };
  }
}
loadItemDB();

// Multer for CSV upload
const upload = multer({ dest: 'uploads/' });

// Admin endpoints
app.post('/api/admin/upload-db', upload.single('file'), (req, res) => {
  if (fs.existsSync(ITEM_DB)) fs.unlinkSync(ITEM_DB);
  fs.renameSync(req.file.path, ITEM_DB);
  loadItemDB();
  res.json({ success: true });
});

app.get('/api/admin/lists', (req, res) => {
  const files = fs.readdirSync(LISTS_DIR)
    .filter(f => f.endsWith('.csv'))
    .map(f => ({ name: f, date: f.match(/_(\d{4}-\d{2}-\d{2})\.csv$/)[1] }));
  res.json(files);
});

app.get('/api/admin/lists/:file', (req, res) => {
  const file = path.basename(req.params.file);
  const fp = path.join(LISTS_DIR, file);
  if (fs.existsSync(fp)) return res.download(fp);
  res.status(404).send('Not found');
});

// User endpoints
app.get('/api/item/:code', (req, res) => {
  const code = req.params.code.trim();
  if (itemDB.hasOwnProperty(code)) {
    return res.json({ exists: true, item: itemDB[code] });
  } else {
    return res.json({ exists: false });
  }
});

app.post('/api/item', (req, res) => {
  const { code, brand, description, price } = req.body;
  const line = [
    code,
    brand,
    description,
    ...Array(10).fill(''),
    price
  ].join(',');
  const headerExists = fs.existsSync(ITEM_DB);
  if (!headerExists) {
    // Write header row (A-N) if new
    const headerCols = ['Main Code','Main Brand','Main Item Description']
      .concat(Array(10).fill(''))
      .concat(['Regular Price']);
    fs.writeFileSync(ITEM_DB, headerCols.join(',') + '\n');
  }
  fs.appendFileSync(ITEM_DB, line + '\n');
  loadItemDB();
  res.json({ success: true });
});

app.get('/api/list/:name', (req, res) => {
  const name = req.params.name;
  const date = new Date().toISOString().slice(0,10);
  const fn = `${name}_${date}.csv`;
  const fp = path.join(LISTS_DIR, fn);
  if (!fs.existsSync(fp)) {
    // Initialize with four columns including total
    fs.writeFileSync(fp, 'code,quantity,price,total\n');
  }
  const rows = [];
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    rows.push({
      code: cols[0],
      quantity: parseFloat(cols[1]),
      price: parseFloat(cols[2]),
      total: parseFloat(cols[3])
    });
  }
  res.json(rows);
});

app.post('/api/list/:name/update', (req, res) => {
  const { name } = req.params;
  const { code, delta } = req.body;
  const date = new Date().toISOString().slice(0,10);
  const fn = `${name}_${date}.csv`;
  const fp = path.join(LISTS_DIR, fn);
  if (!fs.existsSync(fp)) return res.status(400).json({ error: 'List not initialized' });
  // Read existing data
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split(/\r?\n/);
  const header = lines[0];
  const dataMap = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    dataMap[cols[0]] = {
      quantity: parseFloat(cols[1]),
      price: parseFloat(cols[2])
    };
  }
  const prev = dataMap[code] || { quantity: 0, price: itemDB[code]?.price || 0 };
  const newQty = prev.quantity + parseFloat(delta);
  dataMap[code] = { quantity: newQty, price: prev.price };
  // Build CSV
  const rows = Object.entries(dataMap).map(([c, v]) =>
    `${c},${v.quantity},${v.price},${v.quantity * v.price}`
  );
  fs.writeFileSync(fp, header + '\n' + rows.join('\n') + '\n');
  // Return updated map
  res.json({ success: true, data: dataMap });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
