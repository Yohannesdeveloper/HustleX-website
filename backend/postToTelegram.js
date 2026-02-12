const axios = require("axios");
const Company = require("./models/Company");

function normalizeChatId(chatId) {
  if (!chatId) return null;
  const trimmed = String(chatId).trim();
  if (!trimmed) return null;
  return trimmed;
}

function getTargetChatIds() {
  const primary = normalizeChatId(process.env.TELEGRAM_CHAT_ID);
  const extraRaw = process.env.TELEGRAM_CHAT_IDS; // comma-separated (optional)

  const extra = (extraRaw ? String(extraRaw).split(",") : [])
    .map((s) => normalizeChatId(s))
    .filter(Boolean);

  return Array.from(new Set([primary, ...extra].filter(Boolean)));
}

async function sendTelegramMessage({ botToken, chatId, message }) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  return axios.post(url, {
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

function escapeHtml(str) {
  if (str == null || str === "") return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Posts an approved job to Telegram chats with full job details.
 *
 * Configure:
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_CHAT_ID (channel username like @YourChannel OR numeric chat id)
 * - TELEGRAM_CHAT_IDS (optional, comma-separated additional chat ids/usernames)
 * - CLIENT_URL (optional, e.g. https://www.hustlex.com for job links)
 */
async function postJobToTelegram(job) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = getTargetChatIds();

  if (!botToken) {
    console.warn("Telegram: TELEGRAM_BOT_TOKEN not set; skipping post.");
    return;
  }

  if (chatIds.length === 0) {
    console.warn("Telegram: TELEGRAM_CHAT_ID not set; skipping post.");
    return;
  }

  const baseUrl = (process.env.CLIENT_URL || process.env.FRONTEND_URL || "https://www.hustlex.com").replace(/\/$/, "");
  const jobLink = `${baseUrl}/job-details/${job?._id}`;

  // Check if company has valid tax ID
  let hasValidTaxId = false;
  try {
    const company = await Company.findOne({ userId: job?.postedBy });
    hasValidTaxId = !!(company?.taxId && String(company.taxId).trim());
  } catch (err) {
    console.warn("Telegram: could not check company taxId:", err?.message);
  }

  const taxBadge = hasValidTaxId ? " ✅ (Verified Tax ID)" : "";

  const descPreview = job?.description
    ? String(job.description).replace(/\s+/g, " ").trim().slice(0, 300) + (job.description.length > 300 ? "…" : "")
    : "";

  const lines = [
    `💼 <b>Job Title:</b> ${escapeHtml(job?.title || "Not specified")}${taxBadge}`,
    "",
    `📌 <b>Job Type:</b> ${escapeHtml(job?.jobType || "Not specified")}`,
    "",
    `🏭 <b>Job Sector:</b> ${escapeHtml(job?.jobSector || "Not specified")}`,
    "",
    "📝 <b>Description in short...</b>",
    "",
    descPreview ? escapeHtml(descPreview) : "Not specified",
    "",
    `📍 <b>Work Location:</b> ${escapeHtml(job?.city || "Not specified")}`,
    "",
    `💰 <b>Budget:</b> ${escapeHtml(job?.budget || "Not specified")}`,
    "",
    `🔗 <b>Apply:</b> <a href="${jobLink}">${jobLink}</a>`,
    job?.jobLink ? `🔗 <b>External Link:</b> <a href="${job.jobLink}">${job.jobLink}</a>` : null,
    "",
    "—",
    '<a href="https://www.hustleX.com">www.hustleX.com</a> | <a href="https://t.me/HustleXet">@HustleXet</a> | <a href="https://t.me/HustleXsupport">@HustleXsupport</a> | <a href="https://t.me/HustleXet_bot">@HustleXet_bot</a>',
  ].flat().filter((x) => x != null);

  const message = lines.join("\n");

  const results = await Promise.allSettled(
    chatIds.map((chatId) => sendTelegramMessage({ botToken, chatId, message }))
  );

  const okCount = results.filter((r) => r.status === "fulfilled").length;
  const failCount = results.length - okCount;

  if (okCount > 0) {
    console.log(`Telegram: posted job to ${okCount} chat(s).`);
  }
  if (failCount > 0) {
    const firstErr = results.find((r) => r.status === "rejected")?.reason;
    console.error(
      "Telegram: failed to post to some chats.",
      firstErr?.response?.data || firstErr?.message || firstErr
    );
  }
}

module.exports = postJobToTelegram;
