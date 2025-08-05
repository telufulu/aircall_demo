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
				"Duration": { number: callData.duration },
				"Name": { title: [{ text: { content: callData.customer_name }}]},
				"Customer phone": { rich_text: [{ text: { content: callData.customer_phone }}]},
				"Customer mood": { select: { name: callData.customer_mood || "unknown" }},
				"Employee": { rich_text: [{ text: { content: callData.assigned_to }}]},
				"Summary": { rich_text: [{ text: { content: callData.assigned_to }}]},
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
		const agent = ai.speakers.find(s => s.type === "agent");
		const customer = ai.speakers.find(s => s.type === "customer");
		return {
			summary: ai.summary?.text || "No summary available",
			transcription: ai.transcript?.text || "No transcript available",
			customer_mood: customer?.mood || null,
			agent_mood: agent?.mood || null
		};
	}
	catch (error)
	{
		console.error(`❌ Error fetching AI data for call ${callId}`);
		console.dir(error.response?.data || error.message);
	}
}

// Start the server
app.post("/webhook", async (req, res) =>
{
	const callData = req.body.data;
	const fCallData = 
	{
		id: callData.id,
		start_at: new Date(callData.started_at * 1000).toISOString(),
		end_at: new Date(callData.ended_at * 1000).toISOString(),
		duration: callData.duration,
		customer_phone: callData.contact.phone_numbers[0].value,
		customer_name: `${callData.contact.first_name} ${callData.contact.last_name}`,
		customer_mood: "negative",
		assigned_to: `${callData.number.name} (${callData.number.e164_digits})`
	}	
	console.log(`\t🎟️ Webhook received`);
	if (fCallData.duration > 60)
	{
		ai_data(fCallData.id);
		await newNotionPage(fCallData);
	}
});

app.listen(PORT, async () =>
{
	console.log(`\t✅ Server running on port ${PORT} ✅`);
	console.log(`\x1b[90mMake sure you have an active webhook. If not, run 'node scripts/createWebhook'\x1b[0m`);
});
