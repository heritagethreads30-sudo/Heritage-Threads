(function seedData(){
 const defaultProducts=[
  {id:"p1",name:"Classic White Polo",price:28000,image:"https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",tag:"Best Seller",description:"Fresh clean white polo made for a smart and polished everyday look.",stock:12},
  {id:"p2",name:"Midnight Black Polo",price:30000,image:"https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1000&q=80",tag:"New Drop",description:"A rich black polo with premium finish and elegant style.",stock:4},
  {id:"p3",name:"Navy Signature Polo",price:32000,image:"https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1000&q=80",tag:"Premium",description:"Deep navy polo crafted for confident modern dressing.",stock:0},
  {id:"p4",name:"Wine Crest Polo",price:31500,image:"https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=80",tag:"Limited",description:"Elegant wine-colored polo designed to stand out with class.",stock:7}
 ];
 const adminEmail="heritagethreads30@gmail.com",adminPassword="Joshuajoe2323";
 const defaultUsers=[{id:"admin_1",firstName:"Main",middleName:"",lastName:"Admin",email:adminEmail,phone:"09016654210",password:adminPassword,role:"admin",status:"active",verified:true,createdAt:new Date().toISOString()}];
 const defaultSettings={storeName:"HERITAGE THREADS",whatsappPhone:"09016654210",adminEmail:adminEmail};
 if(!localStorage.getItem("ht_products")) localStorage.setItem("ht_products",JSON.stringify(defaultProducts));
 if(!localStorage.getItem("ht_users")) localStorage.setItem("ht_users",JSON.stringify(defaultUsers));
 if(!localStorage.getItem("ht_orders")) localStorage.setItem("ht_orders",JSON.stringify([]));
 if(!localStorage.getItem("ht_cart")) localStorage.setItem("ht_cart",JSON.stringify([]));
 if(!localStorage.getItem("ht_settings")) localStorage.setItem("ht_settings",JSON.stringify(defaultSettings));
 if(!localStorage.getItem("ht_pending_verifications")) localStorage.setItem("ht_pending_verifications",JSON.stringify([]));
 if(!localStorage.getItem("ht_pending_resets")) localStorage.setItem("ht_pending_resets",JSON.stringify([]));
})();

const __sheetApiBase = (window.SHEETS_CONFIG && window.SHEETS_CONFIG.apiUrl) || "";
const __remoteEnabled = !!__sheetApiBase;

async function __sheetGet(action, params = {}) {
  if (!__remoteEnabled) return { ok: false, message: "No API URL" };
  const url = new URL(__sheetApiBase);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return await res.json();
}

async function __sheetPost(action, payload = {}) {
  if (!__remoteEnabled) return { ok: false, message: "No API URL" };
  const res = await fetch(__sheetApiBase, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload })
  });
  return await res.json();
}

window.saveMessageRemote = async function(payload){
  return await __sheetPost("saveMessage", payload);
};

async function __syncRemoteToLocal() {
  if (!__remoteEnabled) return;

  try {
    const [productsRes, settingsRes, usersRes, ordersRes] = await Promise.all([
      __sheetGet("products"),
      __sheetGet("settings"),
      __sheetGet("allUsers"),
      __sheetGet("allOrders")
    ]);

    if (productsRes.ok && Array.isArray(productsRes.products)) {
      const cleaned = productsRes.products.map(p => ({
        ...p,
        price: Number(p.price || 0),
        stock: Number(p.stock || 0)
      }));
      localStorage.setItem("ht_products", JSON.stringify(cleaned));
    }

    if (settingsRes.ok && settingsRes.settings) {
      localStorage.setItem("ht_settings", JSON.stringify(settingsRes.settings));
    }

    if (usersRes.ok && Array.isArray(usersRes.users)) {
      localStorage.setItem("ht_users", JSON.stringify(usersRes.users));
      const current = getCurrentUser();
      if (current) {
        const fresh = usersRes.users.find(u => u.email === current.email);
        if (fresh) setCurrentUser(fresh);
      }
    }

    if (ordersRes.ok && Array.isArray(ordersRes.orders)) {
      const cleanedOrders = ordersRes.orders.map(o => ({
        ...o,
        items: o.items || o.itemsText || "",
        total: Number(o.total || 0)
      }));
      localStorage.setItem("ht_orders", JSON.stringify(cleanedOrders));
    }
  } catch (err) {
    console.error("Remote sync failed:", err);
  }
}

window.htReady = __syncRemoteToLocal();

function getProducts(){return JSON.parse(localStorage.getItem("ht_products")||"[]")}
function saveProducts(v){localStorage.setItem("ht_products",JSON.stringify(v)); __sheetPost("overwriteProducts",{products:v}).catch(()=>{});}
function getUsers(){return JSON.parse(localStorage.getItem("ht_users")||"[]")}
function saveUsers(v){localStorage.setItem("ht_users",JSON.stringify(v)); __sheetPost("overwriteUsers",{users:v}).catch(()=>{});}
function getOrders(){return JSON.parse(localStorage.getItem("ht_orders")||"[]")}
function saveOrders(v){localStorage.setItem("ht_orders",JSON.stringify(v)); __sheetPost("overwriteOrders",{orders:v}).catch(()=>{});}
function getCart(){return JSON.parse(localStorage.getItem("ht_cart")||"[]")}
function saveCart(v){localStorage.setItem("ht_cart",JSON.stringify(v))}
function getSettings(){return JSON.parse(localStorage.getItem("ht_settings")||"{}")}
function saveSettings(v){localStorage.setItem("ht_settings",JSON.stringify(v)); __sheetPost("saveSettings",v).catch(()=>{});}
function getCurrentUser(){return JSON.parse(localStorage.getItem("ht_current_user")||"null")}
function setCurrentUser(v){localStorage.setItem("ht_current_user",JSON.stringify(v))}
function clearCurrentUser(){localStorage.removeItem("ht_current_user")}
function getPendingVerifications(){return JSON.parse(localStorage.getItem("ht_pending_verifications")||"[]")}
function savePendingVerifications(v){localStorage.setItem("ht_pending_verifications",JSON.stringify(v))}
function getPendingResets(){return JSON.parse(localStorage.getItem("ht_pending_resets")||"[]")}
function savePendingResets(v){localStorage.setItem("ht_pending_resets",JSON.stringify(v))}
function currency(n){return "₦"+Number(n||0).toLocaleString()}
function stockMeta(stock){const n=Number(stock||0);if(n<=0)return {text:"Sold Out",cls:"out"};if(n<=3)return {text:"Only "+n+" left",cls:"low"};return {text:"In Stock: "+n,cls:"in"};}
function generateId(prefix){return prefix+"_"+Date.now()+"_"+Math.floor(Math.random()*10000)}
function generateCode(){return String(Math.floor(100000+Math.random()*900000))}
function showAlert(message){const old=document.querySelector('.alert');if(old)old.remove();const box=document.createElement('div');box.className='alert';box.textContent=message;document.body.appendChild(box);setTimeout(()=>box.remove(),2600)}
function getDisplayName(user){return user?(user.firstName||"User"):"User"}
function applyStoreBrand(){const s=getSettings();document.querySelectorAll('[data-store-name]').forEach(el=>el.textContent=s.storeName||'HERITAGE THREADS')}
