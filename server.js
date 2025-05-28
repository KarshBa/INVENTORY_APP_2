const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
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

// Load item DB (using row indices: A=0, B=1, C=2, N=13)
let itemDB = {};
const loadItemDB = () => {
  itemDB = {};
  if (fs.existsSync(ITEM_DB)) {
    let first = true;
    fs.createReadStream(ITEM_DB)
      .pipe(csv({ headers: false }))
      .on('data', row => {
        if (first) { first = false; return; }
        const code = row[0].toString().trim();
        const brand = row[1];
        const description = row[2];
        const price = parseFloat(row[13]);
        itemDB[code] = { brand, description, price };
      });
  }
};
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
  const code = req.params.code;
  if (itemDB[code]) return res.json({ exists: true, item: itemDB[code] });
  return res.json({ exists: false });
});

app.post('/api/item', (req, res) => {
  const { code, brand, description, price } = req.body;
  itemDB[code] = { brand, description, price: parseFloat(price) };
  const headerExists = fs.existsSync(ITEM_DB);
  const writer = createCsvWriter({
    path: ITEM_DB,
    header: [
      { id: 0, title: 'Main Code' },
      { id: 1, title: 'Main Brand' },
      { id: 2, title: 'Main Item Description' },
      { id: 13, title: 'Regular Price' }
    ],
    append: headerExists
  });
  writer.writeRecords([[code, brand, description, price]])
    .then(() => { loadItemDB(); res.json({ success: true }); });
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
  fs.createReadStream(fp)
    .pipe(csv())
    .on('data', r => rows.push({
      code: r.code,
      quantity: parseFloat(r.quantity),
      price: parseFloat(r.price),
      total: parseFloat(r.total)
    }))
    .on('end', () => res.json(rows));
});

app.post('/api/list/:name/update', (req, res) => {
  const { name } = req.params;
  const { code, delta } = req.body;
  const date = new Date().toISOString().slice(0,10);
  const fn = `${name}_${date}.csv`;
  const fp = path.join(LISTS_DIR, fn);
  if (!fs.existsSync(fp)) return res.status(400).json({ error: 'List not initialized' });
  const data = {};
  fs.createReadStream(fp)
    .pipe(csv())
    .on('data', r => {
      data[r.code] = { quantity: parseFloat(r.quantity), price: parseFloat(r.price) };
    })
    .on('end', () => {
      const prev = data[code] || { quantity: 0, price: itemDB[code]?.price || 0 };
      const newQty = prev.quantity + parseFloat(delta);
      data[code] = { quantity: newQty, price: prev.price };
      const writer = createCsvWriter({
        path: fp,
        header: [
          { id: 'code', title: 'code' },
          { id: 'quantity', title: 'quantity' },
          { id: 'price', title: 'price' },
          { id: 'total', title: 'total' }
        ]
      });
      writer.writeRecords(Object.entries(data).map(([c, v]) => ({
        code: c,
        quantity: v.quantity,
        price: v.price,
        total: v.quantity * v.price
      }))).then(() => res.json({ success: true, data }));
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
