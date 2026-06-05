import { convertToModelMessages } from 'ai';

const messages = [
  {
    role: "user",
    content: "hello"
  }
];

const safeMessages = messages.map(m => {
  if (m.parts && m.parts.length > 0) return m;
  if (m.content) return { ...m, parts: [{ type: 'text', text: m.content }] };
  return { ...m, parts: [] };
});

try {
  const result = await convertToModelMessages(safeMessages);
  console.log("Result:", JSON.stringify(result, null, 2));
} catch (e) {
  console.error("Error:", e);
}
