(async () => {
  const form = document.getElementById('dbForm');
  const listEl = document.getElementById('lists');

  // Fetch and display all user lists
  async function loadLists() {
    listEl.innerHTML = '';
    try {
      const response = await fetch('/api/admin/lists');
      const lists = await response.json();
      if (!lists.length) {
        listEl.innerHTML = '<li>No lists available</li>';
      } else {
        lists.forEach(({ name }) => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = `/api/admin/lists/${name}`;
          a.textContent = name;
          li.appendChild(a);
          listEl.appendChild(li);
        });
      }
    } catch (err) {
      console.error('Error loading lists:', err);
      listEl.innerHTML = '<li>Error loading lists</li>';
    }
  }

  // Handle database upload
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      const res = await fetch('/api/admin/upload-db', { method: 'POST', body: fd });
      const result = await res.json();
      if (result.success) {
        alert('Database updated');
        await loadLists();
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading database');
    }
  });

  // Initial load
  await loadLists();
})();
