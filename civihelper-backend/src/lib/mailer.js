// src/lib/mailer.js
import nodemailer from "nodemailer";

/**
 * Crea un transport configurado con variables de entorno.
 */
export function createTransport() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("Config SMTP incompleta: revisa SMTP_HOST/USER/PASS");
  }

  const port = Number(SMTP_PORT || 587);
  const secure =
    String(SMTP_SECURE).toLowerCase() === "true" || port === 465;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Envía un correo de restablecimiento de contraseña.
 * @param {Object} opts
 * @param {string} opts.to - correo destino
 * @param {string} opts.resetUrl - enlace de reseteo
 */
export async function sendPasswordResetEmail({ to, resetUrl }) {
  const transporter = createTransport();

  const subject = "Restablecer contraseña - CiviHelper";
  const text = `
¿Necesitas restablecer tu contraseña?

Usa el siguiente enlace dentro de los próximos 15 minutos:
${resetUrl}

Si no solicitaste esto, ignora este mensaje.
`;

  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:560px;margin:auto;padding:20px">
      <h2>¿Necesitas restablecer tu contraseña?</h2>
      <p>Haz clic en el siguiente botón o usa el enlace dentro de los próximos <b>15 minutos</b>.</p>
      <p style="margin:24px 0">
        <a href="${resetUrl}" style="background:#1E88E5;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">
          Restablecer contraseña
        </a>
      </p>
      <p style="font-size:12px;color:#64748b">Si no solicitaste esto, ignora este mensaje.</p>
      <p style="font-size:12px;color:#94a3b8;word-break:break-all">${resetUrl}</p>
    </div>
  `;

  const from = process.env.SMTP_FROM || `"CiviHelper" <${process.env.SMTP_USER}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("[mailer] Password reset enviado:", info.messageId);
    }
    return info;
  } catch (err) {
    console.error("[mailer] Error enviando correo:", err);
    throw err;
  }
}
