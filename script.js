console.log("Script.js dengan ikon berhasil dimuat.");

document.addEventListener("DOMContentLoaded", () => {
  fetchData();
});

let RAW = [];
const DATA_PATH = './data_arsip.json';

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

function getFileIcon(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'pdf': return '📕';
    case 'doc':
    case 'docx': return '📘';
    case 'xls':
    case 'xlsx': return '📗';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return '🖼️';
    default: return '📄';
  }
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
    const folderIcon = document.createElement('span');
    folderIcon.textContent = '📁';
    folderIcon.style.marginRight = '6px';
    summary.prepend(folderIcon);
    summary.append(name);
    details.appendChild(summary);

    // Buka hanya untuk folder utama "Digital Arsip Perencanaan"
    if (fullPath === 'Digital Arsip Perencanaan') {
      details.setAttribute('open', '');
      folderIcon.textContent = '📂';
    }

    // toggle icon folder saat expand/collapse
    details.addEventListener('toggle', () => {
      folderIcon.textContent = details.open ? '📂' : '📁';
    });

    // render file
    if (node.__files__ && node.__files__.length > 0) {
      node.__files__.forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file';

        const displayName = file['Filename (Rename)'] || file['Original Name'] || 'file';
        const isPrivate = !file['Drive URL'] || file['Drive URL'].trim() === '';
        const icon = getFileIcon(displayName);

        const iconSpan = document.createElement('span');
        iconSpan.textContent = icon;
        iconSpan.style.marginRight = '6px';

        const nameLink = document.createElement('a');
        nameLink.textContent = displayName;
        nameLink.classList.add('doc-link');
        if (isPrivate) {
          nameLink.href = '#';
          nameLink.addEventListener('click', e => {
            e.preventDefault();
            Swal.fire({
              icon: 'info',
              title: 'Dokumen Internal',
              text: 'Hubungi admin untuk mendapatkan akses.',
              confirmButtonColor: '#3085d6'
            });
          });
        } else {
          nameLink.href = file['Drive URL'];
          nameLink.target = '_blank';
        }

        const dl = document.createElement('a');
        dl.textContent = ' [Download]';
        dl.classList.add('download-link');

        if (isPrivate) {
          dl.addEventListener('click', e => {
            e.preventDefault();
          Swal.fire({
            icon: 'info',
            title: 'Dokumen Internal',
            text: 'Hubungi admin untuk mendapatkan akses.',
            confirmButtonColor: '#3085d6'
          });
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

        fileDiv.appendChild(iconSpan);
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

// Pop-up logic
const popup = document.getElementById('feedbackPopup');
const openBtn = document.getElementById('openFeedbackBtn');
const stars = document.querySelectorAll('.star');
let selectedRating = 0;

// Buka pop-up
openBtn.onclick = () => popup.style.display = 'flex';
// Tutup pop-up
function tutupPopup() {
  popup.style.display = 'none';
}
// Efek bintang interaktif
stars.forEach(star => {
  star.addEventListener('mouseover', () => {
    stars.forEach(s => s.classList.remove('hover'));
    for (let i = 0; i < star.dataset.value; i++) stars[i].classList.add('hover');
  });
  star.addEventListener('mouseout', () => stars.forEach(s => s.classList.remove('hover')));
  star.addEventListener('click', () => {
    selectedRating = star.dataset.value;
    stars.forEach(s => s.classList.remove('selected'));
    for (let i = 0; i < selectedRating; i++) stars[i].classList.add('selected');
  });
});

// Kirim ke Google Sheet
async function kirimFeedback() {
  const nama = document.getElementById('nama').value;
  const instansi = document.getElementById('instansi').value;
  const kebutuhan = document.getElementById('kebutuhan').value;
  const keterangan = document.getElementById('keterangan').value;
  if (!nama || !instansi || !kebutuhan || selectedRating === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Data Belum Lengkap',
      text: 'Mohon lengkapi semua kolom dan pilih rating bintang.',
      confirmButtonColor: '#3085d6'
    });
    return;
  }
  await fetch("https://script.google.com/macros/s/AKfycbzF85StRcg7I1zREG32q15lbjPHEDcRR9wTbWPH_7WZSrNsGf59qefpdjTOgp1enQWq/exec", { // 🔗 Ganti URL Apps Script di sini
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      nama, 
      instansi, 
      kebutuhan, 
      keterangan, 
      rating: selectedRating 
    })
  });
  Swal.fire({
    icon: 'success',
    title: 'Terima Kasih!',
    text: 'Ulasan Anda telah dikirim ke Dinas Kesehatan Kota Baubau.',
    confirmButtonColor: '#3085d6'
  });
  tutupPopup();
}
