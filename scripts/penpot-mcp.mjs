// Local Penpot MCP client. Uses the official server at localhost:4401.
// No credentials, browser internals or persistent client configuration required.
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const endpoint = process.env.PENPOT_MCP_URL ?? 'http://localhost:4401/mcp';
let session;
let requestId = 1;
async function request(method, params, notification = false) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(session ? { 'mcp-session-id': session } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', ...(notification ? {} : { id: requestId++ }), method, params }),
  });
  session = response.headers.get('mcp-session-id') ?? session;
  if (notification) return;
  const text = await response.text();
  const messages = text.startsWith('event:') || text.startsWith('data:') || text.startsWith(':')
    ? text.split('\n').filter((line) => line.startsWith('data:')).map((line) => JSON.parse(line.slice(5)))
    : [JSON.parse(text)];
  const result = messages.find((message) => message.id !== undefined);
  if (result?.error) throw new Error(JSON.stringify(result.error));
  return result?.result;
}

export async function connect() {
  await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'qettyq-design-local', version: '1.0.0' } });
  await request('notifications/initialized', {}, true);
}
export async function callTool(name, args = {}) {
  const result = await request('tools/call', { name, arguments: args });
  if (result?.isError) throw new Error(JSON.stringify(result));
  return result;
}
export async function execute(code) {
  const result = await callTool('execute_code', { code });
  const raw = result.content.find((item) => item.type === 'text')?.text;
  if (!raw?.trim().startsWith('{')) throw new Error(raw ?? 'Penpot returned no text result');
  const content = JSON.parse(raw);
  return content.result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await connect();
  const [command = 'list', tool, file] = process.argv.slice(2);
  const result = command === 'list'
    ? await request('tools/list', {})
    : await callTool(tool, file ? JSON.parse(await fs.readFile(file, 'utf8')) : {});
  if (process.env.PENPOT_MCP_OUTPUT) await fs.writeFile(process.env.PENPOT_MCP_OUTPUT, JSON.stringify(result, null, 2));
  else console.log(JSON.stringify(result, null, 2));
}
