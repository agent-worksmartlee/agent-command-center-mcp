/**
 * Thin HTTP client for the Agent Command Center REST API.
 * All Supabase REST calls go through here.
 */

export interface AgentCommandConfig {
  apiBaseUrl: string;
  apiKey: string;
  orgId: string;
}

export class AgentCommandClient {
  constructor(private config: AgentCommandConfig) {}

  private get headers() {
    return {
      "x-api-key": this.config.apiKey,
      "Content-Type": "application/json",
    };
  }

  async get<T>(table: string, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.config.apiBaseUrl}/${table}`);
    // Always scope to org
    url.searchParams.set("org_id", `eq.${this.config.orgId}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), { headers: this.headers });
    if (!res.ok) throw new Error(`GET ${table} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async post<T>(table: string, body: Record<string, unknown>): Promise<T> {
    const payload = { ...body, org_id: this.config.orgId };
    const res = await fetch(`${this.config.apiBaseUrl}/${table}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`POST ${table} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async patch<T>(table: string, id: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.config.apiBaseUrl}/${table}/${id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${table}/${id} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async delete(table: string, id: string): Promise<void> {
    const res = await fetch(`${this.config.apiBaseUrl}/${table}/${id}`, {
      method: "DELETE",
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`DELETE ${table}/${id} failed: ${res.status} ${await res.text()}`);
  }
}
