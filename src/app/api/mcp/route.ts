import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getMCPToolsConfig } from "@/lib/mcp-tools";
import { createClient } from '@/lib/supabase/server';
import { zodToJsonSchema } from "zod-to-json-schema";
import { NextRequest } from "next/server";

// We store the transport globally so it persists across GET / POST requests
// in development mode.
const globalForMCP = globalThis as unknown as {
  mcpTransport?: WebStandardStreamableHTTPServerTransport;
};

async function getTransport() {
  if (globalForMCP.mcpTransport) {
    return globalForMCP.mcpTransport;
  }

  const server = new Server({ name: "quickinvoice-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // We instantiate tools using a dummy supabase client just to get their schema
    // since the execute function isn't called here.
    const toolsConfig = getMCPToolsConfig(null, '');
    const tools = Object.entries(toolsConfig).map(([name, config]) => {
      return {
        name,
        description: config.description,
        inputSchema: zodToJsonSchema(config.inputSchema),
      };
    });

    return { tools: tools as any };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const supabase = await createClient(); // Authenticated Supabase Client using headers
    let companyId = (request.params.arguments as any)?.companyId || '';
    
    if (!companyId) {
      const { data: companies } = await supabase.from('companies').select('id').limit(1);
      if (companies && companies.length > 0) {
        companyId = companies[0].id;
      }
    }

    const toolsConfig = getMCPToolsConfig(supabase, companyId);
    
    const toolName = request.params.name;
    const tool = (toolsConfig as any)[toolName];

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    try {
      const args = request.params.arguments || {};
      const result = await tool.execute(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });
  
  await server.connect(transport);
  globalForMCP.mcpTransport = transport;
  return transport;
}

export async function GET(req: NextRequest) {
  const transport = await getTransport();
  return transport.handleRequest(req);
}

export async function POST(req: NextRequest) {
  const transport = await getTransport();
  return transport.handleRequest(req);
}
