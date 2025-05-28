(async()=>{
  let currentList = '';
  const listNameInput = document.getElementById('listName');
  const setListBtn = document.getElementById('setList');
  const listSelect = document.getElementById('listSelect');
  const codeInput = document.getElementById('codeInput');
  const searchBtn = document.getElementById('searchBtn');
  const itemRow = document.getElementById('itemRow');

  // Load existing lists into dropdown
  const loadLists = async ()=>{
    const res = await fetch('/api/admin/lists');
    const files = await res.json();
    const names = [...new Set(files.map(f=>f.name.split('_')[0]))];
    listSelect.innerHTML = names.map(n=>`<option value="${n}">${n}</option>`).join('');
  };
  await loadLists();

  const initList = async (name)=>{
    currentList = name;
    await fetch(`/api/list/${name}`);
  };

  setListBtn.onclick = async ()=>{
    const name = listNameInput.value.trim();
    if(!name) return;
    await initList(name);
    await loadLists();
    listSelect.value = name;
    alert(`Current list: ${name}`);
  };

  listSelect.onchange = async ()=>{
    currentList = listSelect.value;
    await initList(currentList);
  };

  const applyUpdate = async delta => {
    const code = codeInput.value.trim(); if(!code||!currentList) return;
    const info = await fetch(`/api/item/${code}`).then(r=>r.json());
    if(!info.exists){
      const description = prompt('Enter description:');
      const price = prompt('Enter price:');
      if(!description||!price) return;
      await fetch('/api/item',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,brand:'',description,price})});
      return alert('Added; re-search to confirm.');
    }
    await fetch(`/api/list/${currentList}/update`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,delta})});
  };

  searchBtn.onclick = async ()=>{
    const code = codeInput.value.trim(); if(!code||!currentList) return;
    const info = await fetch(`/api/item/${code}`).then(r=>r.json());
    if(info.exists){
      const rows = await fetch(`/api/list/${currentList}`).then(r=>r.json());
      const entry = rows.find(r=>r.code===code)||{quantity:0};
      itemRow.innerHTML = `<td>${code}</td><td>${info.item.brand}</td><td>${info.item.description}</td><td>${info.item.price}</td><td>${entry.quantity}</td>`;
    } else alert('Not found; use controls to add.');
  };

  codeInput.addEventListener('keypress',e=>{if(e.key==='Enter')searchBtn.click();});
  document.querySelectorAll('#qtyControls button[data-delta]').forEach(b=>b.onclick=()=>applyUpdate(b.dataset.delta));
  document.getElementById('customBtn').onclick=()=>applyUpdate(document.getElementById('customQty').value);
})();
