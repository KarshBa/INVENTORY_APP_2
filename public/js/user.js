(async()=>{
  const codeInput = document.getElementById('codeInput');
  const searchBtn = document.getElementById('searchBtn');
  const itemRow = document.getElementById('itemRow');
  const modal = document.getElementById('newItemModal');
  const newBrand = document.getElementById('newBrand');
  const newDescription = document.getElementById('newDescription');
  const newPrice = document.getElementById('newPrice');
  const saveBtn = document.getElementById('saveNewItem');
  const cancelBtn = document.getElementById('cancelNewItem');
  let pendingCode = '';

  const openModal = code => {
    pendingCode = code;
    newBrand.value = '';
    newDescription.value = '';
    newPrice.value = '';
    modal.style.display = 'flex';
  };
  const closeModal = () => modal.style.display = 'none';

  saveBtn.onclick = async () => {
    const brand = newBrand.value.trim();
    const description = newDescription.value.trim();
    const price = newPrice.value.trim();
    if (!brand | !description | !price) return alert('All fields are required');
    await fetch('/api/item', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ code: pendingCode, brand, description, price })
    });
    closeModal();
    alert('Item added; please search again.');
  };
  cancelBtn.onclick = closeModal;

  const applyUpdate = async delta => {
    const code = codeInput.value.trim();
    if (!code) return;
    const info = await fetch(`/api/item/${code}`).then(r=>r.json());
    if (!info.exists) {
      openModal(code);
      return;
    }
    await fetch(`/api/list/default/update`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ code, delta })
    });
  };

  searchBtn.onclick = async ()=>{
    const code = codeInput.value.trim();
    const info = await fetch(`/api/item/${code}`).then(r=>r.json());
    if (info.exists) {
      itemRow.innerHTML = `<td>${code}</td><td>${info.item.brand}</td><td>${info.item.description}</td><td>${info.item.price}</td>`;
    } else {
      alert('Item not found; please add it.');
    }
  };

  codeInput.addEventListener('keypress', e=>{ if (e.key==='Enter') searchBtn.click(); });
  document.querySelectorAll('#qtyControls button[data-delta]').forEach(btn=> btn.onclick = ()=> applyUpdate(btn.dataset.delta));
  document.getElementById('customBtn').onclick = ()=> applyUpdate(document.getElementById('customQty').value);
})();
