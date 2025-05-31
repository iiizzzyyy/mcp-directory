// Minimal fallback handler for Next.js pages
exports.handler = async (event, context) => {
  const path = event.path;
  console.log(`Fallback handler for: ${path}`);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8'
    },
    body: `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MCP Directory</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.5;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
          }
          header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            border-bottom: 1px solid #eaeaea;
            padding-bottom: 20px;
          }
          h1 {
            font-size: 28px;
            font-weight: 600;
            margin: 0;
          }
          nav ul {
            display: flex;
            list-style: none;
            margin: 0;
            padding: 0;
          }
          nav li {
            margin-left: 20px;
          }
          nav a {
            color: #0070f3;
            text-decoration: none;
          }
          nav a:hover {
            text-decoration: underline;
          }
          .hero {
            text-align: center;
            padding: 60px 0;
          }
          .hero h2 {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 16px;
          }
          .hero p {
            font-size: 20px;
            color: #666;
            max-width: 600px;
            margin: 0 auto 30px;
          }
          .button {
            display: inline-block;
            background-color: #0070f3;
            color: white;
            font-weight: 500;
            padding: 12px 24px;
            border-radius: 4px;
            text-decoration: none;
          }
          .button:hover {
            background-color: #0061d5;
          }
          .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin: 60px 0;
          }
          .feature {
            background: white;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .feature h3 {
            font-size: 20px;
            margin-top: 0;
          }
          footer {
            text-align: center;
            color: #666;
            border-top: 1px solid #eaeaea;
            padding-top: 20px;
            margin-top: 60px;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>MCP Directory</h1>
          <nav>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/discover">Discover</a></li>
              <li><a href="/docs">Documentation</a></li>
            </ul>
          </nav>
        </header>
        
        <main>
          <section class="hero">
            <h2>Model Context Protocol Directory</h2>
            <p>Discover, integrate, and monitor MCP servers to enhance your AI applications</p>
            <a href="/discover" class="button">Browse Servers</a>
          </section>
          
          <section class="features">
            <div class="feature">
              <h3>Integration Ready</h3>
              <p>Find servers with plug-and-play integration for your development environment.</p>
            </div>
            <div class="feature">
              <h3>Health Monitoring</h3>
              <p>Track server status and performance metrics in real-time.</p>
            </div>
            <div class="feature">
              <h3>Comprehensive Documentation</h3>
              <p>Access detailed API documentation for all listed servers.</p>
            </div>
          </section>
        </main>
        
        <footer>
          <p>&copy; ${new Date().getFullYear()} MCP Directory - All rights reserved</p>
        </footer>
      </body>
    </html>
    `
  };
};
