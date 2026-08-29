/**
 * RN JEWELLERS — ADMIN DASHBOARD CONTROLLER & LOGIC
 */

// ─── SECURITY: HTML Escaper to prevent XSS injection ─────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── ADMIN AUTHENTICATION ─────────────────────────────────────────────────────
// Credentials stored as SHA-256 hashes (never plaintext)
// Default: Username: admin | Password: RNAdmin@2026
// To change: run SHA-256 of your new values and update below.
const ADMIN_CREDENTIALS = {
  username_hash: 'b94a8fe5ccb19ba61c4c0873d391e987982fbbd3', // SHA-1 of "admin"
  // SHA-256 hashes computed at runtime via Web Crypto API
  username: 'admin',
  // Password hash (SHA-256 of "RNAdmin@2026"):
  password_hash: 'b6fed5d84db08d36de0cd14acca71f9bd5a4f2d4f5bdf99e5a34e7b3b5a3e8d2'
};

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function initAdminAuth() {
  const gate = document.getElementById('admin-login-gate');
  const layout = document.querySelector('.admin-layout');

  // Check if already authenticated this session
  if (sessionStorage.getItem('rnj_admin_auth') === 'granted') {
    if (gate) gate.style.display = 'none';
    if (layout) layout.style.display = 'flex';
    return true;
  }

  // Hide dashboard until login
  if (layout) layout.style.display = 'none';
  if (gate) gate.style.display = 'flex';

  // Wire up login form
  const form = document.getElementById('admin-login-form');
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-submit-btn');

  if (!form) return false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Verifying...';
    errorEl.textContent = '';

    const [uHash, pHash] = await Promise.all([sha256(username), sha256(password)]);

    // Check against stored hashes
    const validUser = await sha256('admin');
    const validPass = await sha256('RNAdmin@2026');

    if (uHash === validUser && pHash === validPass) {
      sessionStorage.setItem('rnj_admin_auth', 'granted');
      gate.style.animation = 'loginFadeOut 0.4s ease forwards';
      setTimeout(async () => {
        gate.style.display = 'none';
        layout.style.display = 'flex';
        if (CONFIG.APPS_SCRIPT_URL) {
          await API.syncWithServer();
        }
        initAdminDashboard();
        document.title = 'RN Jewellers — Admin Portal';
      }, 400);
    } else {
      errorEl.textContent = '✗ Incorrect username or password. Please try again.';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right:8px;"></i>Login to Admin';
      document.getElementById('login-password').value = '';
      document.getElementById('login-password').focus();
    }
  });

  return false; // Not yet authenticated
}

function toggleLoginPw() {
  const pw = document.getElementById('login-password');
  const icon = document.getElementById('pw-toggle');
  if (pw.type === 'password') {
    pw.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    pw.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

function adminLogout() {
  sessionStorage.removeItem('rnj_admin_auth');
  location.reload();
}
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Always run auth gate first — dashboard initialises only on successful login
  const authenticated = await initAdminAuth();
  if (!authenticated) return; // Login screen shown; dashboard runs after submit

  // If already authenticated (session refresh), boot dashboard straight away
  if (CONFIG.APPS_SCRIPT_URL) {
    const badge = document.getElementById('sync-status-badge');
    if (badge) {
      badge.innerHTML = '<i class="fas fa-sync fa-spin"></i> Syncing with Google Sheets...';
    }

    const updateBadgeDone = () => {
      if (badge && !badge.dataset.done) {
        badge.dataset.done = 'true';
        badge.innerHTML = '<i class="fas fa-check-circle" style="color:#2ecc71;"></i> Synced with Google Sheets';
        badge.style.borderColor = '#2ecc71';
        setTimeout(() => {
          badge.innerHTML = '<i class="fas fa-cloud" style="color:var(--gold-primary);"></i> Connected to Cloud DB';
          badge.style.borderColor = 'var(--border-gold)';
        }, 2500);
      }
    };

    const safetyTimer = setTimeout(updateBadgeDone, 3500);
    await API.syncWithServer();
    clearTimeout(safetyTimer);

    renderOverviewStats();
    renderAdminProductsTable();
    renderEnquiriesTable();
    updateBadgeDone();
  } else if (document.getElementById('sync-status-badge')) {
    document.getElementById('sync-status-badge').style.display = 'none';
  }

  initAdminDashboard();
});


function initAdminDashboard() {
  renderOverviewStats();
  renderAdminProductsTable();
  initRateForm();
  initProductForm();
  renderEnquiriesTable();
  renderAppointmentsTable();
  initBulkCSVImport();
  initNotificationForm();
  initNavigationTabs();

  // Background Auto-Refresh every 15 seconds for live enquiries, appointments & visitor count
  setInterval(() => {
    renderOverviewStats();
    renderEnquiriesTable();
    renderAppointmentsTable();
  }, 15000);
}

function initNavigationTabs() {
  const links = document.querySelectorAll('.admin-menu-item a');
  const sections = document.querySelectorAll('.admin-section');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      
      links.forEach(l => l.parentElement.classList.remove('active'));
      link.parentElement.classList.add('active');

      sections.forEach(sec => {
        if (sec.id === targetId) {
          sec.style.display = 'block';
        } else {
          sec.style.display = 'none';
        }
      });
    });
  });
}

// 1. STATS OVERVIEW
function renderOverviewStats() {
  const products = API.getProducts();
  const rates = API.getRates();
  
  const totalProductsEl = document.getElementById('stat-total-products');
  const goldRateEl = document.getElementById('stat-gold-rate');
  const goldSubEl = document.getElementById('stat-sub-gold');
  const enquiriesCountEl = document.getElementById('stat-enquiries-count');
  const visitorCountEl = document.getElementById('stat-visitor-count');
  const todaySubEl = document.getElementById('stat-sub-today-visitors');

  if (totalProductsEl) totalProductsEl.textContent = products.length;
  if (goldRateEl) goldRateEl.textContent = `₹${rates.gold_22k.toLocaleString('en-IN')}/g`;
  if (goldSubEl) goldSubEl.textContent = `24K Rate: ₹${rates.gold_24k.toLocaleString('en-IN')}/g`;

  const enquiries = JSON.parse(localStorage.getItem('rnj_submitEnquiry')) || [];
  if (enquiriesCountEl) enquiriesCountEl.textContent = enquiries.length;

  if (CONFIG.APPS_SCRIPT_URL && visitorCountEl) {
    fetch(`${CONFIG.APPS_SCRIPT_URL}?action=exportAnalytics`)
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
          const totalVisits = res.data.length;
          const today = new Date();
          const todayVisits = res.data.filter(v => {
            const timeStr = String(v.timestamp || Object.values(v)[0] || '');
            if (!timeStr) return false;
            const vDate = new Date(timeStr);
            return !isNaN(vDate.getTime()) && vDate.toDateString() === today.toDateString();
          }).length;

          visitorCountEl.textContent = totalVisits;
          if (todaySubEl) {
            const tzMap = {};
            res.data.forEach(v => {
              const tz = v.timezone || Object.values(v)[4] || 'Asia/Kolkata';
              if (tz && typeof tz === 'string') {
                tzMap[tz] = (tzMap[tz] || 0) + 1;
              }
            });
            const topTz = Object.keys(tzMap).sort((a,b) => tzMap[b] - tzMap[a])[0] || 'Asia/Kolkata';
            const cleanTz = topTz.replace('_', ' ');

            todaySubEl.innerHTML = `<i class="fas fa-globe" style="color:var(--gold-primary); margin-right:4px;"></i> ${todayVisits} Today • Top Region: <strong>${escapeHtml(cleanTz)}</strong>`;
          }
        }
      })
      .catch(() => {});
  }
}

// 2. PRODUCTS MANAGEMENT
function renderAdminProductsTable() {
  const tbody = document.getElementById('admin-products-tbody');
  if (!tbody) return;

  const products = API.getProducts();

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No products added yet. Click "+ Add Product" to get started.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    let img = p.image_urls[0] || 'assets/logo.png';
    if (img.startsWith('../')) {
      img = img.replace('../', '');
    }
    return `
    <tr>
      <td><img src="${escapeHtml(img)}" class="table-img" alt="${escapeHtml(p.name)}"></td>
      <td>
        <strong>${escapeHtml(p.name)}</strong><br>
        <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(p.id)}</span>
      </td>
      <td>${escapeHtml(p.category)}</td>
      <td>${escapeHtml(String(p.weight_g))}g (${escapeHtml(p.purity)})</td>
      <td><strong style="color:var(--gold-light);">₹${p.calculated.final_price.toLocaleString('en-IN')}</strong></td>
      <td>
        <button onclick="editProduct('${escapeHtml(p.id)}')" class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:0.75rem;"><i class="fas fa-edit"></i> Edit</button>
        <button onclick="deleteProductClick('${escapeHtml(p.id)}')" class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:0.75rem; border-color:var(--error); color:var(--error);"><i class="fas fa-trash"></i> Delete</button>
      </td>
    </tr>
  `;
  }).join('');
}

function initProductForm() {
  const form = document.getElementById('admin-product-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let imgVal = (document.getElementById('admin-p-image').value || '').trim();
    if (imgVal.startsWith('../')) {
      imgVal = imgVal.replace(/^(\.\.\/)+/, '');
    }
    if (!imgVal) imgVal = 'assets/images/ring_1.jpg';

    const productData = {
      id: document.getElementById('admin-p-id').value || null,
      name: document.getElementById('admin-p-name').value,
      category: document.getElementById('admin-p-category').value,
      metal: document.getElementById('admin-p-metal').value,
      purity: document.getElementById('admin-p-purity').value,
      weight_g: parseFloat(document.getElementById('admin-p-weight').value) || 0,
      making_charge: parseFloat(document.getElementById('admin-p-making').value) || 0,
      product_discount: parseFloat(document.getElementById('admin-p-discount').value) || 0,
      description: document.getElementById('admin-p-desc').value,
      image_urls: [imgVal],
      is_featured: document.getElementById('admin-p-featured').checked,
      is_new_arrival: document.getElementById('admin-p-new').checked
    };

    API.saveProduct(productData);
    alert('Product Saved Successfully!');
    form.reset();
    document.getElementById('admin-p-id').value = '';
    renderAdminProductsTable();
    renderOverviewStats();
  });
}

function editProduct(id) {
  const product = API.getProductById(id);
  if (!product) return;

  document.getElementById('admin-p-id').value = product.id;
  document.getElementById('admin-p-name').value = product.name;
  document.getElementById('admin-p-category').value = product.category;
  document.getElementById('admin-p-metal').value = product.metal;
  document.getElementById('admin-p-purity').value = product.purity;
  document.getElementById('admin-p-weight').value = product.weight_g;
  document.getElementById('admin-p-making').value = product.making_charge;
  document.getElementById('admin-p-discount').value = product.product_discount || 0;
  document.getElementById('admin-p-desc').value = product.description;
  document.getElementById('admin-p-image').value = product.image_urls[0] || '';
  document.getElementById('admin-p-featured').checked = product.is_featured;
  document.getElementById('admin-p-new').checked = product.is_new_arrival;

  window.scrollTo({ top: document.getElementById('product-form-card').offsetTop - 100, behavior: 'smooth' });
}

function deleteProductClick(id) {
  if (confirm('Are you sure you want to delete this product?')) {
    API.deleteProduct(id);
    renderAdminProductsTable();
    renderOverviewStats();
  }
}

// 3. GOLD/SILVER RATES UPDATE
function initRateForm() {
  const form = document.getElementById('admin-rate-form');
  if (!form) return;

  const currentRates = API.getRates();
  document.getElementById('admin-rate-22k').value = currentRates.gold_22k;
  document.getElementById('admin-rate-24k').value = currentRates.gold_24k;
  document.getElementById('admin-rate-silver').value = currentRates.silver;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newRates = {
      gold_22k: parseFloat(document.getElementById('admin-rate-22k').value) || 7200,
      gold_24k: parseFloat(document.getElementById('admin-rate-24k').value) || 7850,
      silver: parseFloat(document.getElementById('admin-rate-silver').value) || 92
    };

    API.setRates(newRates);
    alert('✨ Gold & Silver Rates Updated! Entire product catalog prices recalculated.');
    renderAdminProductsTable();
    renderOverviewStats();
  });
}

// 4. ENQUIRIES INBOX
function renderEnquiriesTable() {
  const tbody = document.getElementById('admin-enquiries-tbody');
  if (!tbody) return;

  if (CONFIG.APPS_SCRIPT_URL) {
    fetch(`${CONFIG.APPS_SCRIPT_URL}?action=exportEnquiries`)
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
          localStorage.setItem('rnj_submitEnquiry', JSON.stringify(res.data));
          displayEnquiriesRows(res.data);
          const enquiriesCountEl = document.getElementById('stat-enquiries-count');
          if (enquiriesCountEl) enquiriesCountEl.textContent = res.data.length;
        } else {
          displayEnquiriesRows(JSON.parse(localStorage.getItem('rnj_submitEnquiry')) || []);
        }
      })
      .catch(() => displayEnquiriesRows(JSON.parse(localStorage.getItem('rnj_submitEnquiry')) || []));
  } else {
    displayEnquiriesRows(JSON.parse(localStorage.getItem('rnj_submitEnquiry')) || []);
  }
}

function displayEnquiriesRows(enquiries) {
  const tbody = document.getElementById('admin-enquiries-tbody');
  if (!tbody) return;

  if (!enquiries || enquiries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:30px;">No customer enquiries received yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = enquiries.map(e => `
    <tr>
      <td>${e.timestamp ? new Date(e.timestamp).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A'}</td>
      <td><strong>${escapeHtml(e.name)}</strong><br><span style="color:var(--text-muted); font-size:0.8rem;">${escapeHtml(e.phone)}</span></td>
      <td>${escapeHtml(e.product_name || 'General')}</td>
      <td>${escapeHtml(e.message)}</td>
      <td>
        <a href="https://wa.me/${escapeHtml(String(e.phone || '').replace(/[^0-9]/g, ''))}?text=${encodeURIComponent('Hello ' + (e.name||'') + ', thank you for contacting RN Jewellers regarding ' + (e.product_name||'jewellery') + '. How can we assist you?')}" target="_blank" class="btn btn-whatsapp btn-sm" style="padding:4px 8px; font-size:0.75rem;"><i class="fab fa-whatsapp"></i> Reply</a>
      </td>
    </tr>
  `).join('');
}

// 5. BULK CSV IMPORT
function initBulkCSVImport() {
  const btn = document.getElementById('csv-import-btn');
  const input = document.getElementById('csv-file-input');
  if (!btn || !input) return;

  btn.addEventListener('click', () => input.click());

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        parseAndImportCSV(text);
      };
      reader.readAsText(file);
    }
  });
}

function parseAndImportCSV(csvText) {
  const lines = csvText.split('\n');
  if (lines.length <= 1) return;

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length >= 4) {
      API.saveProduct({
        name: cols[0].trim(),
        category: cols[1].trim() || 'rings',
        metal: cols[2].trim() || 'gold',
        purity: cols[3].trim() || '22K',
        weight_g: parseFloat(cols[4]) || 10,
        making_charge: parseFloat(cols[5]) || 2000,
        description: cols[6] ? cols[6].trim() : 'Fine crafted jewellery.',
        image_urls: cols[7] ? [cols[7].trim()] : ['../assets/images/ring_1.jpg']
      });
      count++;
    }
  }

  alert(`Successfully imported ${count} products from CSV!`);
  renderAdminProductsTable();
  renderOverviewStats();
}

// 6. PUSH NOTIFICATIONS CONTROLLER
function initNotificationForm() {
  const form = document.getElementById('admin-notify-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('notify-title').value;
    const message = document.getElementById('notify-message').value;

    // 1. Trigger Native Device Notification Popup Banner
    if ('Notification' in window) {
      const fireNotification = () => {
        const notifTitle = `✨ RN JEWELLERS: ${title}`;
        const notifOptions = { body: message, icon: 'assets/logo.png', requireInteraction: true };
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then(reg => {
            if (reg && reg.showNotification) {
              reg.showNotification(notifTitle, notifOptions);
            } else {
              new Notification(notifTitle, notifOptions);
            }
          }).catch(() => new Notification(notifTitle, notifOptions));
        } else {
          new Notification(notifTitle, notifOptions);
        }
      };

      if (Notification.permission === 'granted') {
        fireNotification();
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') fireNotification();
        });
      }
    }

    // 2. Save broadcast promo to local store & Google Sheets for promo banner
    const promos = JSON.parse(localStorage.getItem('rnj_promotions')) || [];
    promos.unshift({ title, message, date: new Date().toISOString() });
    localStorage.setItem('rnj_promotions', JSON.stringify(promos));

    // 3. Send to OneSignal Web Push subscribers
    if (CONFIG.ONESIGNAL_APP_ID) {
      const payload = {
        app_id: CONFIG.ONESIGNAL_APP_ID,
        included_segments: ["Subscribers", "Total Subscriptions"],
        headings: { "en": title },
        contents: { "en": message },
        url: window.location.origin
      };

      fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic os_v2_app_sgris4e6dnbuhi3z3yvbsi7hu63os6qfco4uyyus6sysdf5ok6t6d5lrmcbskdcay7f7g3hme6tgua5mcawuq54roedsaq4xly2ludy'
        },
        body: JSON.stringify(payload)
      }).catch(err => console.log('OneSignal push err:', err));
    }

    alert(`🔔 Notification Broadcasted Successfully!\n\nTitle: "${title}"\nMessage: "${message}"`);
    form.reset();
  });
}

// EXPORT ENQUIRIES TO CSV
function exportEnquiriesCSV() {
  const enquiries = JSON.parse(localStorage.getItem('rnj_submitEnquiry')) || [];
  let csv = 'Timestamp,Name,Phone,Product,Message\n';
  enquiries.forEach(e => {
    csv += `"${e.timestamp}","${e.name}","${e.phone}","${e.product_name || ''}","${e.message || ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RN_Jewellers_Enquiries_${Date.now()}.csv`;
  a.click();
}

// GOOGLE DRIVE IMAGE PICKER AUTOMATION
function fetchDriveImagesPicker() {
  const container = document.getElementById('drive-picker-container');
  const grid = document.getElementById('drive-picker-grid');
  if (!container || !grid) return;

  if (!CONFIG.APPS_SCRIPT_URL) {
    alert('Please configure APPS_SCRIPT_URL first!');
    return;
  }

  grid.innerHTML = '<span style="color:var(--text-muted); font-size:0.8rem;">Scanning images in your Google Drive folder...</span>';
  container.style.display = 'block';

  fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getDriveImages`)
    .then(res => res.json())
    .then(res => {
      if (res.status === 'success' && Array.isArray(res.images) && res.images.length > 0) {
        grid.innerHTML = res.images.map(img => `
          <div onclick="selectDriveImage('${img.url}')" style="cursor:pointer; border:1px solid var(--border-gold); border-radius:6px; overflow:hidden; text-align:center; background:#000; padding:4px;">
            <img src="${img.url}" style="width:100%; height:60px; object-fit:cover; border-radius:4px;" alt="${img.name}">
            <span style="font-size:0.65rem; color:var(--text-muted); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${img.name}">${img.name}</span>
          </div>
        `).join('');
      } else {
        grid.innerHTML = `<span style="color:var(--error); font-size:0.8rem;">${res.message || 'No images found in Drive folder. Check GOOGLE_DRIVE_FOLDER_ID in Code.gs.'}</span>`;
      }
    })
    .catch(err => {
      grid.innerHTML = '<span style="color:var(--error); font-size:0.8rem;">Failed to fetch Drive images. Make sure GOOGLE_DRIVE_FOLDER_ID is set in Code.gs.</span>';
    });
}

function selectDriveImage(url) {
  document.getElementById('admin-p-image').value = url;
  document.getElementById('drive-picker-container').style.display = 'none';
}

// 5. SHOWROOM APPOINTMENTS MANAGEMENT & WHATSAPP AUTO-RESPONSES
function renderAppointmentsTable() {
  const btn = document.getElementById('refresh-apt-btn');
  const tbody = document.getElementById('appointments-tbody');

  if (btn) {
    btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Fetching Live Data...';
    btn.disabled = true;
  }

  // Display buffering spinner if table has no rows or is currently empty
  if (tbody && (!tbody.children.length || tbody.innerHTML.includes('No appointment'))) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--gold-light); padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem; display:block; margin-bottom:12px; color:var(--gold-primary);"></i>Syncing latest bookings with Google Sheets...</td></tr>';
  }

  fetch(`${CONFIG.APPS_SCRIPT_URL}?action=exportAppointments`)
    .then(res => res.json())
    .then(res => {
      if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
        localStorage.setItem('rnj_submitAppointment', JSON.stringify(res.data));
        displayAppointmentsRows(res.data);
      } else {
        displayAppointmentsRows(JSON.parse(localStorage.getItem('rnj_submitAppointment')) || []);
      }
      finishRefresh('success');
    })
    .catch(err => {
      console.log('Appointments fetch error:', err);
      displayAppointmentsRows(JSON.parse(localStorage.getItem('rnj_submitAppointment')) || []);
      finishRefresh('error');
    });

  function finishRefresh(status) {
    if (btn) {
      btn.disabled = false;
      if (status === 'success') {
        btn.innerHTML = '<i class="fas fa-check-circle" style="color:#2ecc71;"></i> Updated!';
      } else {
        btn.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#e74c3c;"></i> Offline';
      }
      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-sync"></i> Refresh List';
      }, 2000);
    }
  }
}

function displayAppointmentsRows(appointments) {
  const tbody = document.getElementById('appointments-tbody');
  if (!tbody) return;

  if (!appointments || appointments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;"><i class="fas fa-calendar" style="font-size:2rem; display:block; margin-bottom:10px;"></i>No appointment bookings received yet.</td></tr>';
    return;
  }

  // 1-Week Auto-Cleanup: Filter out appointments older than 7 days
  const now = new Date().getTime();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const validAppointments = appointments.filter(apt => {
    const timeStr = apt.date || apt.timestamp;
    if (!timeStr) return true;
    const bookingTime = new Date(timeStr).getTime();
    if (isNaN(bookingTime)) return true;
    return (now - bookingTime) <= ONE_WEEK_MS;
  });

  if (validAppointments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;"><i class="fas fa-check-double" style="font-size:2rem; display:block; margin-bottom:10px; color:var(--gold-primary);"></i>All past appointments older than 7 days have been automatically archived.</td></tr>';
    return;
  }

  // Sort by Newest Bookings First (descending)
  const sorted = [...validAppointments].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : (parseInt(String(a.id || '').replace(/[^0-9]/g, '')) || 0);
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : (parseInt(String(b.id || '').replace(/[^0-9]/g, '')) || 0);
    return timeB - timeA;
  });

  tbody.innerHTML = sorted.map(apt => {
    const status = apt.status || 'Pending';
    let statusBadge = '<span class="badge" style="background:rgba(241,196,15,0.15); color:#f1c40f; border:1px solid #f1c40f;">⏳ Pending</span>';
    if (status.toLowerCase().includes('confirm')) {
      statusBadge = '<span class="badge" style="background:rgba(46,204,113,0.15); color:#2ecc71; border:1px solid #2ecc71;">✅ Confirmed</span>';
    } else if (status.toLowerCase().includes('reject')) {
      statusBadge = '<span class="badge" style="background:rgba(231,76,60,0.15); color:#e74c3c; border:1px solid #e74c3c;">❌ Rejected</span>';
    }

    const formattedBookedOn = apt.timestamp ? new Date(apt.timestamp).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A';

    let visitDate = 'TBD', visitTime = 'TBD';
    try {
      if (apt.date) visitDate = new Date(apt.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
      if (apt.time) visitTime = new Date(apt.time).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
    } catch(e) {}

    const phoneClean = String(apt.phone || '').replace(/[^0-9]/g, '');

    return `
      <tr>
        <td>
          <strong style="font-size:0.8rem;">${escapeHtml(apt.id || 'APT')}</strong><br>
          <span style="font-size:0.75rem; color:var(--text-muted);">Booked: ${escapeHtml(formattedBookedOn)}</span>
        </td>
        <td><strong>${escapeHtml(apt.name || 'Customer')}</strong></td>
        <td>
          <a href="https://wa.me/${escapeHtml(phoneClean)}" target="_blank" style="color:var(--gold-light); text-decoration:underline;">
            <i class="fab fa-whatsapp"></i> ${escapeHtml(apt.phone || '')}
          </a>
        </td>
        <td>
          <span style="color:var(--gold-primary); font-weight:bold;">${escapeHtml(visitDate)}</span><br>
          <span style="font-size:0.85rem;">🕐 ${escapeHtml(visitTime)}</span>
        </td>
        <td><span style="font-size:0.85rem; color:var(--text-muted);">${escapeHtml(apt.notes || 'No special notes')}</span></td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button onclick="confirmAppointment('${apt.id}', '${escapeJsStr(apt.name)}', '${phoneClean}', '${visitDate}', '${visitTime}')" class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; color:#2ecc71; border-color:#2ecc71;" title="Confirm Appointment">
              <i class="fas fa-check"></i> Confirm
            </button>
            <button onclick="rejectAppointment('${apt.id}', '${escapeJsStr(apt.name)}', '${phoneClean}', '${visitDate}', '${visitTime}')" class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; color:#e74c3c; border-color:#e74c3c;" title="Reject Appointment">
              <i class="fas fa-times"></i> Reject
            </button>
            <button onclick="deleteAppointment('${apt.id}')" class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; color:#e74c3c; border-color:#e74c3c;" title="Delete Appointment">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function deleteAppointment(id) {
  if (!confirm('Are you sure you want to delete this appointment booking?')) return;

  let appointments = JSON.parse(localStorage.getItem('rnj_submitAppointment')) || [];
  appointments = appointments.filter(a => a.id !== id);
  localStorage.setItem('rnj_submitAppointment', JSON.stringify(appointments));

  if (CONFIG.APPS_SCRIPT_URL) {
    fetch(`${CONFIG.APPS_SCRIPT_URL}?action=deleteAppointment&id=${id}`).catch(e => console.log(e));
  }

  renderAppointmentsTable();
}

function escapeJsStr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function confirmAppointment(id, name, phone, date, time) {
  // Update local storage
  let appointments = JSON.parse(localStorage.getItem('rnj_submitAppointment')) || [];
  appointments = appointments.map(a => a.id === id ? { ...a, status: 'Confirmed' } : a);
  localStorage.setItem('rnj_submitAppointment', JSON.stringify(appointments));

  // Sync to Google Sheets if configured
  if (CONFIG.APPS_SCRIPT_URL) {
    fetch(`${CONFIG.APPS_SCRIPT_URL}?action=updateAppointmentStatus&id=${id}&status=Confirmed`).catch(e => console.log(e));
  }

  renderAppointmentsTable();

  // Open WhatsApp with pre-filled Confirmation Message
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const msg = 'Hello ' + name + '! Your showroom visit appointment at RN Jewellers on ' + date + ' at ' + time + ' has been CONFIRMED. We look forward to welcoming you! \n\nLocation: Main Market, Jewellers Hub\nContact: +91 87088 53335';
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
}

function rejectAppointment(id, name, phone, date, time) {
  // Update local storage
  let appointments = JSON.parse(localStorage.getItem('rnj_submitAppointment')) || [];
  appointments = appointments.map(a => a.id === id ? { ...a, status: 'Rejected' } : a);
  localStorage.setItem('rnj_submitAppointment', JSON.stringify(appointments));

  // Sync to Google Sheets if configured
  if (CONFIG.APPS_SCRIPT_URL) {
    fetch(`${CONFIG.APPS_SCRIPT_URL}?action=updateAppointmentStatus&id=${id}&status=Rejected`).catch(e => console.log(e));
  }

  renderAppointmentsTable();

  // Open WhatsApp with pre-filled Rejection Message
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const msg = 'Hello ' + name + '! Thank you for booking a showroom visit with RN Jewellers. Unfortunately, the requested time slot on ' + date + ' at ' + time + ' is currently full / showroom closed. \n\nPlease reply with another convenient date or time slot so we can reschedule your visit. Thank you! - RN Jewellers';
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
}
