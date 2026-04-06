#!/usr/bin/env node

/**
 * SPEKTRUM MCP Server — HTTP/SSE Transport
 * Uses the shared server factory from index.ts.
 */

import http from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createSpektrumServer } from "./index.js";

const PORT = parseInt(process.env.PORT || "3011");

const sseTransports = new Map<string, SSEServerTransport>();

const httpServer = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // Health Check
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", server: "spektrum-mcp", version: "1.0.0" }));
    return;
  }

  // StreamableHTTP Endpoint — Stateless (für Smithery und moderne MCP-Clients)
  if (url.pathname === "/mcp") {
    if (req.method === "POST") {
      const body = await new Promise<string>((resolve) => {
        let data = "";
        req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        req.on("end", () => resolve(data));
      });
      const parsedBody = JSON.parse(body);

      // Stateless: jeder Request bekommt eigene Server-Instanz
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      const server = createSpektrumServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
      await transport.close();
      await server.close();
      return;
    }

    // GET/DELETE nicht unterstützt im Stateless-Modus
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed. Use POST." }));
    return;
  }

  // Legacy SSE Endpoint
  if (req.method === "GET" && url.pathname === "/sse") {
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    sseTransports.set(sessionId, transport);
    const server = createSpektrumServer();
    res.on("close", () => { sseTransports.delete(sessionId); });
    await server.connect(transport);
    return;
  }

  // Legacy Messages Endpoint
  if (req.method === "POST" && url.pathname === "/messages") {
    const sessionId = url.searchParams.get("sessionId");
    const transport = sessionId ? sseTransports.get(sessionId) : undefined;
    if (!transport) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unknown session" }));
      return;
    }
    await transport.handlePostMessage(req, res);
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

httpServer.listen(PORT, () => {
  console.log(`SPEKTRUM MCP Server läuft auf Port ${PORT}`);
});
