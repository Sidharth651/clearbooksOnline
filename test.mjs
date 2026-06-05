import fs from 'fs';

async function test() {
  const payload = fs.readFileSync('payload.json', 'utf-8');
  
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

test();
