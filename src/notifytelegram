// /api/notify-telegram.js
// Recibe el pedido ya confirmado (el pedido en sí ya se guardó en Supabase
// desde el navegador) y le avisa a Duber por Telegram. El token del bot
// vive SOLO acá, del lado del servidor — nunca en el código del navegador.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en las variables de entorno de Vercel");
    return res.status(500).json({ error: "Telegram no está configurado" });
  }

  try {
    const { numero, nombre, tipo, zona, costoDomicilio, direccion, pago, items, subtotal, total } = req.body;

    const formatCOP = (n) => "$" + Math.round(n || 0).toLocaleString("es-CO");

    let text = `🔥 *PEDIDO WEB #${numero}*\n\n`;
    text += `👤 Cliente: ${nombre || "-"}\n`;
    text += `📦 Tipo: ${tipo === "domicilio" ? "Domicilio 🛵" : "Recoger en el local 🏠"}\n`;
    if (zona) text += `🗺️ Zona: ${zona}\n`;
    if (direccion) text += `📍 ${direccion}\n`;
    text += `💳 Pago: ${pago || "-"}\n\n`;
    text += `*Pedido:*\n`;
    (items || []).forEach((i) => {
      text += `• ${i.cantidad} ${i.nombre}${i.esCombo ? " (combo)" : ""}`;
      if (i.nota) text += ` — _${i.nota}_`;
      text += `\n`;
    });
    if (subtotal != null) text += `\nSubtotal: ${formatCOP(subtotal)}`;
    if (costoDomicilio) text += `\nDomicilio: ${formatCOP(costoDomicilio)}`;
    text += `\n💰 *Total: ${formatCOP(total)}*`;

    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
      }),
    });

    const tgData = await tgRes.json();
    if (!tgData.ok) {
      console.error("Error de Telegram:", tgData);
      return res.status(502).json({ error: "Telegram rechazó el mensaje", detail: tgData });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error interno" });
  }
}
