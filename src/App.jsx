import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import ChatBot from "./ChatBot";

/* ============================================================
   SANBURGER — sitio web oficial
   Conectado directo al Supabase real del proyecto "Sanburgerbot"
   (tablas: categorias, productos, configuracion, promociones).
   El modo admin se protege con Supabase Auth (email + contraseña),
   no con una clave escrita en el código.
   ============================================================ */

const COLORS = {
  black: "#0c0c0c",
  panel: "#171717",
  panel2: "#212121",
  line: "#333333",
  red: "#e0242b",
  redDark: "#a91820",
  yellow: "#f4c400",
  white: "#fafaf7",
  gray: "#8a8a8a",
};

const FONTS_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Anton&family=Manrope:wght@400;500;700;800&family=Space+Mono:wght@400;700&display=swap');
  .font-display { font-family: 'Anton', sans-serif; letter-spacing: 0.01em; }
  .font-body { font-family: 'Manrope', sans-serif; }
  .font-mono { font-family: 'Space Mono', monospace; }
`;

const CATEGORY_TAGLINES = {
  Hamburguesas: "Esto no se mira... esto se pide.",
  Perros: "Una mordida y vas a entender.",
  Salchipapas: "Papa, queso y ganas de repetir.",
  Alitas: "Pícalas. Compártelas o no.",
  "Sánduches": "Rápido, cargado y sin vueltas.",
  "Plátanos Asados": "Dulce, tostado, con mucho queso.",
  Asados: "Directo de la parrilla a tu mesa.",
  Fritos: "Pa'l antojo de a poquitos.",
  Bebidas: "Pa' bajar todo eso.",
};

function formatCOP(n) {
  return "$" + Math.round(n || 0).toLocaleString("es-CO");
}

export default function SanBurgerSite() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [promos, setPromos] = useState([]);
  const [zonas, setZonas] = useState([]);

  const [activeCat, setActiveCat] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [clientePago, setClientePago] = useState("Efectivo");
  const [clienteTipoEntrega, setClienteTipoEntrega] = useState("domicilio");
  const [clienteZonaId, setClienteZonaId] = useState("");

  const [session, setSession] = useState(null);
  const [adminGateOpen, setAdminGateOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [savingFlash, setSavingFlash] = useState(false);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const adminMode = !!session;

  /* ---------- Sesión de Supabase Auth ---------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ---------- Cargar datos reales de Supabase ---------- */
  async function loadAll() {
    const [{ data: cats }, { data: prods }, { data: config }, { data: promoRows }, { data: zonaRows }] = await Promise.all([
      supabase.from("categorias").select("*").order("orden"),
      supabase.from("productos").select("*").order("orden"),
      supabase.from("configuracion").select("*").eq("id", 1).single(),
      supabase.from("promociones").select("*").order("orden"),
      supabase.from("zonas_domicilio").select("*").order("orden"),
    ]);
    setCategories(cats || []);
    setProducts(prods || []);
    setSettings(config || {});
    setPromos(promoRows || []);
    setZonas(zonaRows || []);
    if (cats && cats.length > 0) setActiveCat((prev) => prev || cats[0].id);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function flashSaved() {
    setSavingFlash(true);
    setTimeout(() => setSavingFlash(false), 1200);
  }

  /* ---------- Escrituras a Supabase ---------- */
  async function updateProduct(id, patch) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supabase.from("productos").update(patch).eq("id", id);
    if (!error) flashSaved();
  }

  async function updateSettings(patch) {
    setSettings((prev) => ({ ...prev, ...patch }));
    const { error } = await supabase.from("configuracion").update(patch).eq("id", 1);
    if (!error) flashSaved();
  }

  async function addPromo() {
    const { data, error } = await supabase
      .from("promociones")
      .insert({ nombre: "Nueva promo", descripcion: "Descríbela aquí", precio: 0, activa: true, orden: promos.length })
      .select()
      .single();
    if (!error && data) setPromos((prev) => [...prev, data]);
  }
  async function updatePromo(id, patch) {
    setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supabase.from("promociones").update(patch).eq("id", id);
    if (!error) flashSaved();
  }
  async function deletePromo(id) {
    setPromos((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("promociones").delete().eq("id", id);
  }

  async function addZona() {
    const { data, error } = await supabase
      .from("zonas_domicilio")
      .insert({ nombre: "Nueva zona", precio: 0, activa: true, orden: zonas.length })
      .select()
      .single();
    if (!error && data) setZonas((prev) => [...prev, data]);
  }
  async function updateZona(id, patch) {
    setZonas((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
    const { error } = await supabase.from("zonas_domicilio").update(patch).eq("id", id);
    if (!error) flashSaved();
  }
  async function deleteZona(id) {
    setZonas((prev) => prev.filter((z) => z.id !== id));
    await supabase.from("zonas_domicilio").delete().eq("id", id);
  }

  /* ---------- Carrito ---------- */
  function addToCart(product, esCombo) {
    const precio = esCombo ? product.combo_precio : product.precio;
    setCart((prev) => {
      const key = product.id + (esCombo ? "-combo" : "-solo");
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => (i.key === key ? { ...i, cantidad: i.cantidad + 1 } : i));
      return [...prev, { key, productId: product.id, nombre: product.nombre, precio, esCombo, cantidad: 1, nota: "" }];
    });
    setCartOpen(true);
  }
  function changeQty(key, delta) {
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, cantidad: i.cantidad + delta } : i)).filter((i) => i.cantidad > 0));
  }
  function removeItem(key) {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }
  function setNota(key, nota) {
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, nota } : i)));
  }

  const zonaSeleccionada = zonas.find((z) => z.id === clienteZonaId);
  const costoDomicilio = clienteTipoEntrega === "domicilio" && zonaSeleccionada ? Number(zonaSeleccionada.precio) : 0;
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.precio * i.cantidad, 0), [cart]);
  const total = subtotal + costoDomicilio;
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.cantidad, 0), [cart]);

  function buildWhatsAppMessage() {
    let msg = `🔥 ¡Hola SANBURGER!\n\nQuiero hacer este pedido:\n\n`;
    cart.forEach((i) => {
      const prod = products.find((p) => p.id === i.productId);
      const cat = prod ? categories.find((c) => c.id === prod.categoria_id) : null;
      const emoji = cat ? cat.emoji : "🍽️";
      msg += `${emoji} ${i.cantidad} ${i.nombre}${i.esCombo ? " (combo)" : ""}`;
      if (i.nota) msg += ` — ${i.nota}`;
      msg += `\n`;
    });
    if (clienteTipoEntrega === "domicilio" && zonaSeleccionada) {
      msg += `\n🛵 Domicilio (${zonaSeleccionada.nombre}): ${formatCOP(costoDomicilio)}`;
    }
    msg += `\n\nSubtotal: ${formatCOP(subtotal)}`;
    if (costoDomicilio > 0) msg += `\nDomicilio: ${formatCOP(costoDomicilio)}`;
    msg += `\nTotal: ${formatCOP(total)}\n\n`;
    msg += `Nombre: ${clienteNombre || "-"}\n`;
    msg += clienteTipoEntrega === "domicilio" ? `Zona: ${zonaSeleccionada ? zonaSeleccionada.nombre : "-"}\nDirección: ${clienteDireccion || "-"}\n` : `Recoge en el local\n`;
    msg += `Forma de pago: ${clientePago}`;
    return msg;
  }

  async function buscarClientePorTelefono() {
    const tel = clienteTelefono.replace(/[^0-9]/g, "");
    if (tel.length < 7) return;
    const { data } = await supabase.from("clientes").select("*").eq("telefono", tel).maybeSingle();
    if (data) {
      setClienteEncontrado(data);
      if (!clienteNombre) setClienteNombre(data.nombre || "");
      if (!clienteDireccion && data.direccion) setClienteDireccion(data.direccion);
    } else {
      setClienteEncontrado(null);
    }
  }

  function sendWhatsApp() {
    const tel = clienteTelefono.replace(/[^0-9]/g, "");
    if (tel) {
      supabase
        .from("clientes")
        .upsert(
          { telefono: tel, nombre: clienteNombre, direccion: clienteTipoEntrega === "domicilio" ? clienteDireccion : clienteEncontrado?.direccion || null, barrio: zonaSeleccionada ? zonaSeleccionada.nombre : clienteEncontrado?.barrio || null },
          { onConflict: "telefono" }
        )
        .then(() => {})
        .catch(() => {});
    }
    const text = encodeURIComponent(buildWhatsAppMessage());
    window.open(`https://wa.me/${settings.whatsapp}?text=${text}`, "_blank");
  }

  /* ---------- Login admin (Supabase Auth) ---------- */
  async function tryLogin() {
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) {
      setLoginError("Correo o contraseña incorrectos.");
    } else {
      setAdminGateOpen(false);
      setLoginEmail("");
      setLoginPassword("");
    }
  }
  async function logout() {
    await supabase.auth.signOut();
  }

  const activeProducts = products.filter((p) => p.categoria_id === activeCat && (p.disponible || adminMode));

  if (loading) {
    return (
      <div style={{ background: COLORS.black, minHeight: "100vh" }} className="flex items-center justify-center">
        <style>{FONTS_CSS}</style>
        <div className="font-display text-4xl animate-pulse" style={{ color: COLORS.yellow }}>SANBURGER</div>
      </div>
    );
  }

  return (
    <div className="font-body" style={{ background: COLORS.black, color: COLORS.white, minHeight: "100vh", paddingBottom: "76px" }}>
      <style>{FONTS_CSS}</style>
      <style>{`
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.line}; border-radius: 4px; }
        .cat-scroll::-webkit-scrollbar { display: none; }
        .cat-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .grill-texture { background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 14px); }
        .comanda-top { background: radial-gradient(circle, ${COLORS.black} 6px, transparent 6.5px); background-size: 18px 18px; background-position: -4px -4px; height: 12px; }
        .comanda-bottom { height: 14px; background: linear-gradient(135deg, ${COLORS.panel} 25%, transparent 25%) -6px 0, linear-gradient(225deg, ${COLORS.panel} 25%, transparent 25%) -6px 0; background-size: 12px 14px; background-color: transparent; }
        @keyframes flashSave { 0%{opacity:0} 15%{opacity:1} 85%{opacity:1} 100%{opacity:0} }
        .flash-save { animation: flashSave 1.2s ease; }
      `}</style>

      {/* ---------- HEADER ---------- */}
      <header className="sticky top-0 z-40" style={{ background: "rgba(12,12,12,0.92)", backdropFilter: "blur(6px)", borderBottom: `1px solid ${COLORS.line}` }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <a href="#inicio" className="font-display text-2xl">SAN<span style={{ color: COLORS.red }}>BURGER</span></a>
          <nav className="hidden md:flex items-center gap-6 font-body font-700 text-sm">
            <a href="#inicio" className="hover:opacity-70">INICIO</a>
            <a href="#menu" className="hover:opacity-70">MENÚ</a>
            <a href="#promos" className="hover:opacity-70">PROMOS</a>
            <a href="#nosotros" className="hover:opacity-70">NOSOTROS</a>
            <a href="#contacto" className="hover:opacity-70">CONTACTO</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setCartOpen(true)} className="relative rounded-full px-3 py-2 font-display text-sm" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}` }}>
              🛒
              {cartCount > 0 && <span className="absolute -top-1 -right-1 rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-mono" style={{ background: COLORS.yellow, color: COLORS.black }}>{cartCount}</span>}
            </button>
            <button className="md:hidden text-xl px-2" onClick={() => setMobileNavOpen((v) => !v)}>☰</button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="md:hidden flex flex-col gap-1 px-4 pb-3 font-body font-700 text-sm">
            {[["INICIO", "#inicio"], ["MENÚ", "#menu"], ["PROMOS", "#promos"], ["NOSOTROS", "#nosotros"], ["CONTACTO", "#contacto"]].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMobileNavOpen(false)} className="py-2 border-b" style={{ borderColor: COLORS.line }}>{label}</a>
            ))}
          </div>
        )}
      </header>

      {/* ---------- HERO ---------- */}
      <section id="inicio" className="relative overflow-hidden grill-texture" style={{ background: `radial-gradient(ellipse at 30% 20%, ${COLORS.redDark}55, ${COLORS.black} 60%)` }}>
        <div className="max-w-5xl mx-auto px-4 pt-14 pb-16 md:pt-24 md:pb-24 flex flex-col items-center text-center">
          {settings.hero_imagen ? (
            <img src={settings.hero_imagen} alt="SanBurger" className="w-40 h-40 md:w-56 md:h-56 object-cover rounded-2xl mb-6 shadow-2xl" style={{ border: `3px solid ${COLORS.yellow}` }} />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl mb-6 flex items-center justify-center text-6xl" style={{ background: COLORS.panel2, border: `2px dashed ${COLORS.gray}` }}>🍔</div>
          )}
          <h1 className="font-display text-5xl md:text-7xl leading-none">
            {adminMode ? <EditableText value={settings.hero_titulo} onChange={(v) => updateSettings({ hero_titulo: v })} className="font-display text-5xl md:text-7xl text-center bg-transparent" style={{ color: COLORS.white }} /> : settings.hero_titulo}
          </h1>
          <div className="mt-4 font-display text-xl md:text-3xl" style={{ color: COLORS.yellow }}>
            {adminMode ? <EditableText value={settings.hero_frase} onChange={(v) => updateSettings({ hero_frase: v })} className="font-display text-xl md:text-3xl text-center bg-transparent" style={{ color: COLORS.yellow }} /> : settings.hero_frase}
          </div>
          <p className="mt-3 max-w-md text-base md:text-lg" style={{ color: "#d9d9d9" }}>
            {adminMode ? <EditableText value={settings.hero_sub} onChange={(v) => updateSettings({ hero_sub: v })} className="text-center bg-transparent w-full" style={{ color: "#d9d9d9" }} /> : settings.hero_sub}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href="#menu" className="font-display text-lg px-8 py-3 rounded-full" style={{ background: COLORS.red, color: COLORS.white }}>VER MENÚ</a>
            <a href="#menu" className="font-display text-lg px-8 py-3 rounded-full" style={{ background: COLORS.yellow, color: COLORS.black }}>PEDIR AHORA</a>
          </div>
          {adminMode && (
            <div className="mt-6 w-full max-w-sm text-left">
              <label className="text-xs font-mono" style={{ color: COLORS.gray }}>URL foto del hero</label>
              <input type="text" value={settings.hero_imagen || ""} onChange={(e) => updateSettings({ hero_imagen: e.target.value })} placeholder="https://..." className="w-full mt-1 px-3 py-2 rounded text-sm font-mono" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.white }} />
            </div>
          )}
        </div>
      </section>

      {/* ---------- MENU ---------- */}
      <section id="menu" className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="font-display text-3xl text-center mb-1">¿YA TE DIO HAMBRE? 🔥</h2>
        <p className="text-center mb-6" style={{ color: COLORS.gray }}>Escoge tu categoría y arma tu pedido</p>

        <div className="cat-scroll flex gap-2 overflow-x-auto pb-3 mb-6 sticky top-[57px] z-30 py-2" style={{ background: COLORS.black }}>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setActiveCat(c.id)} className="shrink-0 font-display text-sm px-4 py-2 rounded-full whitespace-nowrap"
              style={activeCat === c.id ? { background: COLORS.red, color: COLORS.white } : { background: COLORS.panel2, color: COLORS.gray, border: `1px solid ${COLORS.line}` }}>
              {c.emoji} {c.nombre.toUpperCase()}
            </button>
          ))}
        </div>

        <p className="font-mono text-sm mb-5" style={{ color: COLORS.yellow }}>
          {CATEGORY_TAGLINES[categories.find((c) => c.id === activeCat)?.nombre] || ""}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeProducts.map((p) => (
            <ProductCard key={p.id} product={p} categoryEmoji={categories.find((c) => c.id === p.categoria_id)?.emoji} onAdd={addToCart} adminMode={adminMode} onUpdate={(patch) => updateProduct(p.id, patch)} />
          ))}
          {activeProducts.length === 0 && <p className="text-sm col-span-2 text-center py-10" style={{ color: COLORS.gray }}>No hay productos disponibles en esta categoría todavía.</p>}
        </div>
      </section>

      {/* ---------- PROMOS ---------- */}
      <section id="promos" className="py-12" style={{ background: COLORS.panel, borderTop: `1px solid ${COLORS.line}`, borderBottom: `1px solid ${COLORS.line}` }}>
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-display text-3xl text-center mb-2" style={{ color: COLORS.yellow }}>🔥 PROMOS SANBURGER</h2>
          <p className="text-center mb-8" style={{ color: COLORS.gray }}>El combo que necesitas para acabar con ese antojo.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="rounded-2xl p-5" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}` }}>
              <p className="font-display text-lg mb-1">VUÉLVELO COMBO</p>
              <p className="text-sm" style={{ color: COLORS.gray }}>Las hamburguesas, perros y sánduches que tienen combo se pueden pedir con papa y bebida directo desde el menú — busca el botón amarillo "+ COMBO".</p>
            </div>
          </div>

          {promos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {promos.filter((pr) => pr.activa || adminMode).map((pr) => (
                <PromoCard key={pr.id} promo={pr} adminMode={adminMode} onUpdate={(patch) => updatePromo(pr.id, patch)} onDelete={() => deletePromo(pr.id)} />
              ))}
            </div>
          )}
          {promos.length === 0 && !adminMode && <p className="text-center text-sm" style={{ color: COLORS.gray }}>Muy pronto vas a encontrar aquí promociones especiales.</p>}
          {adminMode && <button onClick={addPromo} className="mt-6 mx-auto block font-display text-sm px-5 py-2 rounded-full" style={{ background: COLORS.red, color: COLORS.white }}>+ AGREGAR PROMOCIÓN</button>}
        </div>
      </section>

      {/* ---------- NOSOTROS ---------- */}
      <section id="nosotros" className="max-w-3xl mx-auto px-4 py-14 text-center">
        <h2 className="font-display text-3xl mb-4">Somos SANBURGER</h2>
        <p className="text-lg leading-relaxed" style={{ color: "#d9d9d9" }}>
          Nos gusta la comida con sabor, las hamburguesas bien cargadas y esos momentos en los que uno dice: "hoy sí me voy a dar gusto".
        </p>
      </section>

      {/* ---------- ZONAS DE DOMICILIO (solo admin) ---------- */}
      {adminMode && (
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="font-display text-2xl text-center mb-1">🛵 ZONAS DE DOMICILIO</h2>
          <p className="text-center mb-6 text-sm" style={{ color: COLORS.gray }}>Define aquí las zonas y su costo — el cliente las ve al escoger domicilio.</p>
          <div className="flex flex-col gap-2">
            {zonas.map((z) => (
              <div key={z.id} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}` }}>
                <EditableText value={z.nombre} onChange={(v) => updateZona(z.id, { nombre: v })} className="flex-1 bg-transparent text-sm" style={{ color: COLORS.white }} />
                <input type="number" value={z.precio} onChange={(e) => updateZona(z.id, { precio: Number(e.target.value) })} className="w-24 font-mono text-sm bg-transparent" style={{ color: COLORS.yellow, border: `1px dashed ${COLORS.gray}`, borderRadius: 6, padding: "2px 6px" }} />
                <label className="flex items-center gap-1 text-xs" style={{ color: COLORS.gray }}>
                  <input type="checkbox" checked={z.activa} onChange={(e) => updateZona(z.id, { activa: e.target.checked })} /> activa
                </label>
                <button onClick={() => deleteZona(z.id)} className="text-xs" style={{ color: COLORS.red }}>eliminar</button>
              </div>
            ))}
            {zonas.length === 0 && <p className="text-center text-sm" style={{ color: COLORS.gray }}>Aún no has agregado zonas.</p>}
          </div>
          <button onClick={addZona} className="mt-4 mx-auto block font-display text-sm px-5 py-2 rounded-full" style={{ background: COLORS.red, color: COLORS.white }}>+ AGREGAR ZONA</button>
        </section>
      )}

      {/* ---------- CONTACTO ---------- */}
      <section id="contacto" className="py-12" style={{ background: COLORS.panel, borderTop: `1px solid ${COLORS.line}` }}>
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-3xl text-center mb-8">CONTACTO</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <ContactRow icon="📍" label="Ubicación" value={settings.direccion} adminMode={adminMode} onChange={(v) => updateSettings({ direccion: v })} />
            <ContactRow icon="🕐" label="Horario" value={settings.horario} adminMode={adminMode} onChange={(v) => updateSettings({ horario: v })} />
            <ContactRow icon="📲" label="WhatsApp" value={settings.whatsapp} adminMode={adminMode} onChange={(v) => updateSettings({ whatsapp: v.replace(/[^0-9]/g, "") })} mono />
            <ContactRow icon="📸" label="Instagram" value={"@" + (settings.instagram || "")} adminMode={adminMode} onChange={(v) => updateSettings({ instagram: v.replace("@", "") })} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="font-display text-center px-6 py-3 rounded-full" style={{ background: "#25D366", color: COLORS.black }}>WHATSAPP</a>
            <a href={settings.direccion ? `https://www.google.com/maps/search/${encodeURIComponent(settings.direccion)}` : "#"} target="_blank" rel="noreferrer" className="font-display text-center px-6 py-3 rounded-full" style={{ background: COLORS.panel2, color: COLORS.white, border: `1px solid ${COLORS.line}` }}>GOOGLE MAPS</a>
            <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer" className="font-display text-center px-6 py-3 rounded-full" style={{ background: COLORS.panel2, color: COLORS.white, border: `1px solid ${COLORS.line}` }}>INSTAGRAM</a>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center" style={{ color: COLORS.gray }}>
        <p className="font-display text-lg" style={{ color: COLORS.white }}>SANBURGER</p>
        <p className="text-xs mt-1">Hamburguesas y comidas rápidas · Armenia, Quindío</p>
        <button onClick={() => (adminMode ? logout() : setAdminGateOpen(true))} className="text-xs mt-4 underline opacity-50">
          {adminMode ? "Salir del modo administrador" : "Admin"}
        </button>
      </footer>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2" style={{ background: COLORS.panel, borderTop: `1px solid ${COLORS.line}` }}>
        <a href="#inicio" className="flex flex-col items-center text-xs">🏠<span>Inicio</span></a>
        <a href="#menu" className="flex flex-col items-center text-xs">🍔<span>Menú</span></a>
        <button onClick={() => setCartOpen(true)} className="flex flex-col items-center text-xs relative">
          🛒<span>Pedido</span>
          {cartCount > 0 && <span className="absolute -top-1 right-2 rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-mono" style={{ background: COLORS.yellow, color: COLORS.black }}>{cartCount}</span>}
        </button>
        <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="flex flex-col items-center text-xs">📲<span>WhatsApp</span></a>
      </div>

      {/* ---------- BURBUJA DEL CHATBOT ---------- */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 z-40 rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow-2xl"
          style={{ background: COLORS.red, color: COLORS.white }}
        >
          💬
        </button>
      )}
      <ChatBot categories={categories} products={products} settings={settings} zonas={zonas} open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* ---------- CARRITO ("comanda") ---------- */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setCartOpen(false)}>
          <div className="w-full sm:max-w-md sm:rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: "88vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="comanda-top" style={{ background: COLORS.panel }} />
            <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4 font-mono" style={{ background: COLORS.panel, color: COLORS.white }}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-display text-xl" style={{ color: COLORS.red }}>SANBURGER</p>
                <button onClick={() => setCartOpen(false)} className="text-lg">✕</button>
              </div>
              <p className="text-xs mb-4" style={{ color: COLORS.gray }}>· · · COMANDA DE PEDIDO · · ·</p>

              {cart.length === 0 ? (
                <p className="text-sm py-10 text-center" style={{ color: COLORS.gray }}>Tu comanda está vacía. Ve al menú y arma tu antojo.</p>
              ) : (
                <div className="flex flex-col gap-4 border-t border-b py-4" style={{ borderColor: COLORS.line, borderStyle: "dashed" }}>
                  {cart.map((item) => (
                    <div key={item.key} className="text-sm">
                      <div className="flex justify-between items-start gap-2">
                        <span>{item.nombre}{item.esCombo ? " (combo)" : ""}</span>
                        <span style={{ color: COLORS.yellow }}>{formatCOP(item.precio * item.cantidad)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <button onClick={() => changeQty(item.key, -1)} className="w-6 h-6 rounded" style={{ background: COLORS.panel2 }}>-</button>
                          <span>{item.cantidad}</span>
                          <button onClick={() => changeQty(item.key, 1)} className="w-6 h-6 rounded" style={{ background: COLORS.panel2 }}>+</button>
                          <button onClick={() => removeItem(item.key)} className="text-xs ml-2" style={{ color: COLORS.red }}>eliminar</button>
                        </div>
                      </div>
                      <input type="text" placeholder="Ej: sin cebolla, extra queso..." value={item.nota} onChange={(e) => setNota(item.key, e.target.value)} className="w-full mt-1 px-2 py-1 rounded text-xs font-mono" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.white }} />
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <>
                  <div className="flex flex-col gap-1 py-2 text-sm" style={{ color: COLORS.gray }}>
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCOP(subtotal)}</span></div>
                    {costoDomicilio > 0 && <div className="flex justify-between"><span>Domicilio ({zonaSeleccionada?.nombre})</span><span>{formatCOP(costoDomicilio)}</span></div>}
                  </div>
                  <div className="flex justify-between items-center py-1 font-display text-lg">
                    <span>TOTAL</span>
                    <span style={{ color: COLORS.yellow }}>{formatCOP(total)}</span>
                  </div>
                  <div className="flex flex-col gap-2 my-3">
                    <input type="tel" placeholder="Tu número de celular" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} onBlur={buscarClientePorTelefono} className="px-3 py-2 rounded text-sm" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.white }} />
                    {clienteEncontrado && (
                      <p className="text-xs" style={{ color: COLORS.yellow }}>👋 ¡Qué bueno verte de nuevo, {clienteEncontrado.nombre}! Ya rellenamos tus datos — cámbialos si algo es distinto esta vez.</p>
                    )}
                    <input type="text" placeholder="Tu nombre" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} className="px-3 py-2 rounded text-sm" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.white }} />
                    <div className="flex gap-2">
                      <button onClick={() => setClienteTipoEntrega("domicilio")} className="flex-1 px-3 py-2 rounded text-sm font-display" style={clienteTipoEntrega === "domicilio" ? { background: COLORS.red, color: COLORS.white } : { background: COLORS.panel2, color: COLORS.gray, border: `1px solid ${COLORS.line}` }}>🛵 Domicilio</button>
                      <button onClick={() => setClienteTipoEntrega("local")} className="flex-1 px-3 py-2 rounded text-sm font-display" style={clienteTipoEntrega === "local" ? { background: COLORS.red, color: COLORS.white } : { background: COLORS.panel2, color: COLORS.gray, border: `1px solid ${COLORS.line}` }}>🏠 Recoger</button>
                    </div>
                    {clienteTipoEntrega === "domicilio" && (
                      <>
                        <select value={clienteZonaId} onChange={(e) => setClienteZonaId(e.target.value)} className="px-3 py-2 rounded text-sm" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.white }}>
                          <option value="">Selecciona tu zona...</option>
                          {zonas.filter((z) => z.activa).map((z) => (
                            <option key={z.id} value={z.id}>{z.nombre} — {formatCOP(z.precio)}</option>
                          ))}
                        </select>
                        <input type="text" placeholder="Dirección exacta" value={clienteDireccion} onChange={(e) => setClienteDireccion(e.target.value)} className="px-3 py-2 rounded text-sm" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.white }} />
                        {clienteEncontrado?.direccion && clienteDireccion === clienteEncontrado.direccion && (
                          <p className="text-xs" style={{ color: COLORS.gray }}>Esta es tu dirección guardada — puedes editar el campo de arriba si hoy es otra.</p>
                        )}
                      </>
                    )}
                    <select value={clientePago} onChange={(e) => setClientePago(e.target.value)} className="px-3 py-2 rounded text-sm" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.white }}>
                      <option>Efectivo</option>
                      <option>Transferencia</option>
                      <option>Tarjeta</option>
                    </select>
                  </div>
                  <button onClick={sendWhatsApp} className="w-full font-display text-lg py-3 rounded-full" style={{ background: "#25D366", color: COLORS.black }}>PEDIR POR WHATSAPP 📲</button>
                </>
              )}
            </div>
            <div className="comanda-bottom" style={{ background: COLORS.panel }} />
          </div>
        </div>
      )}

      {/* ---------- LOGIN ADMIN ---------- */}
      {adminGateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setAdminGateOpen(false)}>
          <div className="w-full max-w-xs rounded-2xl p-6" style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}` }} onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-xl mb-3 text-center">MODO ADMIN</p>
            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Correo" className="w-full px-3 py-2 rounded text-sm mb-2" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.white }} autoFocus />
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryLogin()} placeholder="Contraseña" className="w-full px-3 py-2 rounded text-sm mb-2" style={{ background: COLORS.panel2, border: `1px solid ${loginError ? COLORS.red : COLORS.line}`, color: COLORS.white }} />
            {loginError && <p className="text-xs mb-2" style={{ color: COLORS.red }}>{loginError}</p>}
            <button onClick={tryLogin} className="w-full font-display py-2 rounded-full" style={{ background: COLORS.red, color: COLORS.white }}>ENTRAR</button>
          </div>
        </div>
      )}

      {adminMode && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 font-mono text-xs px-3 py-1 rounded-full" style={{ background: COLORS.yellow, color: COLORS.black }}>
          ✏️ MODO ADMIN — toca cualquier texto o precio para editarlo
        </div>
      )}
      {savingFlash && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 font-mono text-xs px-3 py-1 rounded-full flash-save" style={{ background: COLORS.panel2, color: COLORS.yellow, border: `1px solid ${COLORS.line}` }}>
          Guardado ✓
        </div>
      )}
    </div>
  );
}

/* ============================================================ Subcomponentes ============================================================ */

function EditableText({ value, onChange, className, style, textarea }) {
  const [local, setLocal] = useState(value || "");
  useEffect(() => setLocal(value || ""), [value]);
  const Tag = textarea ? "textarea" : "input";
  return <Tag value={local} onChange={(e) => setLocal(e.target.value)} onBlur={() => onChange(local)} className={className} style={{ ...style, border: `1px dashed ${COLORS.gray}`, borderRadius: 6, padding: "2px 6px" }} />;
}

function ProductCard({ product, categoryEmoji, onAdd, adminMode, onUpdate }) {
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, opacity: product.disponible ? 1 : 0.45 }}>
      <div className="h-36 flex items-center justify-center relative" style={{ background: `repeating-linear-gradient(135deg, ${COLORS.panel2}, ${COLORS.panel2} 10px, ${COLORS.black} 10px, ${COLORS.black} 20px)` }}>
    {product.imagen ? (
  <img
    src={`https://wsrv.nl/?url=${encodeURIComponent(product.imagen)}&w=400&q=65&output=webp`}
    alt={product.nombre}
    loading="lazy"
    decoding="async"
    className="w-full h-full object-cover"
  />
) : (
  <span className="text-5xl">{categoryEmoji}</span>
)}
  <span className="text-5xl">{categoryEmoji}</spa
        {!product.disponible && <span className="absolute top-2 left-2 font-mono text-[10px] px-2 py-1 rounded" style={{ background: COLORS.black, color: COLORS.red }}>AGOTADO</span>}
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        {adminMode ? <EditableText value={product.nombre} onChange={(v) => onUpdate({ nombre: v })} className="font-display text-lg bg-transparent" style={{ color: COLORS.white }} /> : <p className="font-display text-lg">{product.nombre}</p>}
        {product.ingredientes && product.ingredientes.length > 0 && <p className="text-xs" style={{ color: COLORS.gray }}>{product.ingredientes.join(", ")}</p>}
        <div className="mt-2 flex items-center justify-between">
          {adminMode ? (
            <input type="number" value={product.precio} onChange={(e) => onUpdate({ precio: Number(e.target.value) })} className="font-mono text-lg w-24 bg-transparent" style={{ color: COLORS.yellow, border: `1px dashed ${COLORS.gray}`, borderRadius: 6, padding: "2px 6px" }} />
          ) : (
            <p className="font-mono text-lg" style={{ color: COLORS.yellow }}>{formatCOP(product.precio)}</p>
          )}
        </div>
        {adminMode && (
          <div className="flex flex-col gap-2 mt-1">
            <label className="flex items-center gap-1 text-xs" style={{ color: COLORS.gray }}>
              <input type="checkbox" checked={product.disponible} onChange={(e) => onUpdate({ disponible: e.target.checked })} /> disponible
            </label>
            <PhotoUploadButton product={product} onUpdate={onUpdate} />
          </div>
        )}
        <div className="mt-auto pt-3 flex gap-2">
          <button onClick={() => onAdd(product, false)} disabled={!product.disponible} className="flex-1 font-display text-sm py-2 rounded-full" style={{ background: COLORS.red, color: COLORS.white, opacity: product.disponible ? 1 : 0.5 }}>LO QUIERO 🔥</button>
          {product.combo_precio && (
            <button onClick={() => onAdd(product, true)} disabled={!product.disponible} className="font-display text-xs px-3 py-2 rounded-full whitespace-nowrap" style={{ background: COLORS.yellow, color: COLORS.black, opacity: product.disponible ? 1 : 0.5 }}>
              + COMBO {formatCOP(product.combo_precio)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoUploadButton({ product, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputId = `foto-${product.id}`;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${product.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("productos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("productos").getPublicUrl(path);
      onUpdate({ imagen: data.publicUrl });
    } catch (err) {
      setError("No se pudo subir la foto. Intenta de nuevo.");
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={inputId}
        className="text-xs px-3 py-2 rounded-full font-display cursor-pointer whitespace-nowrap"
        style={{ background: COLORS.yellow, color: COLORS.black, opacity: uploading ? 0.6 : 1 }}
      >
        {uploading ? "SUBIENDO..." : product.imagen ? "CAMBIAR FOTO 📷" : "SUBIR FOTO 📷"}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        disabled={uploading}
        className="hidden"
      />
      {error && <span className="text-xs" style={{ color: COLORS.red }}>{error}</span>}
    </div>
  );
}

function PromoCard({ promo, adminMode, onUpdate, onDelete }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.yellow}`, opacity: promo.activa ? 1 : 0.4 }}>
      {adminMode ? (
        <>
          <EditableText value={promo.nombre} onChange={(v) => onUpdate({ nombre: v })} className="font-display text-lg bg-transparent w-full mb-1" style={{ color: COLORS.white }} />
          <EditableText value={promo.descripcion} onChange={(v) => onUpdate({ descripcion: v })} textarea className="text-sm bg-transparent w-full mb-2" style={{ color: COLORS.gray }} />
          <input type="number" value={promo.precio} onChange={(e) => onUpdate({ precio: Number(e.target.value) })} className="font-mono bg-transparent mb-2" style={{ color: COLORS.yellow, border: `1px dashed ${COLORS.gray}`, borderRadius: 6, padding: "2px 6px" }} />
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1" style={{ color: COLORS.gray }}><input type="checkbox" checked={promo.activa} onChange={(e) => onUpdate({ activa: e.target.checked })} /> activa</label>
            <button onClick={onDelete} style={{ color: COLORS.red }}>eliminar</button>
          </div>
        </>
      ) : (
        <>
          <p className="font-display text-lg mb-1">{promo.nombre}</p>
          <p className="text-sm mb-2" style={{ color: COLORS.gray }}>{promo.descripcion}</p>
          {promo.precio > 0 && <p className="font-mono text-lg" style={{ color: COLORS.yellow }}>{formatCOP(promo.precio)}</p>}
        </>
      )}
    </div>
  );
}

function ContactRow({ icon, label, value, adminMode, onChange, mono }) {
  return (
    <div className="rounded-xl p-4" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}` }}>
      <p className="text-xs mb-1" style={{ color: COLORS.gray }}>{icon} {label}</p>
      {adminMode ? <EditableText value={value} onChange={onChange} className={`text-sm bg-transparent w-full ${mono ? "font-mono" : ""}`} style={{ color: COLORS.white }} /> : <p className={`text-sm ${mono ? "font-mono" : ""}`} style={{ color: COLORS.white }}>{value}</p>}
    </div>
  );
}
