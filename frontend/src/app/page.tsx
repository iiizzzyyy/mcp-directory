import Link from 'next/link'

export default function Home() {
  return (
    <div className="py-10">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-center">MCP Directory</h1>
        <p className="text-center text-gray-600 mt-2">
          Discover and explore Model Context Protocol servers
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* This would typically be populated from the database */}
        <Link href="/servers/pulse-auth-mcp" className="block">
          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold">Pulse Auth MCP</h2>
            <p className="text-gray-600 mt-2">Authentication and authorization server for the Model Context Protocol.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">auth</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">security</span>
            </div>
          </div>
        </Link>

        <Link href="/servers/pulse-vector-db" className="block">
          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold">Pulse Vector DB</h2>
            <p className="text-gray-600 mt-2">Vector database server for Model Context Protocol applications with semantic search capabilities.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">vector-db</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">search</span>
            </div>
          </div>
        </Link>
        
        <Link href="/servers/pulse-speech-mcp" className="block">
          <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold">Pulse Speech MCP</h2>
            <p className="text-gray-600 mt-2">Speech recognition and synthesis server for the Model Context Protocol.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">speech</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">audio</span>
            </div>
          </div>
        </Link>
      </div>
      
      <div className="mt-12 text-center">
        <Link href="/servers" className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          View All Servers
        </Link>
      </div>
    </div>
  )
}
