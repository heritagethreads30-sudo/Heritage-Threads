function updateCartCount() {
  const total = getCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = total;
  });
}

function renderUserNav() {
  const guestNav = document.getElementById("guestNav");
  const userNav = document.getElementById("userNav");
  const welcomeName = document.getElementById("welcomeName");
  const currentUser = getCurrentUser();

  if (currentUser && currentUser.status !== "blocked") {
    if (guestNav) guestNav.classList.add("hidden");
    if (userNav) userNav.classList.remove("hidden");
    if (welcomeName) welcomeName.textContent = getDisplayName(currentUser);
  } else {
    if (userNav) userNav.classList.add("hidden");
    if (guestNav) guestNav.classList.remove("hidden");
  }

  const trigger = document.getElementById("userTrigger");
  const menu = document.getElementById("userMenu");

  if (trigger && menu) {
    trigger.onclick = function (e) {
      e.stopPropagation();
      menu.classList.toggle("show");
    };

    document.addEventListener("click", function (e) {
      if (!trigger.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove("show");
      }
    });
  }
}

function logoutUser() {
  clearCurrentUser();
  showAlert("Logged out.");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 300);
}

function waPhone() {
  const raw = String(getSettings().whatsappPhone || "09016654210").replace(/\D/g, "");
  return raw.startsWith("0") ? "234" + raw.slice(1) : raw;
}

function getProductById(id) {
  return getProducts().find((p) => String(p.id) === String(id));
}

function productCard(p) {
  const stock = stockMeta(p.stock);
  const soldOut = Number(p.stock || 0) <= 0;

  return `
    <article class="product-card">
      <div class="product-media">
        <img src="${p.image}" alt="${p.name}">
        <span class="product-tag">${p.tag || "Polo"}</span>
        <span class="stock-badge ${stock.cls}">${stock.text}</span>
      </div>
      <div class="product-body">
        <h3>${p.name}</h3>
        <p class="product-desc">${p.description || ""}</p>
        <div class="product-footer">
          <p class="price">${currency(p.price)}</p>
          <button class="btn ${soldOut ? "btn-light" : "btn-dark"}" ${soldOut ? "disabled" : ""} onclick="${soldOut ? "" : `goToProduct('${p.id}')`}">
            ${soldOut ? "Sold Out" : "Shop Now"}
          </button>
        </div>
      </div>
    </article>
  `;
}

async function renderHomeProducts(id, limit) {
  const box = document.getElementById(id);
  if (!box) return;

  if (!window.htLoaded) {
    box.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">
      <span style="display:inline-block; width:24px; height:24px; border:3px solid #ccc; border-top-color:#111; border-radius:50%; animation:spin 1s linear infinite;"></span>
      <p style="margin-top:10px">Loading latest products...</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>`;
    try { if (window.htReady) await window.htReady; } catch (e) { console.error(e); }
  }

  box.innerHTML = getProducts().slice(0, limit || 4).map(productCard).join("");
}

function goToProduct(id) {
  window.location.href = "product.html?id=" + encodeURIComponent(id);
}

async function renderShop() {
  const box = document.getElementById("shopGrid");
  if (!box) return;

  if (!window.htLoaded) {
    box.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">
      <span style="display:inline-block; width:24px; height:24px; border:3px solid #ccc; border-top-color:#111; border-radius:50%; animation:spin 1s linear infinite;"></span>
      <p style="margin-top:10px">Loading shop inventory...</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>`;
    try { if (window.htReady) await window.htReady; } catch (e) { console.error(e); }
  }

  let products = [...getProducts()];
  const q = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
  const sort = document.getElementById("sortSelect")?.value || "default";

  if (q) {
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }

  if (sort === "low") products.sort((a, b) => a.price - b.price);
  if (sort === "high") products.sort((a, b) => b.price - a.price);

  box.innerHTML = products.length
    ? products.map(productCard).join("")
    : `<div class="card" style="padding:24px"><h3>No products found.</h3></div>`;
}

function addToCartFromDetails(id) {
  const currentUser = getCurrentUser();
  const p = getProductById(id);

  if (!currentUser) {
    showAlert("Please login first.");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 600);
    return;
  }

  if (currentUser.status === "blocked") {
    showAlert("Your account has been blocked.");
    clearCurrentUser();
    setTimeout(() => {
      window.location.href = "login.html";
    }, 600);
    return;
  }

  if (!p) return;
  if (Number(p.stock || 0) <= 0) {
    showAlert("This item is sold out.");
    return;
  }

  const cart = getCart();
  const found = cart.find((i) => i.id === id);

  if (found) {
    if (found.quantity >= Number(p.stock || 0)) {
      showAlert("You have reached available stock.");
      return;
    }
    found.quantity += 1;
  } else {
    cart.push({
      id: p.id,
      name: p.name,
      image: p.image,
      price: p.price,
      quantity: 1
    });
  }

  saveCart(cart);
  updateCartCount();
  showAlert("Item added to cart.");
}

function buildSingleProductWhatsappUrl(p) {
  const msg = "Hello, I want to buy " + p.name + ". Price: " + currency(p.price) + ".";
  return "https://wa.me/" + waPhone() + "?text=" + encodeURIComponent(msg);
}

function buildCartWhatsappUrl(cart) {
  let lines = ["Hello, I want to order these items from Heritage Threads:", ""];

  cart.forEach((item, index) => {
    lines.push((index + 1) + ". " + item.name + " x" + item.quantity + " - " + currency(item.price * item.quantity));
  });

  lines.push("");
  lines.push("Total: " + currency(cart.reduce((sum, item) => sum + item.price * item.quantity, 0)));

  return "https://wa.me/" + waPhone() + "?text=" + encodeURIComponent(lines.join("\n"));
}

function openWhatsApp(url) {
  window.open(url, "_blank", "noopener");
}

async function saveSingleOrder(productId) {
  const user = getCurrentUser();
  const p = getProductById(productId);

  if (!user) {
    showAlert("Please login first.");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 600);
    return null;
  }

  if (!p) {
    showAlert("Product not found.");
    return null;
  }

  if (Number(p.stock || 0) <= 0) {
    showAlert("This item is sold out.");
    return null;
  }

  const products = getProducts();
  const product = products.find((x) => String(x.id) === String(productId));
  if (!product) return null;

  product.stock = Number(product.stock || 0) - 1;
  saveProducts(products);

  const orders = getOrders();
  const order = {
    id: generateId("order"),
    customerId: user.id,
    customerName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" "),
    customerEmail: user.email,
    customerPhone: user.phone,
    items: product.name + " x1",
    total: product.price,
    status: "Pending",
    createdAt: new Date().toLocaleString()
  };

  orders.unshift(order);
  saveOrders(orders);
  try {
    await __sheetPost("overwriteOrders", { orders: orders });
    await __sheetPost("overwriteProducts", { products: products });
  } catch (err) {
    console.error("Order sync failed:", err);
  }
  return order;
}

async function saveCartOrder() {
  const user = getCurrentUser();
  const cart = getCart();

  if (!user) {
    showAlert("Please login first.");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 600);
    return null;
  }

  if (!cart.length) {
    showAlert("Your cart is empty.");
    return null;
  }

  const products = getProducts();

  for (const line of cart) {
    const p = products.find((x) => String(x.id) === String(line.id));
    if (!p || Number(p.stock || 0) < Number(line.quantity || 0)) {
      showAlert("Some items are no longer available in that quantity.");
      return null;
    }
  }

  cart.forEach((line) => {
    const p = products.find((x) => String(x.id) === String(line.id));
    p.stock = Number(p.stock || 0) - Number(line.quantity || 0);
  });

  saveProducts(products);

  const orders = getOrders();
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = {
    id: generateId("order"),
    customerId: user.id,
    customerName: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" "),
    customerEmail: user.email,
    customerPhone: user.phone,
    items: cart.map((item) => item.name + " x" + item.quantity).join(", "),
    total: total,
    status: "Pending",
    createdAt: new Date().toLocaleString()
  };

  orders.unshift(order);
  saveOrders(orders);
  saveCart([]);
  try {
    await __sheetPost("overwriteOrders", { orders: orders });
    await __sheetPost("overwriteProducts", { products: products });
  } catch (err) {
    console.error("Order sync failed:", err);
  }
  return order;
}

async function productWhatsAppCheckout(productId) {
  const p = getProductById(productId);
  if (!p) return;

  const waWindow = window.open("about:blank", "_blank");

  const saved = await saveSingleOrder(productId);
  if (!saved) {
    if (waWindow) waWindow.close();
    return;
  }

  showAlert("Order saved. Opening WhatsApp...");
  updateCartCount();

  const waUrl = buildSingleProductWhatsappUrl(p);

  if (waWindow) {
    waWindow.location.href = waUrl;
  } else {
    window.location.href = waUrl;
  }
}

async function renderProductDetails() {
  const imageBox = document.getElementById("productImageBox");
  const detailBox = document.getElementById("productDetailBox");
  if (!imageBox || !detailBox) return;

  if (!window.htLoaded) {
    imageBox.innerHTML = `<div style="text-align: center; padding: 40px; color: #666; background: #f9f9f9; border-radius: 12px; height: 400px; display: flex; align-items: center; justify-content: center;">
      <span style="display:inline-block; width:24px; height:24px; border:3px solid #ccc; border-top-color:#111; border-radius:50%; animation:spin 1s linear infinite;"></span>
    </div>`;
    detailBox.innerHTML = `<div class="detail-card" style="padding: 40px; color: #666;">
      <p style="margin-top:10px">Loading product details...</p>
    </div>`;
    try { if (window.htReady) await window.htReady; } catch (e) { console.error(e); }
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const p = getProductById(id) || getProducts()[0];

  if (!p) {
    detailBox.innerHTML = '<div class="detail-card"><h2>Product not found.</h2></div>';
    return;
  }

  const stock = stockMeta(p.stock);
  const soldOut = Number(p.stock || 0) <= 0;

  imageBox.innerHTML = `<div class="gallery-card"><img class="main-product-image" src="${p.image}" alt="${p.name}"></div>`;
  detailBox.innerHTML = `
    <div class="detail-card">
      <div><span class="badge">${p.tag || "Polo"}</span> <span class="badge">${stock.text}</span></div>
      <h1 class="detail-title">${p.name}</h1>
      <div class="detail-price">${currency(p.price)}</div>
      <p class="detail-copy">${p.description || ""}</p>
      <div class="point-list">
        <div>Tailored smart-casual styling for daily wear.</div>
        <div>Clean finish and premium feel.</div>
        <div>Stock left: ${Number(p.stock || 0)}</div>
      </div>
      <div class="hero-actions">
        <button class="btn ${soldOut ? "btn-light" : "btn-dark"}" ${soldOut ? "disabled" : ""} onclick="${soldOut ? "" : `addToCartFromDetails('${p.id}')`}">
          ${soldOut ? "Sold Out" : "Add to Cart"}
        </button>
        <a class="btn btn-outline" href="cart.html">View Cart</a>
      </div>
      <div class="whatsapp-box">
        <h3>Buy directly on WhatsApp</h3>
        <p>${soldOut ? "This product is no longer available." : "Click the button below and chat instantly for fast purchase and delivery arrangement."}</p>
        <div class="hero-actions" style="margin-top:16px">
          <button class="btn ${soldOut ? "btn-light" : "btn-gold"}" ${soldOut ? "disabled" : ""} type="button" onclick="${soldOut ? "" : `productWhatsAppCheckout('${p.id}')`}">
            ${soldOut ? "Sold Out" : "Chat on WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  `;
}

async function renderCart() {
  const list = document.getElementById("cartList");
  if (!list) return;

  if (!window.htLoaded) {
    list.innerHTML = `<div style="text-align: center; padding: 40px; color: #666;">
      <span style="display:inline-block; width:24px; height:24px; border:3px solid #ccc; border-top-color:#111; border-radius:50%; animation:spin 1s linear infinite;"></span>
      <p style="margin-top:10px">Loading cart data...</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>`;
    try { if (window.htReady) await window.htReady; } catch (e) { console.error(e); }
  }

  const cart = getCart();

  if (!cart.length) {
    list.innerHTML = `<div class="card" style="padding:24px"><h3>Your cart is empty.</h3><p class="muted">Open the shop and choose a polo to continue.</p></div>`;
  } else {
    list.innerHTML = cart.map((item) => `
      <div class="cart-card">
        <img src="${item.image}" alt="${item.name}">
        <div>
          <h3>${item.name}</h3>
          <p class="muted">${currency(item.price)} each</p>
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
            <strong>${item.quantity}</strong>
            <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
          </div>
        </div>
        <div>
          <p class="price">${currency(item.price * item.quantity)}</p>
          <button class="btn btn-danger" onclick="removeItem('${item.id}')">Remove</button>
        </div>
      </div>
    `).join("");
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);

  document.getElementById("sumItems").textContent = totalItems;
  document.getElementById("sumAmount").textContent = currency(totalAmount);

  const waBtn = document.getElementById("cartWhatsAppBtn");
  if (waBtn) waBtn.classList.toggle("hidden", !cart.length);

  updateCartCount();
}

function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find((i) => i.id === id);
  const product = getProductById(id);
  if (!item || !product) return;

  item.quantity += delta;
  if (item.quantity > Number(product.stock || 0)) {
    item.quantity = Number(product.stock || 0);
  }

  saveCart(cart.filter((i) => i.quantity > 0));
  renderCart();
}

function removeItem(id) {
  saveCart(getCart().filter((item) => item.id !== id));
  renderCart();
}

function clearCartItems() {
  saveCart([]);
  renderCart();
  showAlert("Cart cleared.");
}

async function checkoutCartOnWhatsApp() {
  const cart = getCart();
  if (!cart.length) {
    showAlert("Your cart is empty.");
    return;
  }

  const waWindow = window.open("about:blank", "_blank");

  const saved = await saveCartOrder();
  if (!saved) {
    if (waWindow) waWindow.close();
    return;
  }

  showAlert("Order saved. Opening WhatsApp...");
  updateCartCount();

  const waUrl = buildCartWhatsappUrl(cart);

  if (waWindow) {
    waWindow.location.href = waUrl;
  } else {
    window.location.href = waUrl;
  }

  renderCart();
}

async function renderAccountPage() {
  const box = document.getElementById("accountBox");
  if (!box) return;

  if (!window.htLoaded) {
    box.innerHTML = `<div style="text-align: center; padding: 40px; color: #666;">
      <span style="display:inline-block; width:24px; height:24px; border:3px solid #ccc; border-top-color:#111; border-radius:50%; animation:spin 1s linear infinite;"></span>
      <p style="margin-top:10px">Loading account data...</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>`;
    try { if (window.htReady) await window.htReady; } catch (e) { console.error(e); }
  }

  const user = getCurrentUser();

  if (!user) {
    box.innerHTML = `<div class="auth-card"><h2 class="auth-title">Please login first.</h2><p class="muted">You need to sign in to view your account.</p><div class="hero-actions"><a class="btn btn-dark" href="login.html">Login</a></div></div>`;
    return;
  }

  box.innerHTML = `
    <div class="auth-card">
      <p class="eyebrow">My Account</p>
      <h2 class="auth-title">${getDisplayName(user)}</h2>
      <div class="form-grid two" style="margin-top:18px">
        <div><strong>First Name</strong><p class="muted">${user.firstName || ""}</p></div>
        <div><strong>Middle Name</strong><p class="muted">${user.middleName || "-"}</p></div>
        <div><strong>Last Name</strong><p class="muted">${user.lastName || ""}</p></div>
        <div><strong>Email</strong><p class="muted">${user.email || ""}</p></div>
        <div><strong>Phone</strong><p class="muted">${user.phone || "-"}</p></div>
      </div>
    </div>
  `;
}

async function renderOrdersPage() {
  const box = document.getElementById("ordersBox");
  if (!box) return;

  if (!window.htLoaded) {
    box.innerHTML = `<div style="text-align: center; padding: 40px; color: #666;">
      <span style="display:inline-block; width:24px; height:24px; border:3px solid #ccc; border-top-color:#111; border-radius:50%; animation:spin 1s linear infinite;"></span>
      <p style="margin-top:10px">Loading orders...</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>`;
    try { if (window.htReady) await window.htReady; } catch (e) { console.error(e); }
  }

  const user = getCurrentUser();

  if (!user) {
    box.innerHTML = `<div class="auth-card"><h2 class="auth-title">Please login first.</h2><p class="muted">You need to sign in to view your orders.</p><div class="hero-actions"><a class="btn btn-dark" href="login.html">Login</a></div></div>`;
    return;
  }

  let orders = getOrders().filter((o) =>
    (o.customerId && o.customerId === user.id) ||
    (o.customerEmail && String(o.customerEmail).toLowerCase() === String(user.email).toLowerCase())
  );

  try {
    const res = await __sheetGet("ordersByEmail", { email: user.email });
    if (res && res.ok && Array.isArray(res.orders)) {
      orders = res.orders.map((o) => ({
        ...o,
        items: o.items || o.itemsText || "",
        total: Number(o.total || 0)
      }));
      localStorage.setItem("ht_orders", JSON.stringify(orders));
    }
  } catch (err) {
    console.error("Could not load remote orders:", err);
  }

  box.innerHTML = `
    <div class="auth-card">
      <p class="eyebrow">My Orders</p>
      <h2 class="auth-title">Your Orders</h2>
      <div style="margin-top:20px">
        ${
          orders.length
            ? orders.map((o) => `
              <div class="about-block" style="margin-top:12px">
                <h3 class="about-title">${currency(o.total)}</h3>
                <p>${o.items || ""}</p>
                <p>${o.createdAt || ""}</p>
                <p><strong>Status:</strong> <span class="status-pill ${String(o.status).toLowerCase()}">${o.status}</span></p>
              </div>
            `).join("")
            : `<p class="muted">No orders yet.</p>`
        }
      </div>
    </div>
  `;
}

function renderContactPage() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  initEmailJS();

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const payload = {
      name: document.getElementById("contactName").value.trim(),
      email: document.getElementById("contactEmail").value.trim(),
      message: document.getElementById("contactMessage").value.trim()
    };

    const sent = await sendContactEmail(payload);
    if (!sent.ok) {
      showAlert(sent.message);
      return;
    }

    await saveMessageRemote(payload);
    form.reset();
    showAlert("Message sent successfully.");
  });
}

function bootStorePage() {
  applyStoreBrand();
  updateCartCount();
  renderUserNav();
  initEmailJS();
}

if (window.htReady) {
  window.htReady.then(() => {
    updateCartCount();
    renderUserNav();
  }).catch(e => console.error(e));
}
