/**
 * RN JEWELLERS — CONFIGURATION & MOCK DATA ENGINE
 */

const CONFIG = {
  // Replace this with your Google Apps Script Web App URL after deployment
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyatzPmfltEnvYxrmZSorPQWsYm7te9zSei7Tq-29EML4_AonISJFKQV-Ft6kZ9BgXY/exec",
  
  // OneSignal App ID for Push Notifications (Optional)
  ONESIGNAL_APP_ID: "91a28970-9e1b-4343-a379-de2a1923e7a7",

  // Shop Core Details
  SHOP: {
    name: "RN Jewellers",
    tagline: "Timeless Elegance & Certified Purity",
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

  // Pre-loaded Sample Products (Empty when Google Apps Script backend is connected)
  SAMPLE_PRODUCTS: []
};
