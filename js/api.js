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
      const prodPromise = fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getProducts`)
        .then(res => res.json())
        .then(prodJson => {
          if (prodJson.status === 'success' && Array.isArray(prodJson.data) && prodJson.data.length > 0) {
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
                is_featured: p.is_featured === true || p.is_featured === 'true',
                is_new_arrival: p.is_new_arrival === true || p.is_new_arrival === 'true'
              };
            });
            localStorage.setItem('rnj_products', JSON.stringify(cleanProducts));
          }
        }).catch(e => console.log('Products sync error:', e));

      const setPromise = fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getSettings`)
        .then(res => res.json())
        .then(setJson => {
          if (setJson.status === 'success' && setJson.data && setJson.data.gold_22k_rate) {
            const rates = {
              gold_22k: parseFloat(setJson.data.gold_22k_rate),
              gold_24k: parseFloat(setJson.data.gold_24k_rate),
              silver: parseFloat(setJson.data.silver_rate),
              last_updated: setJson.data.last_rate_update || new Date().toISOString()
            };
            localStorage.setItem('rnj_rates', JSON.stringify(rates));
          }
        }).catch(e => console.log('Settings sync error:', e));

      await Promise.all([prodPromise, setPromise]);
    } catch (err) {
      console.log('Server sync error:', err);
    }
  },

  // Get All Products (from LocalStorage or Sample Products)
  getProducts() {
    const stored = localStorage.getItem('rnj_products');
    let products = CONFIG.SAMPLE_PRODUCTS;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          products = parsed;
        }
      } catch(e) {}
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
    let metalRate = rates.gold_22k;
    if (product.metal === 'silver') {
      metalRate = rates.silver;
    } else if (product.purity === '24K') {
      metalRate = rates.gold_24k || (rates.gold_22k * 1.09);
    } else if (product.purity === '18K') {
      metalRate = rates.gold_24k ? (rates.gold_24k * (18 / 24)) : (rates.gold_22k * (18 / 22));
    } else if (product.purity === '14K') {
      metalRate = rates.gold_24k ? (rates.gold_24k * (14 / 24)) : (rates.gold_22k * (14 / 22));
    }

    const rawMetalCost = (parseFloat(product.weight_g) || 0) * metalRate;
    const making = parseFloat(product.making_charge) || 0;
    const grossPrice = rawMetalCost + making;

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
        metal_rate: metalRate,
        raw_metal_cost: Math.round(rawMetalCost),
        making_charge: making,
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
