#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AgentCommandClient } from "./client.js";
import * as tools from "./tools.js";
// ─── Config from env ─────────────────────────────────────────────────────────
const API_BASE_URL = process.env.ACC_API_BASE_URL ?? "https://echabeoiglitgjcgxkbj.supabase.co/functions/v1/agent-api";
const API_KEY = process.env.ACC_API_KEY;
const ORG_ID = process.env.ACC_ORG_ID ?? "eb4e3340-c1e8-4b4a-b4b7-f67f997d3d7c";
if (!API_KEY) {
    console.error("ERROR: ACC_API_KEY environment variable is required");
    process.exit(1);
}
const client = new AgentCommandClient({ apiBaseUrl: API_BASE_URL, apiKey: API_KEY, orgId: ORG_ID });
const server = new McpServer({ name: "agent-command-center", version: "1.0.0" });
// ─── Agent tools ─────────────────────────────────────────────────────────────
server.tool("register_agent", "Register yourself as an agent. Always call this first to get your agent_id. Returns existing record if already registered.", tools.RegisterAgentSchema.shape, async (input) => {
    const result = await tools.registerAgent(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("get_agents", "List all registered agents. Optionally filter by status (idle/working/offline).", tools.GetAgentsSchema.shape, async (input) => {
    const result = await tools.getAgents(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("update_agent_status", "Update your agent status to idle, working, or offline.", tools.UpdateAgentStatusSchema.shape, async (input) => {
    const result = await tools.updateAgentStatus(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
// ─── Project tools ───────────────────────────────────────────────────────────
server.tool("get_projects", "List all projects. Optionally filter by status (active/completed/archived).", tools.GetProjectsSchema.shape, async (input) => {
    const result = await tools.getProjects(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("create_project", "Create a new project container for tasks.", tools.CreateProjectSchema.shape, async (input) => {
    const result = await tools.createProject(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
// ─── Task tools ──────────────────────────────────────────────────────────────
server.tool("get_tasks", "Fetch tasks. Filter by status, project, agent, or unassigned=true to find available work.", tools.GetTasksSchema.shape, async (input) => {
    const result = await tools.getTasks(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("create_task", "Create a new task in a project. Set autonomous_level: auto (execute freely), supervised (log milestones), or human_required (must escalate).", tools.CreateTaskSchema.shape, async (input) => {
    const result = await tools.createTask(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("claim_task", "Claim a pending task — sets status to in_progress and assigns it to your agent_id.", tools.ClaimTaskSchema.shape, async (input) => {
    const result = await tools.claimTask(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("complete_task", "Mark a task completed. Include a result object with your output/summary.", tools.CompleteTaskSchema.shape, async (input) => {
    const result = await tools.completeTask(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("fail_task", "Mark a task as failed with an optional reason.", tools.FailTaskSchema.shape, async (input) => {
    const result = await tools.failTask(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
// ─── Escalation tools ────────────────────────────────────────────────────────
server.tool("create_escalation", "Escalate a task requiring human attention. Sets task status to awaiting_human automatically.", tools.CreateEscalationSchema.shape, async (input) => {
    const result = await tools.createEscalation(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("get_escalations", "Fetch escalations. Poll for resolved escalations to get human instructions via task.steps.", tools.GetEscalationsSchema.shape, async (input) => {
    const result = await tools.getEscalations(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
server.tool("resolve_escalation", "Resolve an escalation and optionally write human instructions back to task.steps, resuming the task.", tools.ResolveEscalationSchema.shape, async (input) => {
    const result = await tools.resolveEscalation(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
// ─── Activity log ────────────────────────────────────────────────────────────
server.tool("log_activity", "Log a significant action to the activity log. Use for milestones, decisions, and status updates.", tools.LogActivitySchema.shape, async (input) => {
    const result = await tools.logActivity(client, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
// ─── Start ───────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
