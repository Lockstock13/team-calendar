import nodemailer from "nodemailer";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// ─── Transporter (lazy-init, server-side only) ────────────────────────────────

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("[email] SMTP credentials not configured — email disabled.");
    return null;
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
  });

  return _transporter;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return format(new Date(dateStr + "T00:00:00"), "EEEE, d MMMM yyyy", {
    locale: id,
  });
}

function typeLabel(task) {
  if (task.task_type === "libur_pengganti" || task.is_comday)
    return "🏖️ Libur Pengganti";
  return "📅 Regular";
}

// ─── HTML email template ──────────────────────────────────────────────────────

function buildHtml({ action, task, actorName, recipientName }) {
  const actionLabel = action === "created" ? "Jadwal Baru" : "Jadwal Diupdate";
  const dateRange =
    task.end_date && task.end_date !== task.start_date
      ? `${formatDate(task.start_date)} – ${formatDate(task.end_date)}`
      : formatDate(task.start_date);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${actionLabel}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">

        <!-- Header stripe -->
        <tr>
          <td style="background:#1e293b;padding:20px 28px;">
            <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;">
              Still Photo Team Calendar
            </p>
            <h1 style="margin:6px 0 0;color:#f8fafc;font-size:20px;font-weight:700;">
              📸 ${actionLabel}
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:24px 28px;">

            ${recipientName ? `<p style="margin:0 0 20px;color:#475569;font-size:14px;">Halo <strong>${recipientName}</strong>, kamu mendapat jadwal baru.</p>` : ""}

            <!-- Task card -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:20px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.06em;text-transform:uppercase;">
                    ${typeLabel(task)}
                  </p>
                  <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f172a;">
                    ${task.title}
                  </h2>

                  <table cellpadding="0" cellspacing="0" style="width:100%;">
                    <tr>
                      <td style="width:90px;padding:5px 0;font-size:13px;color:#64748b;vertical-align:top;">📅 Tanggal</td>
                      <td style="padding:5px 0;font-size:13px;color:#1e293b;font-weight:600;">${dateRange}</td>
                    </tr>
                    <tr>
                      <td style="width:90px;padding:5px 0;font-size:13px;color:#64748b;vertical-align:top;">👥 Tim</td>
                      <td style="padding:5px 0;font-size:13px;color:#1e293b;">${task.assigned_to_name || "-"}</td>
                    </tr>
                    ${
                      task.description
                        ? `<tr>
                      <td style="width:90px;padding:5px 0;font-size:13px;color:#64748b;vertical-align:top;">📝 Catatan</td>
                      <td style="padding:5px 0;font-size:13px;color:#1e293b;">${task.description}</td>
                    </tr>`
                        : ""
                    }
                    ${
                      actorName
                        ? `<tr>
                      <td style="width:90px;padding:5px 0;font-size:13px;color:#64748b;vertical-align:top;">✏️ Oleh</td>
                      <td style="padding:5px 0;font-size:13px;color:#1e293b;">${actorName}</td>
                    </tr>`
                        : ""
                    }
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || "/"}"
                    style="display:inline-block;padding:12px 28px;background:#1e293b;color:#f8fafc;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
                    Buka Kalender →
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #e2e8f0;padding:16px 28px;background:#f8fafc;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              Still Photo Team Calendar · Notifikasi otomatis
              ${action === "created" ? "— jadwal baru ditambahkan" : "— jadwal diperbarui"}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a task notification email.
 *
 * @param {object} opts
 * @param {string}   opts.to             - Recipient email address.
 * @param {string}   [opts.recipientName]- Recipient display name.
 * @param {object}   opts.task           - Task object.
 * @param {string}   [opts.actorName]    - Name of person who created/updated.
 * @param {"created"|"updated"} opts.action
 * @returns {Promise<boolean>} true if sent successfully
 */
export async function sendTaskEmail({ to, recipientName, task, actorName, action }) {
  const transporter = getTransporter();
  if (!transporter) return false;

  const actionLabel = action === "created" ? "Jadwal Baru" : "Jadwal Diupdate";
  const from = process.env.SMTP_FROM
    ? `"Still Photo Calendar" <${process.env.SMTP_FROM}>`
    : `"Still Photo Calendar" <${process.env.SMTP_USER}>`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `📸 ${actionLabel}: ${task.title}`,
      html: buildHtml({ action, task, actorName, recipientName }),
    });
    return true;
  } catch (err) {
    console.error("[email] sendMail error:", err.message);
    return false;
  }
}

/**
 * Send a daily reminder email listing today's tasks.
 *
 * @param {object} opts
 * @param {string}   opts.to
 * @param {string}   [opts.recipientName]
 * @param {object[]} opts.tasks           - Array of task objects for today.
 * @param {string}   opts.dateLabel       - Formatted date string for the header.
 * @returns {Promise<boolean>}
 */
export async function sendDailyReminderEmail({ to, recipientName, tasks, dateLabel }) {
  const transporter = getTransporter();
  if (!transporter) return false;

  const rows = tasks
    .map(
      (t) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;vertical-align:top;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">${t.title}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#64748b;">${t.assigned_to_name || ""}</p>
          ${t.description ? `<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">${t.description}</p>` : ""}
        </td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:#1e293b;padding:20px 28px;">
            <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;">Still Photo Team Calendar</p>
            <h1 style="margin:6px 0 0;color:#f8fafc;font-size:20px;font-weight:700;">☀️ Pengingat Jadwal Hari Ini</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            ${recipientName ? `<p style="margin:0 0 4px;color:#475569;font-size:14px;">Halo <strong>${recipientName}</strong>!</p>` : ""}
            <p style="margin:0 0 20px;color:#475569;font-size:14px;">Berikut jadwal untuk <strong>${dateLabel}</strong>:</p>
            <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
              <tr><td align="center">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "/"}"
                  style="display:inline-block;padding:12px 28px;background:#1e293b;color:#f8fafc;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
                  Buka Kalender →
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #e2e8f0;padding:16px 28px;background:#f8fafc;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              Dikirim otomatis setiap pagi jam 08.00 WIB · Still Photo Team Calendar
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const from = process.env.SMTP_FROM
    ? `"Still Photo Calendar" <${process.env.SMTP_FROM}>`
    : `"Still Photo Calendar" <${process.env.SMTP_USER}>`;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `☀️ Jadwal Hari Ini — ${dateLabel}`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[email] sendDailyReminderEmail error:", err.message);
    return false;
  }
}
