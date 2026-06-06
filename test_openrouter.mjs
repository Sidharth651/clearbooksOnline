import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[match[1].trim()] = value;
    }
  });
}

const apiKey = process.env.OPENROUTER_API_KEY;

async function testOpenRouter() {
  console.log("Testing OpenRouter API key...");
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000", // Required by OpenRouter
        "X-Title": "QuickInvoice", // Optional but good practice
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free", 
        messages: [{ role: "user", content: "Reply exactly with 'Hello from OpenRouter!'" }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.log("\n--- ERROR ---");
      console.log(data.error?.message || JSON.stringify(data));
      return;
    }

    console.log("\n--- SUCCESS! API REPLIED ---");
    console.log(data.choices[0].message.content);
    console.log("----------------------------");
  } catch (err) {
    console.error("Network error:", err.message);
  }
}

testOpenRouter();
