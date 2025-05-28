(async()=>{
  const codeInput = document.getElementById('codeInput');
  const searchBtn = document.getElementById('searchBtn');
  const itemRow = document.getElementById('itemRow');

  const applyUpdate = async delta => {
    const code = codeInput.value.trim();
    if (!code) return;
    const info = await fetch(`/api/item/${code}`).then(r=>r.json());
    if (!info.exists) {
      const description = prompt('Enter description for new item:');
      const price = prompt('Enter price for new item:');
      if (!description || !price) return alert('Description and price are required');
      await fetch('/api/item', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ code, brand: '', description, price })
      });
      return alert('Item added; please search again.');
    }
    await fetch(`/api/list/default/update`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ code, delta })
    });
  };

  searchBtn.onclick = async () => {
    const code = codeInput.value.trim();
    const info = await fetch(`/api/item/${code}`).then(r=>r.json());
    if (info.exists) {
      itemRow.innerHTML = `<td>${code}</td><td>${info.item.brand}</td><td>${info.item.description}</td><td>${info.item.price}</td>`;
    } else {
      alert('Item not found; you can add it by using quantity controls.');
    }
  };

  codeInput.addEventListener('keypress', e => { if (e.key==='Enter') searchBtn.click(); });
  document.querySelectorAll('#qtyControls button[data-delta]').forEach(btn => btn.onclick = () => applyUpdate(btn.dataset.delta));
  document.getElementById('customBtn').onclick = () => applyUpdate(document.getElementById('customQty').value);
})();
