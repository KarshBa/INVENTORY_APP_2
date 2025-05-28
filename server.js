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

// Data storage directories
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const ITEM_DB = path.join(DATA_DIR, 'item_list.csv');
const LISTS_DIR = path.join(DATA_DIR, 'lists');
if (!fs.existsSync(LISTS_DIR)) fs.mkdirSync(LISTS_DIR);

// Load item DB into memory
let itemDB = {};
const loadItemDB = () => {
  itemDB = {};
  if (fs.existsSync(ITEM_DB)) {
    fs.createReadStream(ITEM_DB)
      .pipe(csv())
      .on('data', row => {
        itemDB[row.code] = {
          brand: row.brand,
          description: row.description,
          price: parseFloat(row.price)
        };
      });
  }
};
loadItemDB();

// Multer setup for .csv upload
const upload = multer({ dest: 'uploads/' });
// Admin: upload database
app.post('/api/admin/upload-db', upload.single('file'), (req, res) => {
  if (fs.existsSync(ITEM_DB)) fs.unlinkSync(ITEM_DB);
  fs.renameSync(req.file.path, ITEM_DB);
  loadItemDB();
  res.json({ success: true });
});

// Admin: list all user lists
app.get('/api/admin/lists', (req, res) => {
  const files = fs.readdirSync(LISTS_DIR)
    .filter(f => f.endsWith('.csv'))
    .map(f => ({ name: f, date: f.replace(/.*_(\d{4}-\d{2}-\d{2})\.csv$/, '$1') }));
  res.json(files);
});
// Admin: download a list
app.get('/api/admin/lists/:file', (req, res) => {
  const file = path.basename(req.params.file);
  const filePath = path.join(LISTS_DIR, file);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else res.status(404).send('Not found');
});

// User: get item info
app.get('/api/item/:code', (req, res) => {
  const code = req.params.code;
  if (itemDB[code]) return res.json({ exists: true, item: itemDB[code] });
  return res.json({ exists: false });
});
// User: add new item to DB
app.post('/api/item', (req, res) => {
  const { code, brand, description, price } = req.body;
  itemDB[code] = { brand, description, price: parseFloat(price) };
  const headerExists = fs.existsSync(ITEM_DB);
  const writer = createCsvWriter({
    path: ITEM_DB,
    header: [
      { id: 'code', title: 'code' },
      { id: 'brand', title: 'brand' },
      { id: 'description', title: 'description' },
      { id: 'price', title: 'price' }
    ],
    append: headerExists
  });
  writer.writeRecords([{ code, brand, description, price }])
    .then(() => res.json({ success: true }));
});

// User: initialize or get list
app.get('/api/list/:name', (req, res) => {
  const name = req.params.name;
  const date = new Date().toISOString().slice(0,10);
  const filename = `${name}_${date}.csv`;
  const filepath = path.join(LISTS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, 'code,quantity\n');
  }
  const rows = [];
  fs.createReadStream(filepath)
    .pipe(csv())
    .on('data', row => rows.push(row))
    .on('end', () => res.json(rows));
});
// User: update list quantity
app.post('/api/list/:name/update', (req, res) => {
  const name = req.params.name;
  const { code, delta } = req.body;
  const date = new Date().toISOString().slice(0,10);
  const filename = `${name}_${date}.csv`;
  const filepath = path.join(LISTS_DIR, filename);
  const data = {};
  if (fs.existsSync(filepath)) {
    fs.createReadStream(filepath)
      .pipe(csv())
      .on('data', row => data[row.code] = parseInt(row.quantity))
      .on('end', () => {
        data[code] = (data[code] || 0) + parseInt(delta);
        const writer = createCsvWriter({
          path: filepath,
          header: [
            { id: 'code', title: 'code' },
            { id: 'quantity', title: 'quantity' }
          ]
        });
        const records = Object.entries(data).map(([c,q])=>({ code: c, quantity: q }));
        writer.writeRecords(records)
          .then(() => res.json({ success: true, data }));
      });
  } else {
    return res.status(400).json({ error: 'List not initialized' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
