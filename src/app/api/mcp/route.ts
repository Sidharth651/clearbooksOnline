import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getMCPToolsConfig } from "@/lib/mcp-tools";
import { createClient as createCookieClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { zodToJsonSchema } from "zod-to-json-schema";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Validates the MCP_API_KEY for external clients (Claude Desktop, Cursor, Claude.ai web, etc.)
 * Accepts the key via:
 *   - Authorization header: `Authorization: Bearer <key>`  (Claude Desktop)
 *   - URL query parameter:  `?key=<key>`                   (Claude.ai web UI)
 */
function isValidApiKey(req: NextRequest): boolean {
  const mcpApiKey = process.env.MCP_API_KEY;
  if (!mcpApiKey) return false;

  // 1. Check Authorization header (Claude Desktop / Cursor)
  const authHeader = req.headers.get('authorization') ?? '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (headerToken === mcpApiKey) return true;

  // 2. Check ?key= query param (Claude.ai web UI — doesn't support custom headers)
  const urlKey = new URL(req.url).searchParams.get('key') ?? '';
  return urlKey === mcpApiKey;
}

/**
 * Builds an authenticated Supabase client for an external MCP request.
 * Accepts the user's Supabase access token via:
 *   - X-Supabase-Token header  (Claude Desktop)
 *   - ?token= query param      (Claude.ai web UI)
 */
function createExternalSupabaseClient(req: NextRequest) {
  const url = new URL(req.url);
  const userToken =
    req.headers.get('x-supabase-token') ??
    url.searchParams.get('token') ??
    '';

  if (!userToken) {
    throw new Error(
      'Missing Supabase token. Provide it via the X-Supabase-Token header or ?token= query param.'
    );
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${userToken}` },
      },
    }
  );
}


// ---------------------------------------------------------------------------
// MCP server factory — created fresh per request (serverless-safe)
// ---------------------------------------------------------------------------

async function createMCPServer(req: NextRequest) {
  // Determine auth mode: API key = external client, otherwise = web app cookie
  const external = isValidApiKey(req);

  const server = new Server(
    { name: 'quickinvoice-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const toolsConfig = getMCPToolsConfig(null, '');
    const tools = Object.entries(toolsConfig).map(([name, config]) => ({
      name,
      description: config.description,
      inputSchema: zodToJsonSchema(config.inputSchema),
    }));
    return { tools: tools as any };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // Build the right Supabase client depending on auth mode
    const supabase = external
      ? createExternalSupabaseClient(req)
      : await createCookieClient();

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
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${error.message}` }],
      };
    }
  });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  await server.connect(transport);
  return transport;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // Reject requests that have an MCP_API_KEY set but supply the wrong token
  if (process.env.MCP_API_KEY && !isValidApiKey(req)) {
    // Allow cookie-auth (web app) to pass through without the API key
    // Only block if the caller supplied a wrong Bearer token
    const authHeader = req.headers.get('authorization') ?? '';
    if (authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized: invalid MCP API key', { status: 401 });
    }
  }
  const transport = await createMCPServer(req);
  return transport.handleRequest(req);
}

export async function POST(req: NextRequest) {
  if (process.env.MCP_API_KEY && !isValidApiKey(req)) {
    const authHeader = req.headers.get('authorization') ?? '';
    if (authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized: invalid MCP API key', { status: 401 });
    }
  }
  const transport = await createMCPServer(req);
  return transport.handleRequest(req);
}
