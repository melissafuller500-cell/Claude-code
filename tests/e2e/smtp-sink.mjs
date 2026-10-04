// Minimal SMTP server for tests: accepts every message and writes it to a folder.
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
const dir = process.argv[2] || './mail';
const port = Number(process.argv[3] || 2525);
mkdirSync(dir, { recursive: true });
let n = 0;
createServer((sock) => {
  let data = false;
  let buf = '';
  let msg = '';
  const send = (s) => sock.write(s + '\r\n');
  send('220 sink ESMTP');
  sock.on('data', (chunk) => {
    buf += chunk.toString('utf8');
    let i;
    while ((i = buf.indexOf('\r\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 2);
      if (data) {
        if (line === '.') {
          data = false;
          writeFileSync(`${dir}/${Date.now()}-${++n}.eml`, msg);
          msg = '';
          send('250 OK queued');
        } else msg += line.replace(/^\.\./, '.') + '\n';
        continue;
      }
      const cmd = line.slice(0, 4).toUpperCase();
      if (cmd === 'EHLO') { send('250-sink'); send('250-AUTH PLAIN LOGIN'); send('250 OK'); }
      else if (cmd === 'HELO') send('250 OK');
      else if (cmd === 'AUTH') {
        if (/PLAIN \S+/i.test(line)) send('235 OK');
        else if (/LOGIN/i.test(line)) { send('334 VXNlcm5hbWU6'); sock.once('data', () => { send('334 UGFzc3dvcmQ6'); sock.once('data', () => send('235 OK')); }); buf = ''; }
        else send('334 ');
      }
      else if (cmd === 'DATA') { data = true; send('354 End with .'); }
      else if (cmd === 'QUIT') { send('221 Bye'); sock.end(); }
      else if (line.trim() === '') continue;
      else send('250 OK');
    }
  });
}).listen(port, '127.0.0.1', () => console.log(`smtp sink on ${port} -> ${dir}`));
