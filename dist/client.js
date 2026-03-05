/**
 * Thin HTTP client for the Agent Command Center REST API.
 * All Supabase REST calls go through here.
 */
export class AgentCommandClient {
    config;
    constructor(config) {
        this.config = config;
    }
    get headers() {
        return {
            "x-api-key": this.config.apiKey,
            "Content-Type": "application/json",
        };
    }
    async get(table, query) {
        const url = new URL(`${this.config.apiBaseUrl}/${table}`);
        // Always scope to org
        url.searchParams.set("org_id", `eq.${this.config.orgId}`);
        if (query) {
            for (const [k, v] of Object.entries(query)) {
                url.searchParams.set(k, v);
            }
        }
        const res = await fetch(url.toString(), { headers: this.headers });
        if (!res.ok)
            throw new Error(`GET ${table} failed: ${res.status} ${await res.text()}`);
        return res.json();
    }
    async post(table, body) {
        const payload = { ...body, org_id: this.config.orgId };
        const res = await fetch(`${this.config.apiBaseUrl}/${table}`, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(payload),
        });
        if (!res.ok)
            throw new Error(`POST ${table} failed: ${res.status} ${await res.text()}`);
        return res.json();
    }
    async patch(table, id, body) {
        const res = await fetch(`${this.config.apiBaseUrl}/${table}/${id}`, {
            method: "PATCH",
            headers: this.headers,
            body: JSON.stringify(body),
        });
        if (!res.ok)
            throw new Error(`PATCH ${table}/${id} failed: ${res.status} ${await res.text()}`);
        return res.json();
    }
    async delete(table, id) {
        const res = await fetch(`${this.config.apiBaseUrl}/${table}/${id}`, {
            method: "DELETE",
            headers: this.headers,
        });
        if (!res.ok)
            throw new Error(`DELETE ${table}/${id} failed: ${res.status} ${await res.text()}`);
    }
}
