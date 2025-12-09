import React, { useEffect, useState } from "react";
import { invoke } from "@forge/bridge";

function App() {
  const [backendMsg, setBackendMsg] = useState("");
  const [projects, setProjects] = useState([]);
  const [projectKey, setProjectKey] = useState("");
  const [pageInput, setPageInput] = useState("");

  const [loadingBackend, setLoadingBackend] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState("");

  // Check backend connectivity
  useEffect(() => {
    const callPing = async () => {
      setLoadingBackend(true);
      try {
        const res = await invoke("ping");
        setBackendMsg(res.message || "No message");
      } catch (e) {
        console.error(e);
        setBackendMsg("Error calling backend");
      } finally {
        setLoadingBackend(false);
      }
    };
    callPing();
  }, []);

  // Load Jira projects
  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      setError("");
      try {
        const res = await invoke("getProjects");
        setProjects(res.projects || []);
      } catch (e) {
        console.error(e);
        setError("Failed to load Jira projects.");
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  const handleAnalyze = async () => {
    setError("");
    setAnalysisResult(null);

    if (!pageInput.trim()) {
      setError("Enter a Confluence page URL or ID.");
      return;
    }
    if (!projectKey) {
      setError("Select a Jira project.");
      return;
    }

    setAnalyzing(true);
    try {
      const res = await invoke("analyzeConfluencePage", {
        pageInput,
        projectKey,
      });
      setAnalysisResult(res);
    } catch (e) {
      console.error(e);
      setError("Analysis failed (stub).");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      <h2>Confluence Task Generator</h2>

      <div
        style={{
          marginTop: 8,
          marginBottom: 16,
          padding: 12,
          borderRadius: 6,
          border: "1px solid #ddd",
          fontSize: 12,
          color: "#555",
        }}
      >
        Backend status:{" "}
        <strong>
          {loadingBackend ? "Checking…" : backendMsg || "No response"}
        </strong>
      </div>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <label style={{ display: "block" }}>
          Confluence page URL or ID
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            placeholder="https://your-site.atlassian.net/wiki/spaces/... or page ID"
            style={{
              width: "100%",
              marginTop: 4,
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
        </label>

        <label style={{ display: "block", marginTop: 12 }}>
          Target Jira project
          <select
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value)}
            disabled={loadingProjects}
            style={{
              width: "100%",
              marginTop: 4,
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          >
            <option value="">Select project…</option>
            {projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.key} — {p.name}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={handleAnalyze}
          disabled={analyzing || loadingProjects}
          style={{
            marginTop: 16,
            padding: "8px 16px",
            borderRadius: 4,
            border: "none",
            background: "#0052CC",
            color: "white",
            cursor: "pointer",
            opacity: analyzing ? 0.7 : 1,
          }}
        >
          {analyzing ? "Analyzing (stub)..." : "Analyze Confluence Page (stub)"}
        </button>

        {error && (
          <div style={{ marginTop: 12, color: "red" }}>{error}</div>
        )}
      </section>

      {analysisResult && (
        <section
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h3>Stub Analysis Result</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {JSON.stringify(analysisResult, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}

export default App;
