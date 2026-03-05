import { z } from "zod";
// ─── Schemas ────────────────────────────────────────────────────────────────
export const RegisterAgentSchema = z.object({
    name: z.string().describe("Unique agent name"),
    agent_type: z.enum(["orchestrator", "worker", "specialist"]),
    capabilities: z.array(z.string()).optional().describe("e.g. ['coding','research']"),
});
export const GetAgentsSchema = z.object({
    status: z.enum(["idle", "working", "offline"]).optional(),
});
export const UpdateAgentStatusSchema = z.object({
    agent_id: z.string().describe("Agent UUID"),
    status: z.enum(["idle", "working", "offline"]),
});
export const GetProjectsSchema = z.object({
    status: z.enum(["active", "completed", "archived"]).optional(),
});
export const CreateProjectSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    created_by_agent_id: z.string().describe("Agent UUID"),
});
export const GetTasksSchema = z.object({
    status: z.enum(["pending", "in_progress", "awaiting_human", "completed", "failed"]).optional(),
    assigned_agent_id: z.string().optional().describe("Filter by assigned agent UUID"),
    project_id: z.string().optional(),
    unassigned: z.boolean().optional().describe("If true, only return unassigned tasks"),
});
export const CreateTaskSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    project_id: z.string().describe("Project UUID"),
    created_by_agent_id: z.string().describe("Agent UUID"),
    assigned_agent_id: z.string().optional(),
    autonomous_level: z.enum(["auto", "supervised", "human_required"]).default("auto"),
    priority: z.number().int().min(1).max(5).default(3),
});
export const ClaimTaskSchema = z.object({
    task_id: z.string().describe("Task UUID"),
    agent_id: z.string().describe("Agent UUID claiming this task"),
});
export const CompleteTaskSchema = z.object({
    task_id: z.string(),
    result: z.record(z.string(), z.unknown()).optional().describe("Output/summary as JSON"),
});
export const FailTaskSchema = z.object({
    task_id: z.string(),
    reason: z.string().optional(),
});
export const CreateEscalationSchema = z.object({
    task_id: z.string(),
    agent_id: z.string(),
    reason: z.string().describe("Why human attention is needed"),
});
export const GetEscalationsSchema = z.object({
    status: z.enum(["pending", "acknowledged", "resolved", "dismissed"]).optional(),
    task_id: z.string().optional(),
});
export const ResolveEscalationSchema = z.object({
    escalation_id: z.string(),
    steps: z.string().optional().describe("Human instructions written back to task.steps"),
    task_id: z.string().optional().describe("Required if providing steps"),
});
export const LogActivitySchema = z.object({
    agent_id: z.string(),
    action: z.string().describe("Short action verb, e.g. 'claimed_task'"),
    details: z.record(z.string(), z.unknown()).optional(),
    task_id: z.string().optional(),
    project_id: z.string().optional(),
});
// ─── Handlers ────────────────────────────────────────────────────────────────
export async function registerAgent(client, input) {
    // Check if already registered
    const existing = await client.get("agents", {
        "name": `eq.${input.name}`,
        "select": "id,name,status,agent_type,capabilities",
    });
    if (existing.length > 0) {
        return { already_registered: true, agent: existing[0] };
    }
    const agent = await client.post("agents", {
        name: input.name,
        agent_type: input.agent_type,
        status: "idle",
        capabilities: input.capabilities ?? [],
    });
    return { registered: true, agent };
}
export async function getAgents(client, input) {
    const query = { select: "id,name,status,agent_type,capabilities" };
    if (input.status)
        query["status"] = `eq.${input.status}`;
    return client.get("agents", query);
}
export async function updateAgentStatus(client, input) {
    return client.patch("agents", input.agent_id, { status: input.status });
}
export async function getProjects(client, input) {
    const query = { select: "id,name,status,description" };
    if (input.status)
        query["status"] = `eq.${input.status}`;
    return client.get("projects", query);
}
export async function createProject(client, input) {
    return client.post("projects", {
        name: input.name,
        description: input.description ?? "",
        status: "active",
        created_by_agent_id: input.created_by_agent_id,
    });
}
export async function getTasks(client, input) {
    const query = {
        select: "id,title,description,steps,status,autonomous_level,priority,assigned_agent_id,project_id,result,created_at",
        order: "priority.asc",
    };
    if (input.status)
        query["status"] = `eq.${input.status}`;
    if (input.project_id)
        query["project_id"] = `eq.${input.project_id}`;
    if (input.assigned_agent_id)
        query["assigned_agent_id"] = `eq.${input.assigned_agent_id}`;
    if (input.unassigned)
        query["assigned_agent_id"] = "is.null";
    return client.get("tasks", query);
}
export async function createTask(client, input) {
    return client.post("tasks", {
        title: input.title,
        description: input.description ?? "",
        project_id: input.project_id,
        created_by_agent_id: input.created_by_agent_id,
        assigned_agent_id: input.assigned_agent_id,
        autonomous_level: input.autonomous_level,
        priority: input.priority,
        status: "pending",
    });
}
export async function claimTask(client, input) {
    return client.patch("tasks", input.task_id, {
        status: "in_progress",
        assigned_agent_id: input.agent_id,
        started_at: new Date().toISOString(),
    });
}
export async function completeTask(client, input) {
    return client.patch("tasks", input.task_id, {
        status: "completed",
        completed_at: new Date().toISOString(),
        result: input.result ?? {},
    });
}
export async function failTask(client, input) {
    return client.patch("tasks", input.task_id, {
        status: "failed",
        result: { error: input.reason ?? "Task failed" },
    });
}
export async function createEscalation(client, input) {
    const escalation = await client.post("escalations", {
        task_id: input.task_id,
        agent_id: input.agent_id,
        reason: input.reason,
        status: "pending",
    });
    // Also set task to awaiting_human
    await client.patch("tasks", input.task_id, { status: "awaiting_human" });
    return escalation;
}
export async function getEscalations(client, input) {
    const query = { select: "id,task_id,agent_id,reason,status,created_at" };
    if (input.status)
        query["status"] = `eq.${input.status}`;
    if (input.task_id)
        query["task_id"] = `eq.${input.task_id}`;
    return client.get("escalations", query);
}
export async function resolveEscalation(client, input) {
    await client.patch("escalations", input.escalation_id, { status: "resolved" });
    if (input.steps && input.task_id) {
        await client.patch("tasks", input.task_id, {
            steps: input.steps,
            status: "in_progress",
        });
    }
    return { resolved: true };
}
export async function logActivity(client, input) {
    return client.post("activity_log", {
        agent_id: input.agent_id,
        action: input.action,
        details: input.details ?? {},
        task_id: input.task_id,
        project_id: input.project_id,
    });
}
