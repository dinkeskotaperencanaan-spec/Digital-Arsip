// script.js - render katalog arsip dalam bentuk pohon folder
console.log("Script.js berhasil dimuat.");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM siap, memulai fetch data...");
  fetchData();
});

let RAW = [];
const DATA_PATH = './data_arsip.json'; // pastikan file berada di lokasi yang sama

async function fetchData() {
  try {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.textContent = 'Memuat katalog…';

    const res = await fetch(DATA_PATH + '?v=' + new Date().getTime(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Tidak bisa memuat data: ' + res.status);
    RAW = await res.json();
    renderTree();
    populateJenis();
  } catch (e) {
    document.getElementById('treeContainer').innerHTML =
      '<p style="color:red">Gagal memuat data_arsip.json — cek repo atau path.</p>';
    console.error(e);
  }
}

function buildTree(list) {
  const root = {};
  list.forEach(item => {
    const path = (item.FolderPath || '').trim() || 'Uncategorized';
    const parts = path.split('/').filter(Boolean);
    let node = root;
    parts.forEach((p, i) => {
      if (!node[p]) node[p] = { __folders__: {}, __files__: [] };
      if (i === parts.length - 1) node[p].__files__.push(item);
      node = node[p].__folders__;
    });
  });
  return root;
}

function renderTree() {
  const container = document.getElementById('treeContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!RAW || RAW.length === 0) {
    container.innerHTML = '<p>Tidak ada dokumen.</p>';
    return;
  }

  const tree = buildTree(RAW);
  const fragment = document.createDocumentFragment();

  function createFolderElement(name, node, fullPath) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = name;
    details.appendChild(summary);

    // buka otomatis jika berada di dalam "Digital Arsip Perencanaan"
    if (fullPath.startsWith('Digital Arsip Perencanaan')) {
      details.setAttribute('open', '');
    }

    // render file
    if (node.__files__ && node.__files__.length > 0) {
      node.__files__.forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file';

        const displayName = file['Filename (Rename)'] || file['Original Name'] || 'file';
        const isPrivate = !file['Drive URL'] || file['Drive URL'].trim() === '';

        // nama file
        const nameLink = document.createElement('a');
        nameLink.textContent = displayName;
        nameLink.style.textDecoration = 'none'; // hilangkan underline
        nameLink.style.color = '#0366d6';

        if (isPrivate) {
          nameLink.href = '#';
          nameLink.addEventListener('click', e => {
            e.preventDefault();
            alert('🔒 Dokumen Internal, Hubungi Admin!');
          });
        } else {
          nameLink.href = file['Drive URL'];
          nameLink.target = '_blank';
        }

        // tombol download
        const dl = document.createElement('a');
        dl.textContent = ' [Download]';
        dl.style.textDecoration = 'none'; // hilangkan underline
        dl.style.marginLeft = '8px';
        dl.style.color = '#d93025';
        dl.style.cursor = 'pointer';

        if (isPrivate) {
          dl.addEventListener('click', e => {
            e.preventDefault();
            alert('🔒 Dokumen Internal, Hubungi Admin!');
          });
        } else {
          const match = file['Drive URL'].match(/\/d\/([a-zA-Z0-9_-]+)\//);
          if (match && match[1]) {
            const fileId = match[1];
            const downloadUrl = `https://drive.usercontent.google.com/u/0/uc?id=${fileId}&export=download`;
            dl.href = downloadUrl;
            dl.setAttribute('download', displayName);
          } else {
            dl.href = file['Drive URL'];
          }
          dl.target = '_blank';
        }

        fileDiv.appendChild(nameLink);
        fileDiv.appendChild(dl);
        details.appendChild(fileDiv);
      });
    }

    // render subfolder
    Object.entries(node.__folders__).forEach(([subName, subNode]) => {
      const subFolder = createFolderElement(subName, subNode, `${fullPath}/${subName}`);
      details.appendChild(subFolder);
    });

    return details;
  }

  Object.entries(tree).forEach(([folderName, node]) => {
    const folderEl = createFolderElement(folderName, node, folderName);
    fragment.appendChild(folderEl);
  });

  container.appendChild(fragment);
}

function populateJenis() {
  const select = document.getElementById('filterJenis');
  const set = new Set();
  RAW.forEach(r => {
    const j = r['Jenis Dokumen'] || '';
    if (j) set.add(j);
  });
  select.innerHTML = '<option value="">Semua Jenis</option>';
  Array.from(set)
    .sort()
    .forEach(v => {
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
    const j = (r['Jenis Dokumen'] || '').toLowerCase();
    const matchQ = !q || title.includes(q) || path.includes(q);
    const matchJ = !jenis || j === jenis.toLowerCase();
    return matchQ && matchJ;
  });
  const old = RAW;
  RAW = filtered;
  renderTree();
  RAW = old;
}

document.getElementById('search')?.addEventListener('input', () => applyFilters());
document.getElementById('filterJenis')?.addEventListener('change', () => applyFilters());
document.getElementById('refresh')?.addEventListener('click', () => fetchData());
