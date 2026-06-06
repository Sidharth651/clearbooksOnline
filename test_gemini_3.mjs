import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

async function main() {
  try {
    console.log('Sending a test prompt to gemini-3.0-flash...');
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: 'Hello! Please reply with exactly: "Hello from Gemini 3!"',
    });
    console.log('\n--- SUCCESS! AI REPLIED ---');
    console.log(result.text);
    console.log('---------------------------');
  } catch (err) {
    console.log('\n--- ERROR OCCURRED ---');
    console.error(err.message);
    if (err.message.includes('403') || err.message.includes('key')) {
      console.log('\nLooks like the API key is missing or invalid.');
    }
  }
}

main();
