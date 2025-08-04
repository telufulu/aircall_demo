// import tools
require("dotenv").config();
const axios = require("axios");

// import env variables
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

// Functions
async function deleteWebhooks(webhook_url)
{
	let url = "https://api.aircall.io/v1/webhooks";
	let deletedCount = 0;
	while (url)
	{
		const res = await axios.get(url, { headers });
		const webhooks = res.data.webhooks;
		const toDelete = webhooks.filter(hook => hook.url === webhook_url);
		for (const hook of toDelete)
		{
			console.log(`🗑️ Deleting webhook: ${hook.webhook_id}`);
			await axios.delete(`https://api.aircall.io/v1/webhooks/${hook.webhook_id}`, { headers });
			++deletedCount;
		}
		url = res.data.meta?.next_page_link || null;
	}
	if (deletedCount)
		console.log(`✅ Deleted ${deletedCount} duplicated webhooks.`);
	else
		console.log(`No duplicated webhooks.`);
}

deleteWebhooks(WEBHOOK_URL);
