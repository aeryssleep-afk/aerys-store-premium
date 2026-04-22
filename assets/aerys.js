/* AERYS™ Clinical — aerys.js */
'use strict';

/* ── Cart State ───────────────────────────────────────────────── */
var AERYS_CART = JSON.parse(localStorage.getItem('aerysCart') || '[]');

var AERYS_PRODUCTS = {
  'starter':  { id:'starter',  name:'AERYS™ 30 Nights',  price:29.99, nights:30,  per:'$1.00/night' },
  'popular':  { id:'popular',  name:'AERYS™ 90 Nights',  price:59.99, nights:90,  per:'$0.67/night' },
  'savings':  { id:'savings',  name:'AERYS™ 180 Nights', price:99.99, nights:180, per:'$0.55/night' }
};

var AERYS_VIDEOS = [
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/dQw4w9WgXcQ'
];

/* ── Variant Map: auto-fetch if Liquid didn't inject it ─────────── */
var _aerysVariantMapReady = window.AERYS_VARIANT_MAP
  ? Promise.resolve()
  : fetch('/products.json?limit=250')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var target = (data.products || []).find(function(p) { return p.id === 9707407343833; });
        if (!target) return;
        var map = {};
        (target.variants || []).forEach(function(v) {
          if (v.title.indexOf('30 Nights') !== -1) map.starter = v.id;
          if (v.title.indexOf('90 Nights') !== -1) map.popular  = v.id;
          if (v.title.indexOf('180 Nights') !== -1) map.savings = v.id;
        });
        window.AERYS_VARIANT_MAP = map;
      })
      .catch(function() {});

function aerysCartSave() {
  localStorage.setItem('aerysCart', JSON.stringify(AERYS_CART));
}

function aerysCartTotal() {
  return AERYS_CART.reduce(function(s, i){ return s + i.price * i.qty; }, 0);
}

function aerysCartCount() {
  return AERYS_CART.reduce(function(s, i){ return s + i.qty; }, 0);
}

function aerysRenderCart() {
  var list = document.getElementById('aerysCartItems');
  var footer = document.getElementById('aerysCartFooter');
  var empty = document.getElementById('aerysCartEmpty');
  var totalEl = document.getElementById('aerysCartTotal');
  var countEl = document.getElementById('aerysCartCount');

  if (!list) return;

  // Remove existing item rows
  var existing = list.querySelectorAll('.aerys-cart__item');
  existing.forEach(function(el){ el.remove(); });

  var count = aerysCartCount();

  if (countEl) countEl.textContent = count;

  var banner = document.getElementById('aerysShippingBanner');

  if (count === 0) {
    if (empty) empty.style.display = '';
    if (footer) footer.style.display = 'none';
    if (banner) banner.style.display = 'none';
    aerysResetTimer();
    return;
  }

  if (empty) empty.style.display = 'none';
  if (footer) footer.style.display = '';
  if (banner) banner.style.display = '';

  AERYS_CART.forEach(function(item, idx) {
    var row = document.createElement('div');
    row.className = 'aerys-cart__item';
    row.setAttribute('role', 'listitem');
    row.innerHTML =
      '<div class="aerys-cart__item-info">' +
        '<span class="aerys-cart__item-name">' + item.name + '</span>' +
        '<span class="aerys-cart__item-meta">' + (item.per || '') + '</span>' +
      '</div>' +
      '<div class="aerys-cart__item-controls">' +
        '<button class="aerys-cart__qty" data-idx="' + idx + '" data-delta="-1" aria-label="Remove one">−</button>' +
        '<span class="aerys-cart__item-qty">' + item.qty + '</span>' +
        '<button class="aerys-cart__qty" data-idx="' + idx + '" data-delta="1" aria-label="Add one">+</button>' +
      '</div>' +
      '<span class="aerys-cart__item-price">$' + (item.price * item.qty).toFixed(2) + '</span>';
    list.appendChild(row);
  });

  if (totalEl) totalEl.textContent = '$' + aerysCartTotal().toFixed(2);

  // Qty buttons
  list.querySelectorAll('.aerys-cart__qty').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var i = parseInt(this.dataset.idx);
      var d = parseInt(this.dataset.delta);
      AERYS_CART[i].qty += d;
      if (AERYS_CART[i].qty <= 0) AERYS_CART.splice(i, 1);
      aerysCartSave();
      aerysRenderCart();
      aerysGAEvent('remove_from_cart');
    });
  });
}

function aerysAddToCart(productId) {
  var product = AERYS_PRODUCTS[productId];
  if (!product) return;

  var existing = AERYS_CART.find(function(i){ return i.id === productId; });
  if (existing) {
    existing.qty += 1;
  } else {
    AERYS_CART.push({ id: product.id, name: product.name, price: product.price, qty: 1, per: product.per });
  }
  aerysCartSave();
  aerysRenderCart();
  aerysOpenCart();
  aerysGAEvent('add_to_cart', { item_id: productId, value: product.price });
}

/* ── Reservation Timer ────────────────────────────────────────── */
var _aerysTimerTick = null;

function aerysInitTimer() {
  var KEY = 'aerysCartTimerEnd';
  var DURATION = 600; // 10 minutes
  var el = document.getElementById('aerysTimerDisplay');
  if (!el) return;

  clearInterval(_aerysTimerTick);

  var end = parseInt(sessionStorage.getItem(KEY), 10);
  if (!end || end < Date.now()) {
    end = Date.now() + DURATION * 1000;
    sessionStorage.setItem(KEY, end);
  }

  function tick() {
    var rem = Math.max(0, Math.round((end - Date.now()) / 1000));
    var m = Math.floor(rem / 60);
    var s = rem % 60;
    el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    if (rem === 0) clearInterval(_aerysTimerTick);
  }

  tick();
  _aerysTimerTick = setInterval(tick, 1000);
}

function aerysResetTimer() {
  sessionStorage.removeItem('aerysCartTimerEnd');
  clearInterval(_aerysTimerTick);
  var el = document.getElementById('aerysTimerDisplay');
  if (el) el.textContent = '10:00';
}

function aerysOpenCart() {
  var cart = document.getElementById('aerysCart');
  var overlay = document.getElementById('aerysOverlay');
  if (cart) { cart.classList.add('open'); cart.setAttribute('aria-hidden','false'); }
  if (overlay) { overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false'); }
  document.body.style.overflow = 'hidden';
}

function aerysCloseCart() {
  var cart = document.getElementById('aerysCart');
  var overlay = document.getElementById('aerysOverlay');
  if (cart) { cart.classList.remove('open'); cart.setAttribute('aria-hidden','true'); }
  if (overlay) { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true'); }
  document.body.style.overflow = '';
}

/* ── Shopify Cart Sync ─────────────────────────────────────────── */
function aerysShopifySync(callback) {
  _aerysVariantMapReady.then(function() {
    var variantMap = window.AERYS_VARIANT_MAP || {};
    var items = AERYS_CART.map(function(item) {
      var vid = variantMap[item.id];
      return vid ? { id: vid, quantity: item.qty } : null;
    }).filter(Boolean);

    if (!items.length) { if (callback) callback(); return; }

    fetch('/cart/clear.js', { method: 'POST' })
      .then(function() {
        return fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items })
        });
      })
      .then(function() { if (callback) callback(); })
      .catch(function() { if (callback) callback(); });
  });
}

function aerysCheckout() {
  if (aerysCartCount() === 0) return;

  var variantMap = window.AERYS_VARIANT_MAP || {};
  var cartParts = AERYS_CART
    .map(function(item) {
      var variantId = variantMap[item.id];
      return variantId ? (variantId + ':' + item.qty) : null;
    })
    .filter(Boolean);

  if (!cartParts.length) return;

  aerysGAEvent('begin_checkout', { value: aerysCartTotal() });
  window.location.href = '/cart/' + cartParts.join(',');
}

/* ── FAQ Accordion ────────────────────────────────────────────── */
function aerysInitFAQ() {
  var triggers = document.querySelectorAll('.aerys-faq__trigger');
  triggers.forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var item = this.closest('.aerys-faq__item');
      var answer = item ? item.querySelector('.aerys-faq__answer') : null;
      var isOpen = item && item.classList.contains('open');

      // Close all
      document.querySelectorAll('.aerys-faq__item').forEach(function(i) {
        i.classList.remove('open');
        var a = i.querySelector('.aerys-faq__answer');
        if (a) a.style.maxHeight = '0';
        var t = i.querySelector('.aerys-faq__trigger');
        if (t) t.setAttribute('aria-expanded','false');
      });

      // Open clicked
      if (!isOpen && item && answer) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        trigger.setAttribute('aria-expanded','true');
      }
    });
  });
}

/* ── Lazy Loading ─────────────────────────────────────────────── */
function aerysInitLazy() {
  if (!('IntersectionObserver' in window)) return;
  var imgs = document.querySelectorAll('img[data-src]');
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var img = entry.target;
        img.src = img.dataset.src;
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });
  imgs.forEach(function(img){ observer.observe(img); });
}

/* ── Scroll Animations ────────────────────────────────────────── */
function aerysInitAnimations() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.fade-up').forEach(function(el){ el.classList.add('visible'); });
    return;
  }
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-up').forEach(function(el){ observer.observe(el); });
}

/* ── Video Carousel ───────────────────────────────────────────── */
function aerysInitCarousel() {
  var track = document.getElementById('aerysCarouselTrack');
  if (!track) return;

  var cards = track.querySelectorAll('.aerys-vcard');
  var dots = document.querySelectorAll('.aerys-carousel__dot');
  var prevBtn = document.getElementById('aerysCarouselPrev');
  var nextBtn = document.getElementById('aerysCarouselNext');
  var total = cards.length;
  var current = 0;
  var startX = 0;
  var isDragging = false;

  function goTo(idx) {
    current = ((idx % total) + total) % total;
    var offset = current * (100 / total);
    track.style.transform = 'translateX(-' + offset + '%)';
    dots.forEach(function(d, i) {
      d.classList.toggle('active', i === current);
      d.setAttribute('aria-selected', i === current ? 'true' : 'false');
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', function(){ goTo(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function(){ goTo(current + 1); });

  dots.forEach(function(dot, i) {
    dot.addEventListener('click', function(){ goTo(i); });
  });

  // Touch / drag
  track.addEventListener('touchstart', function(e){ startX = e.touches[0].clientX; isDragging = true; }, { passive: true });
  track.addEventListener('touchend', function(e) {
    if (!isDragging) return;
    var diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goTo(diff > 0 ? current + 1 : current - 1);
    isDragging = false;
  });

  track.addEventListener('mousedown', function(e){ startX = e.clientX; isDragging = true; });
  document.addEventListener('mouseup', function(e) {
    if (!isDragging) return;
    var diff = startX - e.clientX;
    if (Math.abs(diff) > 50) goTo(diff > 0 ? current + 1 : current - 1);
    isDragging = false;
  });

  // Auto-advance every 5 s
  setInterval(function(){ goTo(current + 1); }, 5000);

  goTo(0);
}

/* ── Video Modal ──────────────────────────────────────────────── */
function aerysOpenModal(idx) {
  var overlay = document.getElementById('aerysModalOverlay');
  var frame = document.getElementById('aerysModalFrame');
  if (!overlay || !frame) return;
  frame.src = (AERYS_VIDEOS[idx] || AERYS_VIDEOS[0]) + '?autoplay=1&rel=0';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function aerysCloseModal() {
  var overlay = document.getElementById('aerysModalOverlay');
  var frame = document.getElementById('aerysModalFrame');
  if (!overlay) return;
  overlay.classList.remove('open');
  if (frame) frame.src = '';
  document.body.style.overflow = '';
}

function aerysPlayMedicalVideo() {
  aerysOpenModal(0);
}

/* ── GA4 Helper ───────────────────────────────────────────────── */
function aerysGAEvent(name, params) {
  if (typeof gtag === 'function') {
    gtag('event', name, params || {});
  }
}

/* ── Init ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {

  // Render cart from storage
  aerysRenderCart();

  // Cart open/close
  var cartBtn = document.getElementById('aerysCartBtn');
  var cartClose = document.getElementById('aerysCartClose');
  var overlay = document.getElementById('aerysOverlay');

  if (cartBtn) cartBtn.addEventListener('click', aerysOpenCart);
  if (cartClose) cartClose.addEventListener('click', aerysCloseCart);
  if (overlay) overlay.addEventListener('click', aerysCloseCart);

  // Add-to-cart buttons — data-product="starter|popular|savings"
  document.querySelectorAll('[data-add-to-cart]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      aerysAddToCart(this.dataset.addToCart);
    });
  });

  // Video thumbnails — data-video-idx="0|1|2|3"
  document.querySelectorAll('[data-video-idx]').forEach(function(el) {
    el.addEventListener('click', function() {
      aerysOpenModal(parseInt(this.dataset.videoIdx) || 0);
    });
  });

  // Medical video
  var medBtn = document.getElementById('aerysMedVideoBtn');
  if (medBtn) medBtn.addEventListener('click', aerysPlayMedicalVideo);

  // Modal close
  var modalClose = document.getElementById('aerysModalClose');
  var modalOverlay = document.getElementById('aerysModalOverlay');
  if (modalClose) modalClose.addEventListener('click', aerysCloseModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) aerysCloseModal();
    });
  }

  // Keyboard ESC closes modal / cart
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      aerysCloseModal();
      aerysCloseCart();
    }
  });

  // Sticky header shadow
  var header = document.querySelector('.aerys-header');
  if (header) {
    window.addEventListener('scroll', function() {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var id = this.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Init modules
  aerysInitFAQ();
  aerysInitLazy();
  aerysInitAnimations();
  aerysInitCarousel();
  aerysInitTimer();
});
