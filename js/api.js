/**
 * RN JEWELLERS — DATA API & PRICING ENGINE
 */

const API = {
  // Get Current Rates (from LocalStorage or Config or Apps Script)
  getRates() {
    const stored = localStorage.getItem('rnj_rates');
    if (stored) {
      return JSON.parse(stored);
    }
    return CONFIG.DEFAULT_RATES;
  },

  // Save/Update Rates — push to Google Sheets via query params (no CORS preflight)
  setRates(rates) {
    const updated = {
      ...this.getRates(),
      ...rates,
      last_updated: new Date().toISOString()
    };
    localStorage.setItem('rnj_rates', JSON.stringify(updated));

    // Push to Google Sheets using GET query params to avoid CORS preflight
    if (CONFIG.APPS_SCRIPT_URL) {
      const params = new URLSearchParams({
        action: 'updateSettings',
        'data[gold_22k_rate]': updated.gold_22k,
        'data[gold_24k_rate]': updated.gold_24k,
        'data[silver_rate]': updated.silver,
        'data[show_gold_22k]': (updated.show_gold_22k !== false && updated.show_gold_22k !== '0') ? '1' : '0',
        'data[show_gold_24k]': (updated.show_gold_24k !== false && updated.show_gold_24k !== '0') ? '1' : '0',
        'data[show_silver]': (updated.show_silver !== false && updated.show_silver !== '0') ? '1' : '0',
        'data[last_rate_update]': updated.last_updated
      });
      fetch(`${CONFIG.APPS_SCRIPT_URL}?${params.toString()}`)
        .then(r => r.json())
        .then(r => console.log('Rates saved to Sheets:', r.message))
        .catch(err => console.log('Rate sync error:', err));
    }

    return updated;
  },

  // Sync Products & Rates from Apps Script Backend (Google Sheets)
  async syncWithServer() {
    if (!CONFIG.APPS_SCRIPT_URL) return;

    try {
      const prodPromise = fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getProducts&_t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(prodJson => {
          if (prodJson.status === 'success' && Array.isArray(prodJson.data)) {
            const cleanProducts = prodJson.data.map(p => {
              let imgs = [];
              if (typeof p.image_urls === 'string' && p.image_urls.trim() !== '') {
                imgs = p.image_urls.split(',');
              } else if (Array.isArray(p.image_urls)) {
                imgs = p.image_urls.filter(Boolean);
              }
              if (imgs.length === 0) imgs = ['assets/images/ring_1.jpg'];
              return {
                ...p,
                weight_g: parseFloat(p.weight_g) || 0,
                making_charge: parseFloat(p.making_charge) || 0,
                product_discount: parseFloat(p.product_discount) || 0,
                image_urls: imgs,
                is_featured: p.is_featured === true || String(p.is_featured).toLowerCase() === 'true' || p.is_featured === 1 || p.is_featured === '1',
                is_new_arrival: p.is_new_arrival === true || String(p.is_new_arrival).toLowerCase() === 'true' || p.is_new_arrival === 1 || p.is_new_arrival === '1',
                is_no_making_charge: p.is_no_making_charge === true || String(p.is_no_making_charge).toLowerCase() === 'true'
              };
            });
            localStorage.setItem('rnj_products', JSON.stringify(cleanProducts));
          }
        }).catch(e => console.log('Products sync error:', e));

      const setPromise = fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getSettings&_t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(setJson => {
          if (setJson.status === 'success' && setJson.data && setJson.data.gold_22k_rate) {
            const currentRates = this.getRates();
            const parseBool = (val, defaultVal) => {
              if (val === undefined || val === null || val === '') return defaultVal;
              return val !== '0' && val !== 0 && val !== false && val !== 'false';
            };
            const rates = {
              gold_22k: parseFloat(setJson.data.gold_22k_rate) || currentRates.gold_22k,
              gold_24k: parseFloat(setJson.data.gold_24k_rate) || currentRates.gold_24k,
              silver: parseFloat(setJson.data.silver_rate) || currentRates.silver,
              show_gold_22k: parseBool(setJson.data.show_gold_22k, currentRates.show_gold_22k !== false),
              show_gold_24k: parseBool(setJson.data.show_gold_24k, currentRates.show_gold_24k !== false),
              show_silver: parseBool(setJson.data.show_silver, currentRates.show_silver !== false),
              last_updated: setJson.data.last_rate_update || new Date().toISOString()
            };
            localStorage.setItem('rnj_rates', JSON.stringify(rates));
          }
        }).catch(e => console.log('Settings sync error:', e));

      const enqPromise = fetch(`${CONFIG.APPS_SCRIPT_URL}?action=exportEnquiries&_t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(json => {
          if (json.status === 'success' && Array.isArray(json.data)) {
            localStorage.setItem('rnj_submitEnquiry', JSON.stringify(json.data));
          }
        }).catch(() => {});

      const aptPromise = fetch(`${CONFIG.APPS_SCRIPT_URL}?action=exportAppointments&_t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(json => {
          if (json.status === 'success' && Array.isArray(json.data)) {
            localStorage.setItem('rnj_submitAppointment', JSON.stringify(json.data));
          }
        }).catch(() => {});

      const customOrderPromise = fetch(`${CONFIG.APPS_SCRIPT_URL}?action=exportCustomOrders&_t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(json => {
          if (json.status === 'success' && Array.isArray(json.data)) {
            localStorage.setItem('rnj_submitCustomOrder', JSON.stringify(json.data));
          }
        }).catch(() => {});

      await Promise.all([prodPromise, setPromise, enqPromise, aptPromise, customOrderPromise]);
    } catch (err) {
      console.log('Server sync error:', err);
    }
  },

  // Smart Timestamp-based Sync (Checks if server timestamp is newer before pulling full catalog)
  async checkAndSyncServer() {
    if (!CONFIG.APPS_SCRIPT_URL) return false;

    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getSettings&_t=${Date.now()}`, { cache: 'no-store' });
      const setJson = await res.json();

      if (setJson.status === 'success' && setJson.data) {
        const serverLastUpdated = setJson.data.last_rate_update || setJson.data.last_updated || '';
        const currentRates = this.getRates();
        const clientLastUpdated = currentRates.last_updated || '';

        const newRates = {
          gold_22k: parseFloat(setJson.data.gold_22k_rate) || currentRates.gold_22k,
          gold_24k: parseFloat(setJson.data.gold_24k_rate) || currentRates.gold_24k,
          silver: parseFloat(setJson.data.silver_rate) || currentRates.silver,
          last_updated: serverLastUpdated || new Date().toISOString()
        };

        const hasProductCache = localStorage.getItem('rnj_products') !== null;

        if (!hasProductCache || !clientLastUpdated || serverLastUpdated !== clientLastUpdated) {
          localStorage.setItem('rnj_rates', JSON.stringify(newRates));
          await this.syncWithServer();
          return true; // Data updated
        }
      }
    } catch (err) {
      console.log('Smart sync check error:', err);
    }
    return false;
  },

  // Get All Products (from LocalStorage or Sample Products)
  getProducts() {
    const stored = localStorage.getItem('rnj_products');
    let products = [];
    if (stored !== null) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          products = parsed;
        }
      } catch(e) {
        products = CONFIG.SAMPLE_PRODUCTS;
      }
    } else {
      products = CONFIG.SAMPLE_PRODUCTS;
      localStorage.setItem('rnj_products', JSON.stringify(products));
    }
    
    const rates = this.getRates();
    
    // Calculate live dynamic prices for each product & sanitize image URLs
    return products.map(p => {
      let sanitizedImgs = (p.image_urls || []).map(img => {
        if (typeof img === 'string') {
          return img.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
        }
        return img;
      });
      if (sanitizedImgs.length === 0 || !sanitizedImgs[0]) {
        sanitizedImgs = ['assets/images/ring_1.jpg'];
      }
      return this.calculateProductPrice({ ...p, image_urls: sanitizedImgs }, rates);
    });
  },

  // Single Product by ID
  getProductById(id) {
    const products = this.getProducts();
    return products.find(p => p.id === id) || products[0];
  },

  // Dynamic Jewellery Pricing Formula:
  // Final Price = (Weight × Rate) + Making Charge - Discount
  calculateProductPrice(product, rates = this.getRates()) {
    const isSilver = String(product.metal).toLowerCase() === 'silver';
    let metalRate = rates.gold_22k;
    let metalName = 'Gold';
    let purityText = product.purity || '22K Gold';

    if (isSilver) {
      metalName = 'Silver';
      const purityUpper = String(product.purity || '').toUpperCase();
      if (purityUpper.includes('925') || purityUpper.includes('STERLING') || purityUpper.includes('92.5')) {
        metalRate = rates.silver * 0.925;
        purityText = '925 Sterling Silver';
      } else if (purityUpper.includes('999') || purityUpper.includes('FINE') || purityUpper.includes('PURE')) {
        metalRate = rates.silver;
        purityText = '999 Fine Silver';
      } else {
        metalRate = rates.silver;
        purityText = product.purity ? `${product.purity} Silver` : 'Silver';
      }
    } else {
      metalName = 'Gold';
      const purityUpper = String(product.purity || '').toUpperCase();
      if (purityUpper.includes('24K')) {
        metalRate = rates.gold_24k || (rates.gold_22k * 1.09);
        purityText = '24K Gold';
      } else if (purityUpper.includes('18K')) {
        metalRate = rates.gold_24k ? (rates.gold_24k * (18 / 24)) : (rates.gold_22k * (18 / 22));
        purityText = '18K Gold';
      } else if (purityUpper.includes('14K')) {
        metalRate = rates.gold_24k ? (rates.gold_24k * (14 / 24)) : (rates.gold_22k * (14 / 22));
        purityText = '14K Gold';
      } else {
        metalRate = rates.gold_22k;
        purityText = '22K Gold';
      }
    }

    const weight = parseFloat(product.weight_g) || 0;
    const rawMetalCost = weight * metalRate;

    // Making charge calculation — supports per_gram / per_10g / per_100g slab / fixed ₹
    const makingType = product.making_type || 'percentage';
    const makingBasis = product.making_basis || 'per_gram';
    const makingVal = parseFloat(product.making_charge) || 0;
    const explicitNoMaking = product.is_no_making_charge === true || String(product.is_no_making_charge).toLowerCase() === 'true';
    const isFreeMaking = explicitNoMaking || (makingVal === 0 && (product.making_charge === 0 || product.making_charge === '0'));

    let makingAmount = 0;
    let makingText = '0%';

    if (isFreeMaking) {
      makingAmount = 0;
      makingText = '0% (FREE)';
    } else if (makingType === 'fixed') {
      makingAmount = makingVal;
      makingText = `₹${makingVal.toLocaleString('en-IN')} (flat)`;
    } else {
      let effectiveWeight = weight;
      if (makingBasis === 'per_10g') {
        effectiveWeight = Math.floor(weight / 10) * 10;
      } else if (makingBasis === 'per_100g') {
        effectiveWeight = Math.floor(weight / 100) * 100;
      }
      const effectiveCost = effectiveWeight * metalRate;
      makingAmount = (effectiveCost * makingVal) / 100;
      const basisLabel = makingBasis === 'per_10g' ? '/10g slab' : makingBasis === 'per_100g' ? '/100g slab' : '';
      makingText = `${makingVal}%${basisLabel}`;
    }

    const grossPrice = rawMetalCost + makingAmount;

    // Determine Discount % (Product override > Category discount > 0)
    let discountPct = parseFloat(product.product_discount) || 0;
    if (!discountPct) {
      const cat = CONFIG.CATEGORIES.find(c => c.id === product.category);
      if (cat) discountPct = cat.discount || 0;
    }

    const discountAmount = (grossPrice * discountPct) / 100;
    const finalPrice = Math.round(grossPrice - discountAmount);

    return {
      ...product,
      calculated: {
        is_silver: isSilver,
        metal_name: metalName,
        purity_text: purityText,
        metal_rate: Math.round(metalRate),
        raw_metal_cost: Math.round(rawMetalCost),
        making_type: makingType,
        making_basis: makingBasis,
        making_val: makingVal,
        making_amount: Math.round(makingAmount),
        making_text: makingText,
        is_free_making: isFreeMaking,
        gross_price: Math.round(grossPrice),
        discount_percent: discountPct,
        discount_amount: Math.round(discountAmount),
        final_price: finalPrice
      }
    };
  },

  // Save/Add Product (Admin)
  saveProduct(productData) {
    let products = JSON.parse(localStorage.getItem('rnj_products')) || CONFIG.SAMPLE_PRODUCTS;
    
    if (productData.id) {
      const index = products.findIndex(p => p.id === productData.id);
      if (index !== -1) {
        products[index] = { ...products[index], ...productData };
      }
    } else {
      productData.id = 'PRD_' + Date.now();
      products.unshift(productData);
    }

    localStorage.setItem('rnj_products', JSON.stringify(products));

    if (CONFIG.APPS_SCRIPT_URL) {
      const payload = encodeURIComponent(JSON.stringify(productData));
      fetch(`${CONFIG.APPS_SCRIPT_URL}?action=saveProduct&data=${payload}`).catch(e => console.log(e));
    }

    return productData;
  },

  // Delete Product (Admin)
  deleteProduct(id) {
    let products = JSON.parse(localStorage.getItem('rnj_products')) || CONFIG.SAMPLE_PRODUCTS;
    products = products.filter(p => p.id !== id);
    localStorage.setItem('rnj_products', JSON.stringify(products));

    if (CONFIG.APPS_SCRIPT_URL) {
      fetch(`${CONFIG.APPS_SCRIPT_URL}?action=deleteProduct&id=${id}`).catch(e => console.log(e));
    }
  },

  // Wishlist Storage Engine
  getWishlist() {
    return JSON.parse(localStorage.getItem('rnj_wishlist')) || [];
  },

  toggleWishlist(productId) {
    let wishlist = this.getWishlist();
    if (wishlist.includes(productId)) {
      wishlist = wishlist.filter(id => id !== productId);
    } else {
      wishlist.push(productId);
    }
    localStorage.setItem('rnj_wishlist', JSON.stringify(wishlist));
    return wishlist;
  },

  // Recently Viewed Storage Engine
  addRecentlyViewed(productId) {
    let items = JSON.parse(localStorage.getItem('rnj_recently_viewed')) || [];
    items = items.filter(id => id !== productId);
    items.unshift(productId);
    if (items.length > 8) items.pop();
    localStorage.setItem('rnj_recently_viewed', JSON.stringify(items));
  },

  getRecentlyViewed() {
    const ids = JSON.parse(localStorage.getItem('rnj_recently_viewed')) || [];
    return ids.map(id => this.getProductById(id)).filter(Boolean);
  },

  // Form Submission Helper (Enquiry, Appointment, Custom Order)
  submitForm(endpointAction, data) {
    // Store in local history
    let history = JSON.parse(localStorage.getItem('rnj_' + endpointAction)) || [];
    history.unshift({ id: 'SUB_' + Date.now(), timestamp: new Date().toISOString(), ...data });
    localStorage.setItem('rnj_' + endpointAction, JSON.stringify(history));

    if (CONFIG.APPS_SCRIPT_URL) {
      const payload = encodeURIComponent(JSON.stringify(data));
      return fetch(`${CONFIG.APPS_SCRIPT_URL}?action=${endpointAction}&data=${payload}`)
        .then(res => res.json())
        .catch(err => ({ status: 'success', local: true }));
    }

    return Promise.resolve({ status: 'success', local: true });
  }
};
