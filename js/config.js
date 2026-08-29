/**
 * RN JEWELLERS — CONFIGURATION & MOCK DATA ENGINE
 */

const CONFIG = {
  // Replace this with your Google Apps Script Web App URL after deployment
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbymlER8pohdITNx3fUTFxSw0IH4H6yR8VdA_BcZfcYajnQPP-V13HiMkv4tqjBcITAo/exec",
  
  // OneSignal App ID for Push Notifications (Optional)
  ONESIGNAL_APP_ID: "91a28970-9e1b-4343-a379-de2a1923e7a7",

  // Shop Core Details
  SHOP: {
    name: "RN Jewellers",
    tagline: "Timeless Elegance & Certified Purity Since 1985",
    phone: "+91 87088 53335",
    whatsapp: "918708853335",
    email: "contact@rnjewellers.com",
    address: "Main Market, Jewellers Hub, City, India",
    instagram: "https://instagram.com/rnjewellers",
    facebook: "https://facebook.com/rnjewellers",
    hours: "Mon - Sat: 10:30 AM - 8:30 PM (Sunday Closed)"
  },

  // Default Gold/Silver Spot Rates (in ₹ per gram)
  DEFAULT_RATES: {
    gold_22k: 7200,
    gold_24k: 7850,
    silver: 92,
    last_updated: new Date().toISOString()
  },

  // Default Product Categories with Category-Level Discounts
  CATEGORIES: [
    { id: "rings", name: "Rings", discount: 10, icon: "fa-ring" },
    { id: "men_ring", name: "Men Ring", discount: 10, icon: "fa-ring" },
    { id: "girls_ring", name: "Girls Ring", discount: 10, icon: "fa-ring" },
    { id: "necklaces", name: "Necklace", discount: 5, icon: "fa-gem" },
    { id: "earrings", name: "Earrings", discount: 15, icon: "fa-spa" },
    { id: "bangles", name: "Bangles & Kadas", discount: 0, icon: "fa-circle-notch" },
    { id: "men_kada", name: "Men Kada", discount: 0, icon: "fa-circle-notch" },
    { id: "kids_kada", name: "Kids Kada", discount: 0, icon: "fa-child" },
    { id: "payal", name: "Payal", discount: 5, icon: "fa-shoe-prints" },
    { id: "boys_bracelet", name: "Boys Bracelet", discount: 5, icon: "fa-hand-paper" },
    { id: "girls_bracelet", name: "Girls Bracelet", discount: 5, icon: "fa-heart" },
    { id: "chains", name: "Chains & Pendants", discount: 5, icon: "fa-link" },
    { id: "men_chain", name: "Men Chain", discount: 5, icon: "fa-link" },
    { id: "girls_chain", name: "Girls Chain", discount: 5, icon: "fa-link" },
    { id: "kids_chain", name: "Kids Chain", discount: 5, icon: "fa-link" },
    { id: "sets", name: "Bridal Sets", discount: 12, icon: "fa-crown" },
    { id: "silver_coins", name: "925 Silver Coins", discount: 0, icon: "fa-coins" },
    { id: "silver_items", name: "Silver Items", discount: 5, icon: "fa-box-open" }
  ],

  // Pre-loaded Sample Products for immediate visual delight
  SAMPLE_PRODUCTS: [
    {
      id: "PRD_001",
      name: "Royal Heritage 22K Gold Ruby Ring",
      category: "rings",
      metal: "gold",
      purity: "22K",
      weight_g: 8.5,
      making_charge: 2500,
      making_type: "fixed",
      description: "Intricately handcrafted 22K gold ring adorned with a certified royal ruby gemstone. Perfect for grand celebrations and traditional weddings.",
      image_urls: ["assets/images/ring_1.jpg"],
      is_featured: true,
      is_new_arrival: true,
      is_best_seller: true,
      is_limited_stock: false,
      is_sold_out: false,
      product_discount: 15
    },
    {
      id: "PRD_002",
      name: "Aurélia Grand Bridal Diamond & Gold Necklace",
      category: "necklaces",
      metal: "gold",
      purity: "22K",
      weight_g: 45.0,
      making_charge: 12000,
      making_type: "fixed",
      description: "A breathtaking bridal necklace featuring brilliant uncut diamonds set in handcrafted 22K gold. Hallmark BIS certified.",
      image_urls: ["assets/images/hero.jpg"],
      is_featured: true,
      is_new_arrival: true,
      is_best_seller: false,
      is_limited_stock: true,
      is_sold_out: false,
      product_discount: 10
    },
    {
      id: "PRD_003",
      name: "Classic Antique Floral Gold Bangles Set",
      category: "bangles",
      metal: "gold",
      purity: "22K",
      weight_g: 32.0,
      making_charge: 8000,
      making_type: "fixed",
      description: "Pair of traditional Indian temple style gold bangles with intricate nakshi work.",
      image_urls: ["assets/images/bangles_1.jpg"],
      is_featured: true,
      is_new_arrival: false,
      is_best_seller: true,
      is_limited_stock: false,
      is_sold_out: false,
      product_discount: 0
    },
    {
      id: "PRD_004",
      name: "Elegance Diamond Chandelier Earrings",
      category: "earrings",
      metal: "gold",
      purity: "18K",
      weight_g: 14.2,
      making_charge: 4500,
      making_type: "fixed",
      description: "Stunning dangling chandelier earrings encrusted with VVS clarity diamonds.",
      image_urls: ["assets/images/earrings_1.jpg"],
      is_featured: false,
      is_new_arrival: true,
      is_best_seller: true,
      is_limited_stock: false,
      is_sold_out: false,
      product_discount: 15
    }
  ]
};
