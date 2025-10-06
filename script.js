// script.js - fetch data_arsip.json (assumes file at repo root)
console.log("Script.js berhasil dimuat.");

// Jalankan fetchData() hanya setelah seluruh HTML siap
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM siap, memulai fetch data...");
  fetchData();
});

let RAW = [];
const DATA_PATH = './data_arsip.json'; // file di folder yang sama dengan index.html

async function fetchData() {
  try {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.textContent = 'Memuat katalog…';

    const res = await fetch(DATA_PATH + '?v=' + new Date().getTime(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Tidak bisa memuat data: ' + res.status);
    RAW = await res.json();

    populateJenis();
    renderTreeView(RAW);

  } catch (e) {
    const container = document.getElementById('treeContainer');
    container.innerHTML = '<p style="color:red">Gagal memuat data_arsip.json — cek repo atau path.</p>';
    console.error(e);
  }
}

/* ============================================================
   🔹 1. Bangun Struktur Folder Tree dari FolderPath
   ============================================================ */
function buildFolderTree(data) {
  const tree = {};

  data.forEach(file => {
    const pathParts = (file['FolderPath'] || '').split('/').filter(Boolean);
    let current = tree;

    pathParts.forEach((part, index) => {
      if (!current[part]) current[part] = { __files: [] };
      if (index === pathParts.length - 1) {
        current[part].__files.push(file);
      }
      current = current[part];
    });
  });

  return tree;
}

/* ============================================================
   🔹 2. Render Pohon Folder ke HTML (Tree View)
   ============================================================ */
function renderTree(tree, container) {
  Object.keys(tree).forEach(key => {
    if (key === '__files') return;

    const folderEl = document.createElement('details');
    const title = document.createElement('summary');
    title.textContent = '📁 ' + key;
    folderEl.appendChild(title);

    const content = document.createElement('div');
    content.classList.add('folder-content');

    // render subfolder
    renderTree(tree[key], content);

    // render file di folder ini
    const files = tree[key].__files || [];
    files.forEach(file => {
      const fileEl = document.createElement('div');
      fileEl.classList.add('file-item');

      const displayName = file['Filename (Rename)'] || file['Original Name'] || 'file';
      const isPrivate = !file['Drive URL'] || file['Drive URL'].trim() === '';

      // link view dokumen
      const nameLink = document.createElement('a');
      nameLink.textContent = displayName;
      if (isPrivate) {
        nameLink.href = '#';
        nameLink.addEventListener('click', e => {
          e.preventDefault();
          alert("🔒 Dokumen Internal, Hubungi Admin!");
        });
      } else {
        nameLink.href = file['Drive URL'];
        nameLink.target = '_blank';
      }

      // tombol download
      const dl = document.createElement('a');
      dl.textContent = ' [Download]';
      dl.style.color = '#d93025';
      dl.style.marginLeft = '8px';

      if (isPrivate) {
        dl.addEventListener('click', e => {
          e.preventDefault();
          alert("🔒 Dokumen Internal, Hubungi Admin!");
        });
      } else {
        const match = file['Drive URL'].match(/\/d\/([a-zA-Z0-9_-]+)\//);
        if (match && match[1]) {
          const fileId = match[1];
          dl.href = `https://drive.usercontent.google.com/u/0/uc?id=${fileId}&export=download`;
          dl.setAttribute('download', displayName);
          dl.target = '_blank';
        } else {
          dl.href = file['Drive URL'];
          dl.target = '_blank';
        }
      }

      fileEl.appendChild(nameLink);
      fileEl.appendChild(dl);
      content.appendChild(fileEl);
    });

    folderEl.appendChild(content);
    container.appendChild(folderEl);
  });
}

/* ============================================================
   🔹 3. Render Pohon Secara Utuh
   ============================================================ */
function renderTreeView(data) {
  const container = document.getElementById('treeContainer');
  if (!container) return;

  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.remove();

  container.innerHTML = '';
  if (!data || data.length === 0) {
    container.innerHTML = '<p>Tidak ada dokumen.</p>';
    return;
  }

  const tree = buildFolderTree(data);
  renderTree(tree, container);
}

/* ============================================================
   🔹 4. Filter Jenis Dokumen dan Pencarian
   ============================================================ */
function populateJenis() {
  const select = document.getElementById('filterJenis');
  const set = new Set();
  RAW.forEach(r => {
    const j = r['Jenis Dokumen'] || '';
    if (j) set.add(j);
  });

  select.innerHTML = '<option value="">Semua Jenis</option>';
  Array.from(set).sort().forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  });
}

function applyFilters() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  const jenis = document.getElementById('filterJenis').value;
  const filtered = RAW.filter(r => {
    const title = (r['Filename (Rename)'] || '').toLowerCase();
    const path = (r.FolderPath || '').toLowerCase();
    const j = (r['Jenis Dokumen'] || '').toString();
    const matchQ = !q || title.includes(q) || path.includes(q);
    const matchJ = !jenis || j === jenis;
    return matchQ && matchJ;
  });
  renderTreeView(filtered);
}

/* ============================================================
   🔹 5. Event Listener
   ============================================================ */
document.getElementById('search')?.addEventListener('input', () => applyFilters());
document.getElementById('filterJenis')?.addEventListener('change', () => applyFilters());
document.getElementById('refresh')?.addEventListener('click', () => fetchData());
