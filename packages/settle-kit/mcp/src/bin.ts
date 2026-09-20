#!/usr/bin/env bun
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { readConfig } from "./config.ts";
import { createSettleMcpServer } from "./create-server.ts";

const config = readConfig(process.env);
await config.getSigner();
serveStdio(() => createSettleMcpServer(config), { legacy: "reject" });
