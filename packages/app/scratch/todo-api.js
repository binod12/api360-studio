import http from 'http';

const todos = [
  { id: 1, title: 'Learn Tauri & Rust', completed: false },
  { id: 2, title: 'Decouple API360 CLI Core', completed: true }
];

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. GET /todos
  if (pathname === '/todos' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(todos));
    return;
  }

  // 2. POST /todos
  if (pathname === '/todos' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const newTodo = JSON.parse(body);
        newTodo.id = todos.length + 1;
        todos.push(newTodo);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newTodo));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 3. GET /todo (Vulnerable query parameter handler)
  if (pathname === '/todo' && req.method === 'GET') {
    const idParam = urlObj.searchParams.get('id') || '';

    // Simulate SQL injection vulnerability signature check
    if (idParam.includes("'") || idParam.includes('"') || idParam.includes('--')) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end("SQL syntax error: unexpected symbol near WHERE id = " + idParam);
      return;
    }

    // Simulate XSS reflection signature check
    if (idParam.includes('<script>') || idParam.includes('onmouseover')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body>Todo not found for query: ${idParam}</body></html>`);
      return;
    }

    const id = parseInt(idParam, 10);
    const todo = todos.find(t => t.id === id);
    if (todo) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(todo));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Todo not found' }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Todo Mock API Server running at http://localhost:${PORT}`);
});
