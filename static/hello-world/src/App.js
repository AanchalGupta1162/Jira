import React, { useEffect, useState, useCallback } from "react";
import { invoke } from "@forge/bridge";

// ============================================================================
// CONSTANTS
// ============================================================================

// Available issue types for the dropdown
const ISSUE_TYPES = ["Story", "Task", "Bug", "Epic", "Sub-task"];

// Available priorities for the dropdown (matches Jira's default priorities)
const PRIORITIES = ["Highest", "High", "Medium", "Low", "Lowest"];

// Priority color mapping for visual indicators
const PRIORITY_COLORS = {
  Highest: "#DE350B",
  High: "#FF5630",
  Medium: "#FFAB00",
  Low: "#36B37E",
  Lowest: "#00875A",
};

// Issue type icons
const ISSUE_TYPE_ICONS = {
  Story: "📖",
  Task: "✅",
  Bug: "🐛",
  Epic: "⚡",
  "Sub-task": "📋",
};

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    padding: 24,
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    maxWidth: 1000,
    margin: "0 auto",
    backgroundColor: "#F4F5F7",
    minHeight: "100vh",
  },
  header: {
    marginBottom: 8,
    color: "#172B4D",
    fontSize: 28,
    fontWeight: 600,
  },
  subtitle: {
    color: "#5E6C84",
    fontSize: 14,
    marginBottom: 24,
  },
  statusBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    padding: 12,
    borderRadius: 6,
    border: "1px solid #DFE1E6",
    fontSize: 12,
    color: "#5E6C84",
    backgroundColor: "#fff",
  },
  section: {
    border: "1px solid #DFE1E6",
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    backgroundColor: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    color: "#172B4D",
    fontSize: 18,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  label: {
    display: "block",
    fontWeight: 500,
    color: "#172B4D",
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 4,
    border: "1px solid #DFE1E6",
    fontSize: 14,
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
    outline: "none",
  },
  select: {
    width: "100%",
    padding: 10,
    borderRadius: 4,
    border: "1px solid #DFE1E6",
    fontSize: 14,
    boxSizing: "border-box",
    backgroundColor: "#fff",
    cursor: "pointer",
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: 10,
    borderRadius: 4,
    border: "1px solid #DFE1E6",
    fontSize: 14,
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: 120,
    fontFamily: "inherit",
    lineHeight: 1.5,
    outline: "none",
  },
  primaryButton: {
    padding: "10px 20px",
    borderRadius: 4,
    border: "none",
    background: "#0052CC",
    color: "white",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 14,
    transition: "background 0.2s, transform 0.1s",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  secondaryButton: {
    padding: "8px 16px",
    borderRadius: 4,
    border: "1px solid #DFE1E6",
    background: "#fff",
    color: "#172B4D",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 13,
    transition: "background 0.2s",
  },
  dangerButton: {
    padding: "6px 12px",
    borderRadius: 4,
    border: "none",
    background: "#DE350B",
    color: "white",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 12,
  },
  successButton: {
    padding: "10px 20px",
    borderRadius: 4,
    border: "none",
    background: "#00875A",
    color: "white",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 14,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  error: {
    marginTop: 12,
    padding: 12,
    borderRadius: 4,
    backgroundColor: "#FFEBE6",
    border: "1px solid #FFBDAD",
    color: "#DE350B",
    fontSize: 14,
  },
  success: {
    marginTop: 12,
    padding: 12,
    borderRadius: 4,
    backgroundColor: "#E3FCEF",
    border: "1px solid #ABF5D1",
    color: "#006644",
    fontSize: 14,
  },
  card: {
    border: "1px solid #DFE1E6",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#FAFBFC",
    transition: "box-shadow 0.2s",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  inlineFields: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  },
  summaryBox: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#DEEBFF",
    border: "1px solid #B3D4FF",
    marginBottom: 20,
  },
  cacheIndicator: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
  },
  tag: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 3,
    fontSize: 11,
    fontWeight: 500,
    marginRight: 4,
    marginBottom: 4,
  },
  priorityBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 8px",
    borderRadius: 3,
    fontSize: 11,
    fontWeight: 600,
    color: "#fff",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginTop: 12,
  },
  statCard: {
    padding: 12,
    borderRadius: 6,
    backgroundColor: "#F4F5F7",
    textAlign: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: 600,
    color: "#172B4D",
  },
  statLabel: {
    fontSize: 11,
    color: "#5E6C84",
    marginTop: 4,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes labels to a comma-separated string for display in input fields.
 */
function labelsToString(labels) {
  if (Array.isArray(labels)) {
    return labels.join(", ");
  }
  return labels || "";
}

/**
 * Converts a comma-separated string to an array of labels.
 */
function stringToLabels(str) {
  if (!str) return [];
  return str
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Get color for a label based on its content.
 */
function getLabelColor(label) {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("api")) return { bg: "#E6FCFF", text: "#006B8A" };
  if (lowerLabel.includes("ui")) return { bg: "#EAE6FF", text: "#5243AA" };
  if (lowerLabel.includes("security"))
    return { bg: "#FFEBE6", text: "#BF2600" };
  if (lowerLabel.includes("data")) return { bg: "#E3FCEF", text: "#006644" };
  if (lowerLabel.includes("testing")) return { bg: "#FFF0B3", text: "#974F0C" };
  if (lowerLabel.includes("documentation"))
    return { bg: "#DEEBFF", text: "#0747A6" };
  if (lowerLabel.includes("performance"))
    return { bg: "#FFE2EC", text: "#AE2E75" };
  return { bg: "#F4F5F7", text: "#505F79" };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * IssueCard Component - Renders an editable card for a single issue.
 */
function IssueCard({ issue, index, onUpdate, onDelete }) {
  const handleFieldChange = (field, value) => {
    onUpdate(index, { ...issue, [field]: value });
  };

  const priorityColor =
    PRIORITY_COLORS[issue.priority] || PRIORITY_COLORS.Medium;
  const typeIcon = ISSUE_TYPE_ICONS[issue.issueType] || "📋";

  return (
    <div style={styles.card}>
      {/* Card Header */}
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>
          <span style={{ fontSize: 20 }}>{typeIcon}</span>
          <span style={{ fontWeight: 600, color: "#5E6C84", fontSize: 13 }}>
            #{index + 1} • {issue.issueType || "Task"}
          </span>
          <span
            style={{
              ...styles.priorityBadge,
              backgroundColor: priorityColor,
            }}
          >
            {issue.priority || "Medium"}
          </span>
        </div>
        <button
          onClick={() => onDelete(index)}
          style={styles.dangerButton}
          title="Remove this issue"
        >
          ✕ Remove
        </button>
      </div>

      {/* Title Field */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Title *</label>
        <input
          type="text"
          value={issue.title || ""}
          onChange={(e) => handleFieldChange("title", e.target.value)}
          placeholder="Issue title (required)"
          style={styles.input}
        />
      </div>

      {/* Description Field */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Description</label>
        <textarea
          value={issue.description || ""}
          onChange={(e) => handleFieldChange("description", e.target.value)}
          placeholder="Detailed description with acceptance criteria..."
          style={styles.textarea}
          rows={6}
        />
      </div>

      {/* Inline Fields */}
      <div style={styles.inlineFields}>
        {/* Issue Type */}
        <div>
          <label style={styles.label}>Issue Type</label>
          <select
            value={issue.issueType || "Task"}
            onChange={(e) => handleFieldChange("issueType", e.target.value)}
            style={styles.select}
          >
            {ISSUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {ISSUE_TYPE_ICONS[type]} {type}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label style={styles.label}>Priority</label>
          <select
            value={issue.priority || "Medium"}
            onChange={(e) => handleFieldChange("priority", e.target.value)}
            style={styles.select}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Labels */}
        <div>
          <label style={styles.label}>Labels</label>
          <input
            type="text"
            value={labelsToString(issue.labels)}
            onChange={(e) =>
              handleFieldChange("labels", stringToLabels(e.target.value))
            }
            placeholder="label1, label2, ..."
            style={styles.input}
          />
        </div>
      </div>

      {/* Labels Preview */}
      {issue.labels && issue.labels.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {(Array.isArray(issue.labels) ? issue.labels : [issue.labels]).map(
            (label, i) => {
              const colors = getLabelColor(label);
              return (
                <span
                  key={i}
                  style={{
                    ...styles.tag,
                    backgroundColor: colors.bg,
                    color: colors.text,
                  }}
                >
                  {label}
                </span>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

/**
 * CreationResults Component - Displays results after creating Jira issues.
 */
function CreationResults({ results, onDismiss }) {
  if (!results) return null;

  const { created, errors } = results;

  return (
    <div style={{ ...styles.section, marginTop: 20, borderColor: "#00875A" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h3 style={{ ...styles.sectionTitle, color: "#00875A" }}>
          🎉 Creation Results
        </h3>
        <button onClick={onDismiss} style={styles.secondaryButton}>
          Dismiss
        </button>
      </div>

      {/* Successfully Created */}
      {created && created.length > 0 && (
        <div style={styles.success}>
          <strong>✅ Successfully Created ({created.length}):</strong>
          <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
            {created.map((item, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <strong style={{ color: "#0052CC" }}>{item.key}</strong>:{" "}
                {item.summary}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Errors */}
      {errors && errors.length > 0 && (
        <div style={{ ...styles.error, marginTop: created?.length ? 12 : 0 }}>
          <strong>❌ Errors ({errors.length}):</strong>
          <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
            {errors.map((item, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <strong>{item.issue?.title || "Untitled"}</strong>: {item.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * AnalysisSummary Component - Displays the analysis summary with statistics.
 */
function AnalysisSummary({ summary, issues, fromCache, cacheAge, onRefresh }) {
  // Calculate statistics
  const stats = {
    total: issues.length,
    stories: issues.filter((i) => i.issueType === "Story").length,
    tasks: issues.filter((i) => i.issueType === "Task").length,
    bugs: issues.filter((i) => i.issueType === "Bug").length,
    highPriority: issues.filter(
      (i) => i.priority === "High" || i.priority === "Highest"
    ).length,
  };

  return (
    <div style={styles.summaryBox}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <strong style={{ fontSize: 16 }}>📊 Analysis Summary</strong>
          {fromCache && (
            <span
              style={{
                ...styles.cacheIndicator,
                backgroundColor: "#FFF0B3",
                color: "#974F0C",
                marginLeft: 8,
              }}
            >
              ⏱️ Cached ({cacheAge})
            </span>
          )}
        </div>
        {fromCache && onRefresh && (
          <button onClick={onRefresh} style={styles.secondaryButton}>
            🔄 Refresh Analysis
          </button>
        )}
      </div>

      <p style={{ margin: "12px 0 0 0", whiteSpace: "pre-line", fontSize: 14 }}>
        {summary}
      </p>

      {/* Statistics Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total Items</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: "#5243AA" }}>
            {stats.stories}
          </div>
          <div style={styles.statLabel}>Stories</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: "#0052CC" }}>
            {stats.tasks}
          </div>
          <div style={styles.statLabel}>Tasks</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: "#DE350B" }}>
            {stats.highPriority}
          </div>
          <div style={styles.statLabel}>High Priority</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
  // ----- State Management -----

  // Backend connectivity status
  const [backendMsg, setBackendMsg] = useState("");
  const [loadingBackend, setLoadingBackend] = useState(false);

  // Jira projects dropdown
  const [projects, setProjects] = useState([]);
  const [projectKey, setProjectKey] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Confluence spaces dropdown
  const [spaces, setSpaces] = useState([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [loadingSpaces, setLoadingSpaces] = useState(false);

  // Confluence pages dropdown
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedPageTitle, setSelectedPageTitle] = useState("");
  const [loadingPages, setLoadingPages] = useState(false);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState("");
  const [issues, setIssues] = useState([]);
  const [rawDebug, setRawDebug] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState("");

  // Issue creation state
  const [creating, setCreating] = useState(false);
  const [creationResults, setCreationResults] = useState(null);

  // Error handling
  const [error, setError] = useState("");

  // ----- Effects -----

  // Check backend connectivity on mount
  useEffect(() => {
    const callPing = async () => {
      setLoadingBackend(true);
      try {
        const res = await invoke("ping");
        setBackendMsg(res.message || "Connected");
      } catch (e) {
        console.error("Ping error:", e);
        setBackendMsg("Error connecting to backend");
      } finally {
        setLoadingBackend(false);
      }
    };
    callPing();
  }, []);

  // Load Jira projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      setError("");
      try {
        const res = await invoke("getProjects");
        setProjects(res.projects || []);
      } catch (e) {
        console.error("Failed to load projects:", e);
        setError("Failed to load Jira projects. Please refresh and try again.");
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  // Load Confluence spaces on mount
  useEffect(() => {
    const loadSpaces = async () => {
      setLoadingSpaces(true);
      try {
        const res = await invoke("getConfluenceSpaces");
        setSpaces(res.spaces || []);
      } catch (e) {
        console.error("Failed to load Confluence spaces:", e);
        setError(
          "Failed to load Confluence spaces. Please refresh and try again."
        );
      } finally {
        setLoadingSpaces(false);
      }
    };
    loadSpaces();
  }, []);

  // Load Confluence pages when space is selected
  useEffect(() => {
    setPages([]);
    setSelectedPageId("");
    setSelectedPageTitle("");

    if (!selectedSpaceId) return;

    const loadPages = async () => {
      setLoadingPages(true);
      try {
        const res = await invoke("getConfluencePages", {
          spaceId: selectedSpaceId,
        });
        setPages(res.pages || []);
      } catch (e) {
        console.error("Failed to load Confluence pages:", e);
        setError("Failed to load pages for this space.");
      } finally {
        setLoadingPages(false);
      }
    };
    loadPages();
  }, [selectedSpaceId]);

  // Check for stored backlog when page and project are selected
  useEffect(() => {
    if (!selectedPageId || !projectKey) return;

    const checkStoredBacklog = async () => {
      try {
        const res = await invoke("getStoredBacklog", {
          pageId: selectedPageId,
          projectKey,
        });
        if (res.found && res.data) {
          setSummary(res.data.summary || "");
          setIssues(res.data.issues || []);
          setRawDebug(res.data.raw || null);
          setFromCache(true);
          setCacheAge(res.cacheAge || "");
        }
      } catch (e) {
        // Silently fail - not critical
        console.log("No stored backlog found");
      }
    };
    checkStoredBacklog();
  }, [selectedPageId, projectKey]);

  // ----- Event Handlers -----

  const handleSpaceChange = (e) => {
    setSelectedSpaceId(e.target.value);
    // Clear analysis when space changes
    setSummary("");
    setIssues([]);
    setFromCache(false);
  };

  const handlePageChange = (e) => {
    const pageId = e.target.value;
    setSelectedPageId(pageId);
    const page = pages.find((p) => p.id === pageId);
    setSelectedPageTitle(page?.title || "");
    // Clear analysis when page changes
    setSummary("");
    setIssues([]);
    setFromCache(false);
  };

  const handleAnalyze = useCallback(
    async (forceRefresh = false) => {
      setError("");
      if (!forceRefresh) {
        setSummary("");
        setIssues([]);
        setRawDebug(null);
      }
      setCreationResults(null);
      setFromCache(false);

      if (!selectedPageId) {
        setError("Please select a Confluence page to analyze.");
        return;
      }
      if (!projectKey) {
        setError("Please select a target Jira project.");
        return;
      }

      // If force refresh, clear the stored backlog first
      if (forceRefresh) {
        try {
          await invoke("clearStoredBacklog", {
            pageId: selectedPageId,
            projectKey,
          });
        } catch (e) {
          console.log("Could not clear cache:", e);
        }
      }

      setAnalyzing(true);
      try {
        const res = await invoke("analyzeConfluencePage", {
          pageId: selectedPageId,
          pageTitle: selectedPageTitle,
          projectKey,
        });

        setSummary(res.summary || "");
        setIssues(res.issues || []);
        setRawDebug(res.raw || null);
        setFromCache(res.fromCache || false);
        setCacheAge(res.cacheAge || "");
      } catch (e) {
        console.error("Analysis error:", e);
        setError(
          e.message || "Analysis failed. Please check the page and try again."
        );
      } finally {
        setAnalyzing(false);
      }
    },
    [selectedPageId, selectedPageTitle, projectKey]
  );

  const handleRefreshAnalysis = () => {
    handleAnalyze(true);
  };

  const handleUpdateIssue = (index, updatedIssue) => {
    setIssues((prev) => {
      const newIssues = [...prev];
      newIssues[index] = updatedIssue;
      return newIssues;
    });
  };

  const handleDeleteIssue = (index) => {
    setIssues((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateIssues = async () => {
    setError("");
    setCreationResults(null);

    if (!projectKey) {
      setError("Please select a Jira project before creating issues.");
      return;
    }
    if (issues.length === 0) {
      setError("No issues to create. Please analyze a Confluence page first.");
      return;
    }

    const emptyTitles = issues.filter((i) => !(i.title || "").trim());
    if (emptyTitles.length > 0) {
      setError(
        `${emptyTitles.length} issue(s) have empty titles. Please provide titles for all issues.`
      );
      return;
    }

    setCreating(true);
    try {
      const res = await invoke("createJiraIssues", {
        projectKey,
        pageId: selectedPageId,
        pageTitle: selectedPageTitle,
        issues,
      });

      setCreationResults(res);

      if (res.created?.length === issues.length) {
        setIssues([]);
        setSummary("");
      } else if (res.created?.length > 0) {
        const createdSummaries = new Set(res.created.map((c) => c.summary));
        setIssues((prev) =>
          prev.filter((issue) => !createdSummaries.has(issue.title?.trim()))
        );
      }
    } catch (e) {
      console.error("Create issues error:", e);
      setError(e.message || "Failed to create Jira issues.");
    } finally {
      setCreating(false);
    }
  };

  const handleDismissResults = () => {
    setCreationResults(null);
  };

  // ----- Render -----

  return (
    <div style={styles.container}>
      {/* Header */}
      <h1 style={styles.header}>📋 Confluence Task Generator</h1>
      <p style={styles.subtitle}>
        AI-powered analysis to convert Confluence documentation into actionable
        Jira backlog items
      </p>

      {/* Status Bar */}
      <div style={styles.statusBar}>
        <span>
          Backend:{" "}
          <strong>
            {loadingBackend ? "Connecting..." : backendMsg || "Unknown"}
          </strong>
        </span>
        <span style={{ fontSize: 11, color: "#97A0AF" }}>
          v2.0 • AI-Powered Analysis
        </span>
      </div>

      {/* Step 1: Source & Target Selection */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <span>1️⃣</span> Select Source & Target
        </h3>

        {/* Confluence Space */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Confluence Space</label>
          <select
            value={selectedSpaceId}
            onChange={handleSpaceChange}
            disabled={loadingSpaces}
            style={styles.select}
          >
            <option value="">
              {loadingSpaces ? "Loading spaces..." : "Select a space..."}
            </option>
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.key} — {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Confluence Page */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Confluence Page</label>
          <select
            value={selectedPageId}
            onChange={handlePageChange}
            disabled={!selectedSpaceId || loadingPages}
            style={{
              ...styles.select,
              opacity: !selectedSpaceId ? 0.6 : 1,
            }}
          >
            <option value="">
              {!selectedSpaceId
                ? "Select a space first..."
                : loadingPages
                ? "Loading pages..."
                : pages.length === 0
                ? "No pages found"
                : "Select a page..."}
            </option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* Jira Project */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Target Jira Project</label>
          <select
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            disabled={loadingProjects}
            style={styles.select}
          >
            <option value="">
              {loadingProjects ? "Loading projects..." : "Select a project..."}
            </option>
            {projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.key} — {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Analyze Button */}
        <button
          onClick={() => handleAnalyze(false)}
          disabled={analyzing || !selectedPageId || !projectKey}
          style={{
            ...styles.primaryButton,
            marginTop: 8,
            opacity: analyzing || !selectedPageId || !projectKey ? 0.6 : 1,
          }}
        >
          {analyzing ? <>⏳ Analyzing...</> : <>🔍 Analyze Confluence Page</>}
        </button>

        {/* Error Display */}
        {error && <div style={styles.error}>{error}</div>}
      </section>

      {/* Step 2: Review & Edit Issues */}
      {(summary || issues.length > 0) && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <span>2️⃣</span> Review & Edit Generated Issues
          </h3>

          {/* Analysis Summary */}
          {summary && (
            <AnalysisSummary
              summary={summary}
              issues={issues}
              fromCache={fromCache}
              cacheAge={cacheAge}
              onRefresh={handleRefreshAnalysis}
            />
          )}

          {/* Issues List */}
          {issues.length > 0 ? (
            <>
              <h4
                style={{
                  marginTop: 0,
                  marginBottom: 16,
                  color: "#5E6C84",
                  fontSize: 14,
                }}
              >
                Generated Backlog Items ({issues.length})
              </h4>
              {issues.map((issue, index) => (
                <IssueCard
                  key={index}
                  issue={issue}
                  index={index}
                  onUpdate={handleUpdateIssue}
                  onDelete={handleDeleteIssue}
                />
              ))}

              {/* Create Issues Button */}
              <button
                onClick={handleCreateIssues}
                disabled={creating || issues.length === 0}
                style={{
                  ...styles.successButton,
                  marginTop: 16,
                  opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? (
                  <>⏳ Creating Issues...</>
                ) : (
                  <>
                    ✅ Create {issues.length} Jira Issue
                    {issues.length !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </>
          ) : (
            <p style={{ color: "#5E6C84", fontStyle: "italic" }}>
              No backlog items generated. Try analyzing a page with more
              content.
            </p>
          )}
        </section>
      )}

      {/* Creation Results */}
      <CreationResults
        results={creationResults}
        onDismiss={handleDismissResults}
      />

      {/* Debug Section */}
      {rawDebug && (
        <section
          style={{
            ...styles.section,
            backgroundColor: "#F4F5F7",
            fontSize: 12,
          }}
        >
          <details>
            <summary
              style={{ cursor: "pointer", color: "#5E6C84", fontWeight: 500 }}
            >
              🔧 Debug Info (click to expand)
            </summary>
            <pre
              style={{
                marginTop: 12,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                backgroundColor: "#fff",
                padding: 12,
                borderRadius: 4,
                border: "1px solid #DFE1E6",
              }}
            >
              {JSON.stringify(rawDebug, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </div>
  );
}

export default App;
