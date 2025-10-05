// script.js - fetch data_arsip.json (assumes file at repo root)
console.log("Script.js berhasil dimuat.");
//const DATA_PATH = 'data_arsip.json'; // jika kamu taruh di folder, ubah pathnya
let RAW = [];
const DATA_PATH = './data_arsip.json'; // file di folder yang sama dengan index.html

async function fetchData() {
  try {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.textContent = 'Memuat katalog…';

    const res = await fetch(DATA_PATH + '?v=' + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error('Tidak bisa memuat data: ' + res.status);
    RAW = await res.json();
    render();
    populateJenis();
  } catch (e) {
    const container = document.getElementById('treeContainer');
    container.innerHTML = '<p style="color:red">Gagal memuat data_arsip.json — cek repo atau path.</p>';
    console.error(e);
  }
}

function buildTree(list){
  // Convert flat list with folderPath into nested object
  const root = {};
  (list || []).forEach(item => {
    const path = (item.FolderPath || item.folderPath || item.folderpath || '').trim() || 'Uncategorized';
    const parts = path.split('/').filter(Boolean);
    let node = root;
    parts.forEach(p => {
      node[p] = node[p] || { __folders__: {}, __files__: [] };
      node = node[p].__folders__;
    });
    // go back to parent container for files array
    // we need to store files at the leaf; find leaf object
    let leaf = root;
    parts.forEach(p => { leaf = leaf[p].__folders__ ? leaf[p] : leaf[p]; });
    // simpler: traverse again to get container
    let container = root;
    parts.forEach(p => container = container[p]);
    container.__files__ = container.__files__ || [];
    container.__files__.push(item);
  });
  return root;
}

function render() {
  const container = document.getElementById('treeContainer');
  if (!container) return;

  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.remove(); // aman, tidak error meski null

  container.innerHTML = '';
  if (!RAW || RAW.length === 0) {
    container.innerHTML = '<p>Tidak ada dokumen.</p>';
    return;
  }

  const grouped = {};
  RAW.forEach(item => {
    const path = (item.FolderPath || '').trim() || '';
    (grouped[path] = grouped[path] || []).push(item);
  });

  Object.keys(grouped).sort().forEach(folderPath => {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = folderPath || '(root)';
    details.appendChild(summary);

    const ul = document.createElement('div');
    grouped[folderPath].forEach(file => {
      const d = document.createElement('div');
      d.className = 'file';
      const a = document.createElement('a');
      a.href = file['Drive URL'] || '#';
      a.target = '_blank';
      a.textContent = file['Filename (Rename)'] || file['Original Name'] || 'file';
      d.appendChild(a);
      ul.appendChild(d);
    });

    details.appendChild(ul);
    container.appendChild(details);
  });
}

function populateJenis(){
  const select = document.getElementById('filterJenis');
  const set = new Set();
  RAW.forEach(r => {
    const j = r['Jenis Dokumen'] || r.jenis || '';
    if(j) set.add(j);
  });
  // clear but keep first default
  select.innerHTML = '<option value="">Semua Jenis</option>';
  Array.from(set).sort().forEach(v => {
    const o = document.createElement('option'); o.value = v; o.textContent = v; select.appendChild(o);
  });
}

function applyFilters(){
  const q = document.getElementById('search').value.toLowerCase().trim();
  const jenis = document.getElementById('filterJenis').value;
  const filtered = RAW.filter(r => {
    const title = (r['Filename (Rename)']||r.filename||r.name||'').toString().toLowerCase();
    const path = (r.FolderPath||r.folderPath||'').toString().toLowerCase();
    const j = (r['Jenis Dokumen']||r.jenis||'').toString();
    const matchQ = !q || title.includes(q) || path.includes(q);
    const matchJ = !jenis || j === jenis;
    return matchQ && matchJ;
  });
  // temporarily override rendering by replacing RAW
  const old = RAW;
  RAW = filtered;
  render();
  RAW = old;
}

document.getElementById('search')?.addEventListener('input', () => applyFilters());
document.getElementById('filterJenis')?.addEventListener('change', () => applyFilters());
document.getElementById('refresh')?.addEventListener('click', () => fetchData());

// const res = await fetch(DATA_PATH + '?v=' + Date.now(), { cache: "no-store" });
fetchData();
