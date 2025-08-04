// import tools
require("dotenv").config();
const axios = require("axios");

// env variables
const aircall_id = process.env.AIRCALL_ID;
const aircall_secret = process.env.AIRCALL_SECRET;
const aircall_token = Buffer.from(`${aircall_id}:${aircall_secret}`).toString('base64');
const URL = process.env.URL;
const WEBHOOK_URL = `${URL}/webhook`;

// set headers
const headers = 
{
	Authorization: `Basic ${aircall_token}`,
	"Content-Type": "application/json"
}

async function createWebhook()
{
	try
	{
		let url = "https://api.aircall.io/v1/webhooks";
		while (url)
		{
			const res = await axios.get(url, { headers });
			const webhooks = res.data.webhooks;
			if (webhooks.some(h => h.url === WEBHOOK_URL))
			{
				console.log("✅ Webhook ya registrado. No se crea uno nuevo.");
			}
			url = res.data.meta?.next_page_link || null;
		}
		const response = await axios.post("https://api.aircall.io/v1/webhooks",
		{
			url: WEBHOOK_URL,
			events: ["call.created", "call.answered", "call.ended"],
			active: true
		}, { headers });
			const newWebhook = response.data.webhook;
			console.log(`✅ Webhook created: ${newWebhook.webhook_id}`);
			console.log(`Available events: ${newWebhook.events.join(", ")}`);
	}
	catch (error)
	{
		console.error("❌ Error:", err.response?.data || err.message);
	}
}

createWebhook();
