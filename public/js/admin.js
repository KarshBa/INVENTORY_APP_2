(async()=>{
  const form = document.getElementById('dbForm');
  const listEl = document.getElementById('lists');
  const loadLists = async () => {
    listEl.innerHTML = '';
    const lists = await fetch('/api/admin/lists').then(r=>r.json());
    if (!lists.length) {
      const li = document.createElement('li');
      li.textContent = 'No lists available';
      listEl.append(li);
    } else {
      lists.forEach(l=>{
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `/api/admin/lists/${l.name}`;
        link.textContent = l.name;
        li.append(link);
        listEl.append(li);
      });
    }
  };

  form.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const res = await fetch('/api/admin/upload-db',{ method:'POST', body: fd }).then(r=>r.json());
    if (res.success) {
      alert('Database updated');
      loadLists();
    }
  };

  loadLists();
})();
