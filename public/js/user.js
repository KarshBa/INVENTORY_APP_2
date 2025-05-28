(async () => {
  let currentList = '';
  const listNameInput = document.getElementById('listName');
  const setListBtn    = document.getElementById('setList');
  const listSelect    = document.getElementById('listSelect');
  const codeInput     = document.getElementById('codeInput');
  const searchBtn     = document.getElementById('searchBtn');
  const itemRow       = document.getElementById('itemRow');

  // Load existing lists into dropdown
  async function loadLists() {
    const res   = await fetch('/api/admin/lists');
    const files = await res.json();
    const names = [...new Set(files.map(f => f.name.split('_')[0]))];
    listSelect.innerHTML = names
      .map(n => `<option value="${n}">${n}</option>`)
      .join('');
  }
  await loadLists();

  // Initialize (or create) the named list on the server
  async function initList(name) {
    currentList = name;
    await fetch(`/api/list/${name}`);
  }

  // Set list via the text input + button
  setListBtn.onclick = async () => {
    const name = listNameInput.value.trim();
    if (!name) return;
    await initList(name);
    await loadLists();
    listSelect.value = name;
    alert(`Current list: ${name}`);
  };

  // Switch list via dropdown
  listSelect.onchange = async () => {
    const name = listSelect.value;
    await initList(name);
  };

  // Apply +/- delta or custom quantity to the current item
  async function applyUpdate(delta) {
    const code = codeInput.value.trim();
    if (!code || !currentList) return;

    // Check if item exists
    const info = await fetch(`/api/item/${code}`).then(r => r.json());
    if (!info.exists) {
      // Prompt only twice: desc & price
      const description = prompt('Enter description:');
      const price       = prompt('Enter price:');
      if (!description || !price) return;
      await fetch('/api/item', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code, brand: '', description, price })
      });
      return alert('Item added; please search again to confirm.');
    }

    // Send update (delta parsed as float)
    await fetch(`/api/list/${currentList}/update`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code, delta: parseFloat(delta) })
    });

    // Immediately refresh the displayed quantity
    searchBtn.click();
  }

  // Search / display item info + current quantity
  searchBtn.onclick = async () => {
    const code = codeInput.value.trim();
    if (!code || !currentList) return;

    const info = await fetch(`/api/item/${code}`).then(r => r.json());
    if (!info.exists) {
      return alert('Item not found; use the quantity controls to add it.');
    }

    // Fetch current list and find this code
    const rows  = await fetch(`/api/list/${currentList}`).then(r => r.json());
    const entry = rows.find(r => r.code === code) || { quantity: 0, price: info.item.price };

    itemRow.innerHTML = `
      <td>${code}</td>
      <td>${info.item.brand}</td>
      <td>${info.item.description}</td>
      <td>${info.item.price}</td>
      <td>${entry.quantity}</td>
    `;
  };

  // Enter key triggers search
  codeInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') searchBtn.click();
  });

  // Wire up the +/– buttons
  document.querySelectorAll('#qtyControls button[data-delta]')
    .forEach(btn => btn.onclick = () => applyUpdate(btn.dataset.delta));

  // Custom quantity
  document.getElementById('customQty').setAttribute('step', 'any');
  document.getElementById('customBtn').onclick = () =>
    applyUpdate(document.getElementById('customQty').value);

})();
