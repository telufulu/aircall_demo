// import tools
require("dotenv").config();
const axios = require("axios");
const express = require("express");
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_TOKEN });

// import env variables
const aircall_id = process.env.AIRCALL_ID;
const aircall_secret = process.env.AIRCALL_SECRET;
const aircall_token = Buffer.from(`${aircall_id}:${aircall_secret}`).toString('base64');
const notion_token = process.env.NOTION_TOKEN;
const notion_id = process.env.NOTION_DATABASE_ID;

// init app
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4242;
const URL = process.env.URL;
const WEBHOOK_URL = `${URL}/webhook`;

// set headers
const headers = 
{
	Authorization: `Basic ${aircall_token}`,
	"Content-Type": "application/json"
}

// Functions
async function newPage(callData)
{
	try
	{
		const duration = callData.ended_at - callData.started_at;
		await notion.pages.create(
		{
			parent:
			{	
				database_id: notion_id
			},
			properties:
			{
				"Call ID": { number: callData.id},
				//"Started": { date: callData.start},
				//"End": { date: callData.end}
			}
		});
	}
	catch (error)
	{
		console.error(`❌ Error: call number ${callData.id} failed`);
		console.dir(error.body || error.message);
	}
}

// Start the server
app.post("/webhook", async (req, res) =>
{
	const callData = req.body.data;
	const fCallData = 
	{
		id: callData.call_id,
		start_at: new Date(callData.started_at * 1000).toISOString(),
		end_at: new Date(callData.ended_at * 1000).toISOString()
	}	
	console.log(`\t🎟️ Webhook received`);
	await newPage(fCallData);
});

app.listen(PORT, async () =>
{
	console.log(`\t✅ Server running on port ${PORT} ✅`);
	console.log(`\x1b[90mMake sure you have an active webhook. If not, run 'node scripts/createWebhook'\x1b[0m`);
});
