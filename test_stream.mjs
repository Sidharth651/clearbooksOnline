import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

const result = streamText({
  model: google('gemini-2.5-flash'),
  messages: [{ role: 'user', content: 'test' }]
});

console.log(Object.keys(result));
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(result)));
