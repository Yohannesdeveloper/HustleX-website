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

async function sendTelegramMessage({ botToken, chatId, message, reply_markup }) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  return axios.post(url, {
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: false, // Changed to false to allow preview if it helps conversion
    reply_markup: reply_markup,
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
 */
async function postJobToTelegram(job) {
  console.log("Telegram: Starting post process for job:", job?._id || "unknown");

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = getTargetChatIds();

  if (!botToken) {
    console.warn("Telegram: TELEGRAM_BOT_TOKEN not set; skipping post.");
    return;
  }

  if (chatIds.length === 0) {
    console.warn("Telegram: No valid chat IDs found; skipping post.");
    return;
  }

  let baseUrl = (process.env.CLIENT_URL || process.env.FRONTEND_URL || "https://www.hustlex.com").replace(/\/$/, "");

  // Telegram API rejects 'localhost' URLs in inline keyboard buttons.
  // If the URL is localhost, we fallback to the production domain for the Telegram button 
  // so the message can be delivered successfully.
  if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
    baseUrl = "https://www.hustlex.com";
  }

  const jobId = job?._id ? String(job._id).match(/[0-9a-fA-F]{24}/)?.[0] || String(job._id) : "unknown";
  const jobLink = `${baseUrl}/job-details/${jobId}`;

  // Debug info
  console.log(`Telegram: Posting to ${chatIds.length} chats. JobLink: ${jobLink}`);

  // Check if company has valid tax ID
  let hasValidTaxId = false;
  try {
    if (job?.postedBy) {
      const company = await Company.findOne({ userId: job.postedBy });
      hasValidTaxId = !!(company?.taxId && String(company.taxId).trim());
    }
  } catch (err) {
    console.warn("Telegram: could not check company taxId:", err?.message);
  }

  const taxBadge = hasValidTaxId ? " ✅ (Verified Tax ID)" : "";

  const descPreview = job?.description
    ? String(job.description).replace(/\s+/g, " ").trim().slice(0, 300) + (job.description.length > 300 ? "…" : "")
    : "";

  const lines = [
    `🚀 <b>New Job Approved!</b>`,
    "",
    `💼 <b>Job Title:</b> ${escapeHtml(job?.title || "Not specified")}${taxBadge}`,
    "",
    `📌 <b>Job Type:</b> ${escapeHtml(job?.jobType || "Not specified")}`,
    "",
    `🏭 <b>Job Sector:</b> ${escapeHtml(job?.jobSector || "Not specified")}`,
    "",
    "📝 <b>Short Description:</b>",
    "",
    descPreview ? escapeHtml(descPreview) : "Not specified",
    "",
    `📍 <b>Location:</b> ${escapeHtml(job?.city || job?.workLocation || "Not specified")}`,
    "",
    `💰 <b>Budget:</b> ${escapeHtml(job?.budget || "Not specified")}`,
    "",
    job?.jobLink ? `🔗 <b>External Link:</b> <a href="${escapeHtml(job.jobLink)}">${escapeHtml(job.jobLink)}</a>` : null,
    "",
    "—",
    '<a href="https://www.hustleX.com">www.hustleX.com</a> | <a href="https://t.me/HustleXet">@HustleXet</a> | <a href="https://t.me/HustleXsupport">@HustleXsupport</a> | <a href="https://t.me/HustleXet_bot">@HustleXet_bot</a>',
  ].filter((x) => x !== null);

  const message = lines.join("\n");

  const reply_markup = {
    inline_keyboard: [
      [
        {
          text: "🚀 Apply Now",
          url: jobLink
        }
      ]
    ]
  };

  try {
    const results = await Promise.allSettled(
      chatIds.map((chatId) => sendTelegramMessage({ botToken, chatId, message, reply_markup }))
    );

    const okCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.length - okCount;

    if (okCount > 0) {
      console.log(`Telegram: Successfully posted job ${job?._id} to ${okCount} chat(s).`);
    }
    if (failCount > 0) {
      const firstErr = results.find((r) => r.status === "rejected")?.reason;
      console.error(
        `Telegram: Failed to post job ${job?._id} to ${failCount} chat(s).`,
        firstErr?.response?.data || firstErr?.message || firstErr
      );
    }
    return okCount > 0;
  } catch (err) {
    console.error("Telegram: Unexpected error in posting process:", err);
    return false;
  }
}

module.exports = postJobToTelegram;

