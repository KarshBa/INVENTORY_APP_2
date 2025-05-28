(async () => {
  let currentList = '';
  const listNameInput = document.getElementById('listName');
  const setListBtn    = document.getElementById('setList');
  const listSelect    = document.getElementById('listSelect');
  const codeInput     = document.getElementById('codeInput');
  const searchBtn     = document.getElementById('searchBtn');
  const itemRow       = document.getElementById('itemRow');

  // ... existing loadLists/initList/applyUpdate functions unchanged ...

  // Apply +/- delta or custom quantity to the current item
  async function applyUpdate(delta) {
    const code = codeInput.value.trim();
    if (!code || !currentList) return;
    const info = await fetch(`/api/item/${code}`).then(r => r.json());
    if (!info.exists) {
      const description = prompt('Enter description:');
      const price       = prompt('Enter price:');
      if (!description || !price) return;
      await fetch('/api/item', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ code, brand: '', description, price })
      });
      alert('Item added; please search again to confirm.');
    } else {
      await fetch(`/api/list/${currentList}/update`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ code, delta: parseFloat(delta) })
      });
    }
    // Clear & refocus for next entry
    codeInput.value = '';
    codeInput.focus();
    // Refresh displayed quantity
    searchBtn.click();
  }

  // Search / display item info + current quantity
  searchBtn.onclick = async () => {
    const code = codeInput.value.trim();
    if (!code || !currentList) return;
    const info = await fetch(`/api/item/${code}`).then(r => r.json());
    if (!info.exists) {
      alert('Item not found; use the quantity controls to add it.');
    } else {
      const rows  = await fetch(`/api/list/${currentList}`).then(r => r.json());
      const entry = rows.find(r => r.code === code) || { quantity: 0, price: info.item.price };
      itemRow.innerHTML = `
        <td>${code}</td>
        <td>${info.item.brand}</td>
        <td>${info.item.description}</td>
        <td>${info.item.price}</td>
        <td>${entry.quantity}</td>
      `;
    }
    // Clear & refocus for next entry
    codeInput.value = '';
    codeInput.focus();
  };

  // Wire up Enter key, buttons…
  codeInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchBtn.click(); });
  document.querySelectorAll('#qtyControls button[data-delta]')
    .forEach(btn => btn.onclick = () => applyUpdate(btn.dataset.delta));
  document.getElementById('customBtn').onclick = () => applyUpdate(document.getElementById('customQty').value);

  // Initial focus
  codeInput.focus();
})();
