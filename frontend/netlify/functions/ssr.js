// Simplified Netlify Function for basic SSR functionality
exports.handler = async (event, context) => {
  const { path: routePath } = event;
  
  console.log(`SSR request: ${routePath}`);
  
  try {
    // Return a simple HTML page with links to static builds
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
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 1200px;
              margin: 0 auto;
              padding: 1rem;
            }
            header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 2rem;
              padding-bottom: 1rem;
              border-bottom: 1px solid #eaeaea;
            }
            nav ul {
              display: flex;
              list-style: none;
              padding: 0;
            }
            nav li {
              margin-left: 1.5rem;
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
              padding: 3rem 0;
            }
            .hero h1 {
              font-size: 2.5rem;
              margin-bottom: 1rem;
            }
            .hero p {
              font-size: 1.25rem;
              color: #666;
              max-width: 800px;
              margin: 0 auto 2rem;
            }
            .button {
              display: inline-block;
              background-color: #0070f3;
              color: white;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              text-decoration: none;
              font-weight: 500;
            }
            .button:hover {
              background-color: #0060df;
            }
            .features {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
              gap: 2rem;
              margin: 3rem 0;
            }
            .feature {
              padding: 1.5rem;
              border-radius: 8px;
              border: 1px solid #eaeaea;
              background: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .feature h3 {
              margin-top: 0;
            }
            footer {
              text-align: center;
              margin-top: 3rem;
              padding-top: 1rem;
              border-top: 1px solid #eaeaea;
              color: #666;
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
              <h1>Model Context Protocol Directory</h1>
              <p>Discover, compare, and integrate MCP servers to enhance your AI applications</p>
              <a href="/discover" class="button">Browse Servers</a>
            </section>
            
            <section class="features">
              <div class="feature">
                <h3>Integration Ready</h3>
                <p>Find servers with plug-and-play integration for your development environment.</p>
              </div>
              <div class="feature">
                <h3>Performance Metrics</h3>
                <p>Compare server performance, latency, and reliability metrics.</p>
              </div>
              <div class="feature">
                <h3>Documentation</h3>
                <p>Access comprehensive API documentation for all listed servers.</p>
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
  } catch (error) {
    console.error('SSR handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      },
      body: `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error - MCP Directory</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 650px;
                margin: 0 auto;
                padding: 1rem;
              }
              h1 {
                color: #e53e3e;
                margin-top: 2rem;
              }
              a {
                display: inline-block;
                margin-top: 1.5rem;
                background-color: #3182ce;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 0.25rem;
                text-decoration: none;
              }
              a:hover {
                background-color: #2c5282;
              }
            </style>
          </head>
          <body>
            <h1>Server Error</h1>
            <p>Sorry, something went wrong on our end. Please try again later.</p>
            <a href="/">Return Home</a>
          </body>
        </html>
      `
    };
  }
}
