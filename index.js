require("dotenv").config();
const axios = require("axios");
const express = require("express");

const aircall_id = process.env.AIRCALL_ID;
const aircall_secret = process.env.AIRCALL_SECRET;
const aircall_token = Buffer.from(`${aircall_id}:${aircall_secret}`).toString('base64');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4242;
const URL = process.env.URL;
const WEBHOOK_URL = `${URL}/webhook`;

const headers = {
  Authorization: `Basic ${aircall_token}`,
  "Content-Type": "application/json"
}

// Functions
async function deleteAllMyWebhooks()
{
  let url = "https://api.aircall.io/v1/webhooks";
  let deletedCount = 0;
  while (url)
  {
    const res = await axios.get(url, { headers });
    const webhooks = res.data.webhooks;
    const toDelete = webhooks.filter(hook => hook.url === WEBHOOK_URL);
    for (const hook of toDelete)
    {
      console.log(`🗑️ Deleting webhook: ${hook.webhook_id}`);
      await axios.delete(`https://api.aircall.io/v1/webhooks/${hook.webhook_id}`, { headers });
      ++deletedCount;
    }
    url = res.data.meta?.next_page_link || null;
  }
  console.log(`✅ Deleted ${deletedCount} duplicated webhooks.`);
}

// App endpoints
app.get("/active_webhooks", (req, res) => {
  axios.get("https://api.aircall.io/v1/webhooks", { headers }
  ).then(res => {
    console.log("🔍 Webhooks activos:");
    console.dir(res.data);
  });
});

app.get("/ping", async (req, res) => {
  try {
    const response = await axios.get("https://api.aircall.io/v1/users", {headers}
    );
    console.log("✅ Pong");
    res.json(response.data);
  } catch (error) {
    console.error("❌ Credentials error:", error.response?.status, error.message);
    console.error("Details:", error.response?.data);
  }
});

app.get("/last_call", async (req, res) => {
  try {
    const response = await axios.get("https://api.aircall.io/v1/calls", {headers}
    );
    console.log(response.data.calls[0]);
  } catch (error) {
    console.error("ERROR. Details:", error.response?.data);
  }
});

app.post("/webhook", (req, res) => {
  console.log("✅ Webhook received");
  console.dir(req.body);
  res.sendStatus(200);
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    // Delete old webhooks
    await deleteAllMyWebhooks();
    // Create new webhook
   const createRes = await axios.post("https://api.aircall.io/v1/webhooks", {
      url: WEBHOOK_URL,
      events: ["call.created", "call.answered", "call.ended"],
      active: true
    }, { headers });
    const newWebhook = createRes.data.webhook;
    console.log(`✅ Webhook created: ${newWebhook.id}`);
    console.log(`Available events: ${newWebhook.events.join(", ")}`);
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
});