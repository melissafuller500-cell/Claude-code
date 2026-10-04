// Checks the chat endpoint's request to the Claude API using a local mock server.
//   node tests/e2e/chat-mock.mjs   (after npm run build)
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

let captured;
const mock = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    captured = { url: req.url, headers: req.headers, body: JSON.parse(body) };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      id: 'msg_test', type: 'message', role: 'assistant', model: captured.body.model, stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'At 10 the [Cabin Air Filter, Activated Carbon](/parts/cabin-air-filters/x/) is $5.90 each.' }],
      usage: { input_tokens: 10, output_tokens: 10 },
    }));
  });
}).listen(4499, '127.0.0.1');

const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: '4398', HOST: '127.0.0.1', ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_BASE_URL: 'http://127.0.0.1:4499', ORDER_LOG_DIR: '/tmp/bs-chat-orders' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((r) => server.stdout.on('data', (d) => /listening/.test(String(d)) && r()));

try {
  const res = await fetch('http://127.0.0.1:4398/api/chat/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'What is the price of BS-CAF-0012 at quantity 10?' }] }),
  });
  const out = await res.json();
  assert.equal(res.status, 200);
  assert.match(out.reply, /\$5\.90/);
  const b = captured.body;
  assert.equal(b.model, 'claude-opus-5-5');
  assert.equal(b.fallbacks, 'default');
  assert.match(captured.headers['anthropic-beta'], /server-side-fallback-2026-07-01/);
  assert.equal(b.output_config.effort, 'low');
  assert.match(b.system, /I can't confirm that from our catalog/);
  assert.match(b.system, /Never give repair/);
  const userText = b.messages.at(-1).content;
  assert.match(userText, /SKU BS-CAF-0012 \| Cabin Air Filter, Activated Carbon/);
  assert.match(userText, /10-49: \$5\.90/);
  assert.ok(!/BS-BRK-0230/.test(userText), 'unrelated products are not sent');
  console.log('ok - chat request carries the matching catalog rows, rules, model, and fallbacks; reply parsed');
} finally {
  server.kill();
  mock.close();
}
