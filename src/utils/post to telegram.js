import axios from "axios";

// Access environment variables using import.meta.env for Vite
const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const channelId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

function escapeHtml(str) {
  if (str == null || str === "") return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function postJobToTelegram(job) {
  if (!job.approved) {
    console.warn("Skipping Telegram post: job not approved.");
    return;
  }

  const message = `🚀 <b>New Job Posted!</b>
💼 <b>Title:</b> ${escapeHtml(job.title)}
🏢 <b>Company:</b> ${escapeHtml(job.company || "Not specified")}
📍 <b>Location:</b> ${escapeHtml(job.workLocation || "Remote")}
💰 <b>Budget:</b> ${escapeHtml(job.budget || "Not specified")}`;

  const jobLink = `${window.location.origin}/job-details/${job._id}`;

  const reply_markup = {
    inline_keyboard: [
      [
        {
          text: " Apply Now",
          url: jobLink,
        },
      ],
    ],
  };

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: channelId,
      text: message,
      parse_mode: "HTML",
      reply_markup: reply_markup,
    });
    console.log("✅ Approved job posted to Telegram!");
  } catch (err) {
    console.error("❌ Telegram posting error:", err.response?.data || err.message);
  }
}
