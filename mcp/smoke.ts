import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "pnpm",
  args: ["--silent", "mcp:blog"],
});

const client = new Client({
  name: "jinpan-blog-smoke",
  version: "0.1.0",
});

await client.connect(transport);

const tools = await client.listTools();
const resources = await client.listResources();

if (!tools.tools.some(tool => tool.name === "list_posts")) {
  throw new Error("list_posts tool was not registered");
}

if (!resources.resources.some(resource => resource.uri === "posts://all")) {
  throw new Error("posts://all resource was not registered");
}

await client.close();
process.stdout.write("MCP smoke test passed\n");
