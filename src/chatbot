import React, { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient";

/* ============================================================
   SANBURGER — chatbot de pedidos
   Flujo guiado por botones (sin depender de un modelo de IA):
   categoría → producto → combo/nota → ¿algo más? → datos del
   cliente → confirmar. Al confirmar: inserta en `pedidos`
   (mismo flujo que ven cocina/meseros) y avisa por Telegram.
   ============================================================ */

const COLORS = {
  black: "#0c0c0c",
  panel: "#171717",
  panel2: "#212121",
  line: "#333333",
  red: "#e0242b",
  yellow: "#f4c400",
  white: "#fafaf7",
  gray: "#8a8a8a",
};

function formatCOP(n) {
  return "$" + Math.round(n || 0).toLocaleString("es-CO");
}

const STEPS = {
  MENU: "menu",
  CATEGORIA: "categoria",
  PRODUCTO: "producto",
  COMBO: "combo",
  NOTA: "nota",
  MAS: "mas",
  NOMBRE: "nombre",
  TIPO: "tipo",
  ZONA: "zona",
  DIRECCION: "direccion",
  PAGO: "pago",
  RESUMEN: "resumen",
  ENVIANDO: "enviando",
  LISTO: "listo",
  ERROR: "error",
};

export default function ChatBot({ categories, products, settings, zonas = [], open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(STEPS.MENU);
  const [pendingCat, setPendingCat] = useState(null);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("domicilio");
  const [zona, setZona] = useState(null);
  const [direccion, setDireccion] = useState("");
  const [pago, setPago] = useState("Efectivo");
  const [textInput, setTextInput] = useState("");
  const [numeroPedido, setNumeroPedido] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      bot("¡Hola! 🔥 Soy el asistente de SANBURGER. ¿Qué categoría te antoja hoy?");
      setStep(STEPS.MENU);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function bot(text) {
    setMessages((prev) => [...prev, { from: "bot", text }]);
  }
  function user(text) {
    setMessages((prev) => [...prev, { from: "user", text }]);
  }

  const subtotal = cart.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const costoDomicilio = tipo === "domicilio" && zona ? Number(zona.precio) : 0;
  const total = subtotal + costoDomicilio;

  /* ---------- flujo ---------- */
  function pickCategoria(cat) {
    user(cat.nombre);
    setPendingCat(cat);
    setStep(STEPS.PRODUCTO);
    bot(`Buena elección. ¿Cuál de estos te provoca?`);
  }

  function pickProducto(p) {
    user(p.nombre);
    setPendingProduct(p);
    if (p.combo_precio) {
      setStep(STEPS.COMBO);
      bot(`¿Lo quieres solo (${formatCOP(p.precio)}) o en combo con papa y bebida (${formatCOP(p.combo_precio)})?`);
    } else {
      setStep(STEPS.NOTA);
      bot(`¿Alguna observación? Ej: "sin cebolla", "bien tostada". Si no, toca "Sin observaciones".`);
    }
  }

  function pickCombo(esCombo) {
    user(esCombo ? "Combo" : "Solo");
    setPendingProduct((prev) => ({ ...prev, _esCombo: esCombo }));
    setStep(STEPS.NOTA);
    bot(`¿Alguna observación? Ej: "sin cebolla", "bien tostada". Si no, toca "Sin observaciones".`);
  }

  function confirmNota(nota) {
    if (nota) user(nota);
    else user("Sin observaciones");
    const p = pendingProduct;
    const esCombo = !!p._esCombo;
    const precio = esCombo ? p.combo_precio : p.precio;
    setCart((prev) => [...prev, { productId: p.id, nombre: p.nombre, precio, esCombo, cantidad: 1, nota: nota || "" }]);
    setPendingProduct(null);
    setStep(STEPS.MAS);
    bot(`Agregado ✅ Llevas ${formatCOP(subtotal + precio)} hasta ahora. ¿Quieres algo más?`);
  }

  function otraCosa(si) {
    user(si ? "Sí, algo más" : "No, ya terminé");
    if (si) {
      setStep(STEPS.MENU);
      bot("Dale, ¿qué más se te antoja?");
    } else {
      setStep(STEPS.NOMBRE);
      bot("Perfecto. ¿Cuál es tu nombre?");
    }
  }

  function submitNombre() {
    if (!textInput.trim()) return;
    user(textInput);
    setNombre(textInput);
    setTextInput("");
    setStep(STEPS.TIPO);
    bot("¿Es para domicilio o lo recoges en el local?");
  }

  function pickTipo(t) {
    user(t === "domicilio" ? "Domicilio" : "Recoger en el local");
    setTipo(t);
    if (t === "domicilio") {
      if (zonas && zonas.filter((z) => z.activa).length > 0) {
        setStep(STEPS.ZONA);
        bot("¿En qué zona vives?");
      } else {
        setStep(STEPS.DIRECCION);
        bot("¿A qué dirección te lo llevamos?");
      }
    } else {
      setStep(STEPS.PAGO);
      bot("¿Cómo vas a pagar?");
    }
  }

  function pickZona(z) {
    user(z.nombre);
    setZona(z);
    setStep(STEPS.DIRECCION);
    bot(`El domicilio a ${z.nombre} cuesta ${formatCOP(z.precio)}. ¿Cuál es tu dirección exacta?`);
  }

  function submitDireccion() {
    if (!textInput.trim()) return;
    user(textInput);
    setDireccion(textInput);
    setTextInput("");
    setStep(STEPS.PAGO);
    bot("¿Cómo vas a pagar?");
  }

  function pickPago(p) {
    user(p);
    setPago(p);
    setStep(STEPS.RESUMEN);
    bot("Este es tu pedido, revísalo antes de confirmar:");
  }

  async function confirmarPedido() {
    setStep(STEPS.ENVIANDO);
    bot("Enviando tu pedido... 🔥");
    try {
      const items = cart.map((i) => ({
        qty: i.cantidad,
        name: i.nombre + (i.esCombo ? " (combo)" : ""),
        note: i.nota || "",
        price: i.precio,
        status: "nuevo",
        readyAt: null,
        category: categories.find((c) => c.id === products.find((p) => p.id === i.productId)?.categoria_id)?.nombre || "",
        startPrepAt: null,
      }));

      const notaEntrega =
        tipo === "domicilio"
          ? `Domicilio (${zona ? zona.nombre : "sin zona"} · ${formatCOP(costoDomicilio)}): ${direccion} · Pago: ${pago}`
          : `Recoge en local · Pago: ${pago}`;

      const { data, error } = await supabase
        .from("pedidos")
        .insert({
          tipo: "domicilio",
          cliente_nombre: nombre,
          estado: "nuevo",
          items,
          notas: notaEntrega,
          total,
        })
        .select()
        .single();

      if (error) throw error;

      setNumeroPedido(data.numero);

      // Aviso a Telegram (no bloquea el pedido si falla)
      fetch("/api/notify-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: data.numero,
          nombre,
          tipo,
          zona: zona ? zona.nombre : null,
          costoDomicilio,
          direccion: tipo === "domicilio" ? direccion : "Recoge en el local",
          pago,
          items: cart,
          subtotal,
          total,
        }),
      }).catch(() => {});

      setStep(STEPS.LISTO);
      bot(`¡Listo! Tu pedido #${data.numero} fue recibido 🔥 En SANBURGER ya lo estamos alistando.`);
    } catch (err) {
      console.error(err);
      setStep(STEPS.ERROR);
      bot("Uy, algo falló enviando tu pedido. Intenta de nuevo o escríbenos por WhatsApp.");
    }
  }

  function sendWhatsAppBackup() {
    let msg = `🔥 ¡Hola SANBURGER!\n\nQuiero hacer este pedido:\n\n`;
    cart.forEach((i) => {
      msg += `${i.cantidad} ${i.nombre}${i.esCombo ? " (combo)" : ""}${i.nota ? " — " + i.nota : ""}\n`;
    });
    if (tipo === "domicilio" && zona) msg += `\n🛵 Domicilio (${zona.nombre}): ${formatCOP(costoDomicilio)}`;
    msg += `\n\nSubtotal: ${formatCOP(subtotal)}\nTotal: ${formatCOP(total)}\n\nNombre: ${nombre}\n${tipo === "domicilio" ? "Zona: " + (zona ? zona.nombre : "-") + "\nDirección: " + direccion : "Recoge en el local"}\nForma de pago: ${pago}`;
    window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function reiniciar() {
    setMessages([]);
    setCart([]);
    setNombre("");
    setZona(null);
    setDireccion("");
    setPago("Efectivo");
    setNumeroPedido(null);
    setStep(STEPS.MENU);
    setTimeout(() => bot("¿Qué categoría te antoja hoy?"), 100);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div
        className="w-full sm:max-w-md sm:rounded-2xl overflow-hidden flex flex-col font-body"
        style={{ maxHeight: "88vh", background: COLORS.panel, color: COLORS.white }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
          <p className="font-display text-lg" style={{ color: COLORS.red }}>🤖 SANBURGER BOT</p>
          <button onClick={onClose} className="text-lg">✕</button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.from === "bot" ? "self-start" : "self-end"}`}
              style={m.from === "bot" ? { background: COLORS.panel2, color: COLORS.white } : { background: COLORS.red, color: COLORS.white }}>
              {m.text}
            </div>
          ))}

          {/* ---- Chips según el paso actual ---- */}
          {step === STEPS.MENU && (
            <ChipRow>
              {categories.map((c) => (
                <Chip key={c.id} onClick={() => pickCategoria(c)}>{c.emoji} {c.nombre}</Chip>
              ))}
            </ChipRow>
          )}

          {step === STEPS.PRODUCTO && pendingCat && (
            <ChipRow>
              {products.filter((p) => p.categoria_id === pendingCat.id && p.disponible).map((p) => (
                <Chip key={p.id} onClick={() => pickProducto(p)}>{p.nombre} · {formatCOP(p.precio)}</Chip>
              ))}
              <Chip onClick={() => { setStep(STEPS.MENU); bot("Claro, ¿qué otra categoría?"); }} muted>⬅️ Otra categoría</Chip>
            </ChipRow>
          )}

          {step === STEPS.COMBO && (
            <ChipRow>
              <Chip onClick={() => pickCombo(false)}>Solo</Chip>
              <Chip onClick={() => pickCombo(true)}>Combo</Chip>
            </ChipRow>
          )}

          {step === STEPS.NOTA && (
            <>
              <ChipRow>
                <Chip onClick={() => confirmNota("")}>Sin observaciones</Chip>
              </ChipRow>
              <TextRow value={textInput} onChange={setTextInput} placeholder="Escribe tu observación..." onSubmit={() => { confirmNota(textInput); setTextInput(""); }} />
            </>
          )}

          {step === STEPS.MAS && (
            <ChipRow>
              <Chip onClick={() => otraCosa(true)}>Sí, algo más</Chip>
              <Chip onClick={() => otraCosa(false)}>No, ya terminé</Chip>
            </ChipRow>
          )}

          {step === STEPS.NOMBRE && (
            <TextRow value={textInput} onChange={setTextInput} placeholder="Tu nombre..." onSubmit={submitNombre} />
          )}

          {step === STEPS.TIPO && (
            <ChipRow>
              <Chip onClick={() => pickTipo("domicilio")}>🛵 Domicilio</Chip>
              <Chip onClick={() => pickTipo("local")}>🏠 Recoger en el local</Chip>
            </ChipRow>
          )}

          {step === STEPS.ZONA && (
            <ChipRow>
              {zonas.filter((z) => z.activa).map((z) => (
                <Chip key={z.id} onClick={() => pickZona(z)}>{z.nombre} · {formatCOP(z.precio)}</Chip>
              ))}
            </ChipRow>
          )}

          {step === STEPS.DIRECCION && (
            <TextRow value={textInput} onChange={setTextInput} placeholder="Tu dirección..." onSubmit={submitDireccion} />
          )}

          {step === STEPS.PAGO && (
            <ChipRow>
              <Chip onClick={() => pickPago("Efectivo")}>💵 Efectivo</Chip>
              <Chip onClick={() => pickPago("Transferencia")}>📲 Transferencia</Chip>
              <Chip onClick={() => pickPago("Tarjeta")}>💳 Tarjeta</Chip>
            </ChipRow>
          )}

          {step === STEPS.RESUMEN && (
            <div className="rounded-xl p-3 text-sm font-mono w-full" style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}` }}>
              {cart.map((i, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{i.cantidad} {i.nombre}{i.esCombo ? " (combo)" : ""}</span>
                  <span style={{ color: COLORS.yellow }}>{formatCOP(i.precio * i.cantidad)}</span>
                </div>
              ))}
              <div className="flex justify-between mt-1" style={{ color: COLORS.gray }}>
                <span>Subtotal</span><span>{formatCOP(subtotal)}</span>
              </div>
              {costoDomicilio > 0 && (
                <div className="flex justify-between" style={{ color: COLORS.gray }}>
                  <span>Domicilio ({zona?.nombre})</span><span>{formatCOP(costoDomicilio)}</span>
                </div>
              )}
              <div className="flex justify-between mt-2 pt-2 font-display text-base" style={{ borderTop: `1px dashed ${COLORS.line}` }}>
                <span>TOTAL</span><span style={{ color: COLORS.yellow }}>{formatCOP(total)}</span>
              </div>
              <button onClick={confirmarPedido} className="w-full mt-3 font-display py-2 rounded-full" style={{ background: COLORS.red, color: COLORS.white }}>
                CONFIRMAR PEDIDO 🔥
              </button>
            </div>
          )}

          {step === STEPS.ERROR && (
            <ChipRow>
              <Chip onClick={confirmarPedido}>Reintentar</Chip>
              <Chip onClick={sendWhatsAppBackup}>Enviar por WhatsApp</Chip>
            </ChipRow>
          )}

          {step === STEPS.LISTO && (
            <ChipRow>
              <Chip onClick={reiniciar}>Hacer otro pedido</Chip>
            </ChipRow>
          )}
        </div>
      </div>
    </div>
  );
}

function ChipRow({ children }) {
  return <div className="flex flex-wrap gap-2 mt-1">{children}</div>;
}
function Chip({ children, onClick, muted }) {
  return (
    <button onClick={onClick} className="text-xs px-3 py-2 rounded-full font-display"
      style={muted ? { background: "transparent", color: COLORS.gray, border: `1px solid ${COLORS.line}` } : { background: COLORS.yellow, color: COLORS.black }}>
      {children}
    </button>
  );
}
function TextRow({ value, onChange, placeholder, onSubmit }) {
  return (
    <div className="flex gap-2 w-full mt-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 rounded-full text-sm"
        style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.white }}
        autoFocus
      />
      <button onClick={onSubmit} className="px-4 py-2 rounded-full font-display text-sm" style={{ background: COLORS.red, color: COLORS.white }}>➤</button>
    </div>
  );
}
