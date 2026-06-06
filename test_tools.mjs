import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, tool } from 'ai';
import { z } from 'zod';
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

(async () => {
  try {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    
    console.log('Testing openrouter with tools...');
    const result = await generateText({
      model: openrouter('openai/gpt-oss-120b:free'),
      messages: [{ role: 'user', content: 'What is 2+2?' }],
      tools: {
        calculate: tool({
          description: 'Calculate math expressions',
          parameters: z.object({ expression: z.string() }),
          execute: async ({ expression }) => {
            return eval(expression);
          }
        })
      }
    });
    console.log('SUCCESS:', result.text);
    console.log('Tool calls:', result.toolCalls);
  } catch (err) {
    console.error('ERROR:', err.message);
  }
})();
