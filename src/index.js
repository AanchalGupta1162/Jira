import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";

const resolver = new Resolver();

/**
 * Helper: parse Confluence URL or raw ID into numeric ID
 */
function extractConfluencePageId(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;

  // If it's just digits, assume it's the ID
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  // Try to extract last numeric segment from URL path
  try {
    const url = new URL(trimmed);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Typical: /wiki/spaces/SPACE/pages/123456789/Page-Title
    const numericParts = pathParts.filter((part) => /^\d+$/.test(part));
    if (numericParts.length > 0) {
      return numericParts[numericParts.length - 1];
    }
  } catch (e) {
    // Not a URL, ignore
  }

  return null;
}

// Simple connectivity check
resolver.define("ping", () => {
  return { message: "Hello from Forge backend 👋" };
});

// Get Jira projects for dropdown
resolver.define("getProjects", async () => {
  const res = await api
    .asUser()
    .requestJira(route`/rest/api/3/project/search?maxResults=50`);

  if (!res.ok) {
    const text = await res.text();
    console.error("getProjects error:", res.status, text);
    throw new Error("Failed to fetch Jira projects");
  }

  const data = await res.json();
  const projects = (data.values || []).map((p) => ({
    key: p.key,
    id: p.id,
    name: p.name,
  }));

  return { projects };
});

// NEW: real Confluence fetch + mock "AI"
resolver.define("analyzeConfluencePage", async ({ payload }) => {
  const { pageInput, projectKey } = payload;

  const pageId = extractConfluencePageId(pageInput);
  if (!pageId) {
    throw new Error("Could not extract Confluence page ID from input.");
  }

  // Call Confluence REST API (v2)
  const res = await api
    .asUser()
    .requestConfluence(
      route`/wiki/api/v2/pages/${pageId}?body-format=storage`
    );

  if (!res.ok) {
    const text = await res.text();
    console.error("Confluence fetch error:", res.status, text);
    throw new Error("Failed to fetch Confluence page. Check URL/ID and permissions.");
  }

  const page = await res.json();
  const title = page.title || "";

  const storageBody =
    page.body?.storage?.value ||
    page.body?.value ||
    "";

  // Very simple HTML → text
  const bodyText = storageBody
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // STILL MOCKED: we just build one fake issue using real title/content
  const issues = [
    {
      title: `Implement items from "${title}"`,
      description:
        `This is a MOCK issue based on the Confluence page:\n\n` +
        `Title: ${title}\n\n` +
        `Content preview:\n${bodyText.slice(0, 400)}\n\n` +
        `Acceptance Criteria:\n` +
        `- Replace this mock with real AI-generated breakdown.\n` +
        `- Create multiple issues based on sections of the document.`,
      issueType: "Task",
      labels: ["mock", "from-confluence"],
      priority: "Medium",
    },
  ];

  return {
    summary: `Mock analysis for page "${title}" in project ${projectKey}`,
    issues,
  };
});

export const handler = resolver.getDefinitions();
