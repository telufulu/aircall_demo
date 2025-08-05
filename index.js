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
async function newNotionPage(callData)
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
				"Call ID": { number: callData.id },
				"Name": { title: [{ text: { content: callData.customer_name }}]},
				"Customer phone": { rich_text: [{ text: { content: callData.customer_phone }}]},
				"Mood": { select: { name: callData.mood || "unknown" }},
				"Employee": { rich_text: [{ text: { content: callData.assigned_to }}]},
				"Summary": { rich_text: [{ text: { content: callData.summary }}]},
				"Start-End": { date: { start: callData.start_at, end: callData.end_at }}
			}
		});
	}
    catch (error)
    {
        console.error(`❌ Error: call number ${callData.id} failed`);
        console.dir(error.body || error.message);
    }
}

async function ai_data(callId)
{
	try
	{
		const response = await axios.get(`https://api.aircall.io/v1/calls/${callId}/ai`, { headers });
		const ai = response.data.ai;
		const customer = ai.speakers.find(s => s.type === "customer");
		return {
			summary: ai.summary.text,
			mood: customer.mood
		};
	}
	catch (error)
	{
		console.error(`❌ Error fetching AI data for call ${callId}`);
		console.dir(error.response?.data || error.message);
		return {
			summary: "No summary available",
			mood: "unknown"
		};
	}
}

// Start the server
app.post("/webhook", async (req, res) =>
{
	console.log(`\t🎟️ Webhook received`);
	const callData = req.body.data;
	if (callData.duration > 60)
	{
		aiCallData = await ai_data(callData.id);
	}
	const fCallData = 
	{
		id: callData.id,
		start_at: new Date(callData.started_at * 1000).toISOString(),
		end_at: new Date(callData.ended_at * 1000).toISOString(),
		customer_phone: callData.contact.phone_numbers[0].value,
		customer_name: `${callData.contact.first_name} ${callData.contact.last_name}`,
		assigned_to: `${callData.number.name} (${callData.number.e164_digits})`,
		summary: aiCallData.summary,
		customer_mood: aiCallData.mood
	}	
	await newNotionPage(fCallData);
});

app.listen(PORT, async () =>
{
	console.log(`\t✅ Server running on port ${PORT} ✅`);
	console.log(`\x1b[90mMake sure you have an active webhook. If not, run 'node scripts/createWebhook'\x1b[0m`);
});
