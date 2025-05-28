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

// Load item DB
let itemDB = {};
const loadItemDB = () => {
  itemDB = {};
  if (fs.existsSync(ITEM_DB)) {
    fs.createReadStream(ITEM_DB)
      .pipe(csv())
      .on('data', row => {
        const code = row['Main Code'] || row.code;
        if (!code) return;
        itemDB[code] = {
          brand: row['Main Brand'] || row.brand,
          description: row['Main Item Description'] || row.description,
          price: parseFloat(row['Regular Price'] || row.price)
        };
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
  return res.json(itemDB[code] ? { exists: true, item: itemDB[code] } : { exists: false });
});
app.post('/api/item', (req, res) => {
  const { code, brand, description, price } = req.body;
  itemDB[code] = { brand, description, price: parseFloat(price) };
  const headerExists = fs.existsSync(ITEM_DB);
  const writer = createCsvWriter({ path: ITEM_DB, header: [
    { id: 'code', title: 'code' },
    { id: 'brand', title: 'brand' },
    { id: 'description', title: 'description' },
    { id: 'price', title: 'price' }
  ], append: headerExists });
  writer.writeRecords([{ code, brand, description, price }])
    .then(() => { loadItemDB(); res.json({ success: true }); });
});
app.get('/api/list/:name', (req, res) => {
  const name = req.params.name;
  const date = new Date().toISOString().slice(0,10);
  const fn = `${name}_${date}.csv`;
  const fp = path.join(LISTS_DIR, fn);
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, 'code,quantity\n');
  const rows = [];
  fs.createReadStream(fp).pipe(csv())
    .on('data', r => rows.push(r))
    .on('end', () => res.json(rows));
});
app.post('/api/list/:name/update', (req, res) => {
  const { name } = req.params;
  const { code, delta } = req.body;
  const date = new Date().toISOString().slice(0,10);
  const fn = `${name}_${date}.csv`;
  const fp = path.join(LISTS_DIR, fn);
  const data = {};
  if (fs.existsSync(fp)) {
    fs.createReadStream(fp).pipe(csv())
      .on('data', r => data[r.code] = parseInt(r.quantity))
      .on('end', () => {
        data[code] = (data[code]||0)+parseInt(delta);
        const writer = createCsvWriter({ path: fp, header: [
          { id: 'code', title: 'code' },
          { id: 'quantity', title: 'quantity' }
        ]});
        writer.writeRecords(Object.entries(data).map(([c,q])=>({code:c,quantity:q})))
          .then(() => res.json({ success: true, data }));
      });
  } else res.status(400).json({ error: 'List not initialized' });
});
app.listen(PORT, () => console.log(`Server on ${PORT}`));
