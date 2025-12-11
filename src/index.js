import Resolver from "@forge/resolver";
import api, { route, storage } from "@forge/api";

const resolver = new Resolver();

// ============================================================================
// CONSTANTS
// ============================================================================

// Storage key prefix for backlog data
const STORAGE_KEY_PREFIX = "backlog_";

// ============================================================================
// ADVANCED HTML PARSING & CONTENT EXTRACTION
// ============================================================================

/**
 * Deep HTML parser that extracts structured content from Confluence pages.
 * Handles complex nested structures, tables, code blocks, and formatting.
 */
function parseConfluenceContent(html) {
  if (!html) return { sections: [], plainText: "" };

  const sections = [];
  let currentSection = null;
  let plainTextParts = [];

  // Pre-process: normalize HTML
  let processed = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Extract all headings and their content
  // Pattern to match heading tags with their content until the next heading or end
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  const headings = [];
  let match;

  while ((match = headingRegex.exec(processed)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      title: stripHtml(match[2]).trim(),
      index: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Split content by headings
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];

    const contentStart = heading.endIndex;
    const contentEnd = nextHeading ? nextHeading.index : processed.length;
    const sectionHtml = processed.slice(contentStart, contentEnd);

    // Parse section content
    const sectionContent = parseSectionContent(sectionHtml);

    sections.push({
      level: heading.level,
      title: heading.title,
      content: sectionContent.text,
      bullets: sectionContent.bullets,
      numberedItems: sectionContent.numberedItems,
      codeBlocks: sectionContent.codeBlocks,
      tables: sectionContent.tables,
    });

    plainTextParts.push(`## ${heading.title}\n${sectionContent.text}`);
  }

  // If no headings, treat entire content as one section
  if (headings.length === 0) {
    const sectionContent = parseSectionContent(processed);
    sections.push({
      level: 1,
      title: "Main Content",
      content: sectionContent.text,
      bullets: sectionContent.bullets,
      numberedItems: sectionContent.numberedItems,
      codeBlocks: sectionContent.codeBlocks,
      tables: sectionContent.tables,
    });
    plainTextParts.push(sectionContent.text);
  }

  return {
    sections,
    plainText: plainTextParts.join("\n\n"),
  };
}

/**
 * Parse content within a section to extract structured elements.
 */
function parseSectionContent(html) {
  const bullets = [];
  const numberedItems = [];
  const codeBlocks = [];
  const tables = [];

  // Extract bullet points
  const bulletRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let bulletMatch;
  while ((bulletMatch = bulletRegex.exec(html)) !== null) {
    const content = stripHtml(bulletMatch[1]).trim();
    if (content.length > 0) {
      bullets.push(content);
    }
  }

  // Extract code blocks
  const codeRegex = /<code[^>]*>([\s\S]*?)<\/code>/gi;
  let codeMatch;
  while ((codeMatch = codeRegex.exec(html)) !== null) {
    const code = stripHtml(codeMatch[1]).trim();
    if (code.length > 0) {
      codeBlocks.push(code);
    }
  }

  // Extract table content
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableContent = extractTableContent(tableMatch[1]);
    if (tableContent.length > 0) {
      tables.push(tableContent);
    }
  }

  // Get plain text
  const text = stripHtml(html);

  return { text, bullets, numberedItems, codeBlocks, tables };
}

/**
 * Extract content from a table as structured text.
 */
function extractTableContent(tableHtml) {
  const rows = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const cells = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(stripHtml(cellMatch[1]).trim());
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return rows;
}

/**
 * Strip HTML tags and decode entities.
 */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rarr;/gi, "→")
    .replace(/&larr;/gi, "←")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ============================================================================
// INTELLIGENT SEMANTIC ANALYSIS ENGINE
// ============================================================================

/**
 * Advanced semantic analyzer that understands document context and
 * generates meaningful, well-structured backlog items.
 */
function analyzeDocumentSemantics(parsedContent, pageTitle, projectKey) {
  const { sections, plainText } = parsedContent;
  const backlogItems = [];

  // Detect document type/purpose
  const docType = detectDocumentType(plainText, pageTitle);
  console.log("Detected document type:", docType);

  // Extract project/app name from title or content
  const projectName = extractProjectName(pageTitle, plainText);
  console.log("Detected project name:", projectName);

  // Process each section intelligently
  sections.forEach((section, sectionIndex) => {
    const sectionItems = analyzeSectionForBacklogItems(
      section,
      sectionIndex,
      docType,
      projectName,
      projectKey
    );
    backlogItems.push(...sectionItems);
  });

  // If no items generated, create a high-level implementation story
  if (backlogItems.length === 0) {
    backlogItems.push(createFallbackStory(pageTitle, plainText, projectKey));
  }

  // Deduplicate and prioritize
  const uniqueItems = deduplicateAndPrioritize(backlogItems);

  // Limit to top 10 most meaningful items
  return uniqueItems.slice(0, 10);
}

/**
 * Detect what type of document this is to tailor analysis.
 */
function detectDocumentType(text, title) {
  const lowerText = text.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const combined = `${lowerTitle} ${lowerText}`;

  if (
    combined.includes("prd") ||
    combined.includes("product requirement") ||
    combined.includes("specification")
  ) {
    return "prd";
  }
  if (
    combined.includes("architecture") ||
    combined.includes("technical design") ||
    combined.includes("system design")
  ) {
    return "architecture";
  }
  if (combined.includes("api") && combined.includes("endpoint")) {
    return "api-spec";
  }
  if (
    combined.includes("mvp") ||
    combined.includes("minimum viable") ||
    combined.includes("prototype")
  ) {
    return "mvp";
  }
  if (
    combined.includes("user story") ||
    combined.includes("user stories") ||
    combined.includes("acceptance criteria")
  ) {
    return "user-stories";
  }
  if (combined.includes("onboarding") || combined.includes("getting started")) {
    return "onboarding";
  }
  if (combined.includes("release") || combined.includes("changelog")) {
    return "release-notes";
  }
  if (combined.includes("bug") || combined.includes("issue")) {
    return "bug-report";
  }

  return "general";
}

/**
 * Extract the project/application name from title or content.
 */
function extractProjectName(title, text) {
  // Common patterns: "XYZ App", "Project XYZ", "XYZ PRD", "XYZ MVP"
  const patterns = [
    /^(.+?)\s+(?:app|application|project|prd|mvp|spec|design)/i,
    /(?:for|about)\s+(.+?)\s+(?:app|application|project)/i,
    /^([A-Z][a-zA-Z0-9]+(?:Notes|App|Hub|Manager|Tracker|Tool))/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Default to first significant word in title
  const words = title.split(/\s+/);
  return words[0] || "Project";
}

/**
 * Analyze a single section and generate appropriate backlog items.
 */
function analyzeSectionForBacklogItems(
  section,
  sectionIndex,
  docType,
  projectName,
  projectKey
) {
  const items = [];
  const { title, content, bullets, codeBlocks } = section;
  const lowerTitle = title.toLowerCase();

  // Skip non-actionable sections
  if (
    lowerTitle.includes("overview") ||
    lowerTitle.includes("introduction") ||
    lowerTitle.includes("background") ||
    lowerTitle.includes("summary") ||
    lowerTitle.includes("table of contents") ||
    lowerTitle.includes("version history")
  ) {
    return items;
  }

  // Detect section type and generate appropriate items
  if (
    lowerTitle.includes("structure") ||
    lowerTitle.includes("folder") ||
    lowerTitle.includes("architecture") ||
    lowerTitle.includes("setup") ||
    lowerTitle.includes("tooling")
  ) {
    // Project structure/setup section
    const setupItem = createSetupStory(
      section,
      projectName,
      projectKey,
      docType
    );
    if (setupItem) items.push(setupItem);
  } else if (
    lowerTitle.includes("data") ||
    lowerTitle.includes("model") ||
    lowerTitle.includes("storage") ||
    lowerTitle.includes("database") ||
    lowerTitle.includes("persistence")
  ) {
    // Data model section
    const dataItem = createDataModelStory(
      section,
      projectName,
      projectKey,
      docType
    );
    if (dataItem) items.push(dataItem);
  } else if (
    lowerTitle.includes("component") ||
    lowerTitle.includes("ui") ||
    lowerTitle.includes("interface") ||
    lowerTitle.includes("view") ||
    lowerTitle.includes("screen")
  ) {
    // UI components section
    const uiItems = createUIComponentStories(
      section,
      projectName,
      projectKey,
      docType
    );
    items.push(...uiItems);
  } else if (
    lowerTitle.includes("api") ||
    lowerTitle.includes("endpoint") ||
    lowerTitle.includes("service") ||
    lowerTitle.includes("integration")
  ) {
    // API/Integration section
    const apiItem = createAPIStory(section, projectName, projectKey, docType);
    if (apiItem) items.push(apiItem);
  } else if (
    lowerTitle.includes("feature") ||
    lowerTitle.includes("functionality") ||
    lowerTitle.includes("capability")
  ) {
    // Features section - each bullet could be a story
    const featureItems = createFeatureStories(
      section,
      projectName,
      projectKey,
      docType
    );
    items.push(...featureItems);
  } else if (
    lowerTitle.includes("requirement") ||
    lowerTitle.includes("scope")
  ) {
    // Requirements section
    const reqItems = createRequirementStories(
      section,
      projectName,
      projectKey,
      docType
    );
    items.push(...reqItems);
  } else if (
    lowerTitle.includes("future") ||
    lowerTitle.includes("roadmap") ||
    lowerTitle.includes("backlog") ||
    lowerTitle.includes("nice to have")
  ) {
    // Future/backlog items - lower priority
    const futureItems = createFutureStories(
      section,
      projectName,
      projectKey,
      docType
    );
    items.push(...futureItems);
  } else if (bullets.length > 0) {
    // Generic section with bullets - analyze each bullet
    const bulletItems = analyzeBulletsForStories(
      section,
      projectName,
      projectKey,
      docType
    );
    items.push(...bulletItems);
  }

  return items;
}

// ============================================================================
// STORY GENERATORS - Create well-formatted backlog items
// ============================================================================

/**
 * Create a setup/scaffolding story for project initialization.
 */
function createSetupStory(section, projectName, projectKey, docType) {
  const { title, content, bullets, codeBlocks } = section;

  // Extract folder structure items
  const folderItems = bullets.filter(
    (b) =>
      b.includes("/") ||
      b.includes("src") ||
      b.includes("component") ||
      b.includes("hook") ||
      b.includes("util")
  );

  // Extract tooling items
  const toolingItems = bullets.filter(
    (b) =>
      b.toLowerCase().includes("eslint") ||
      b.toLowerCase().includes("prettier") ||
      b.toLowerCase().includes("typescript") ||
      b.toLowerCase().includes("vite") ||
      b.toLowerCase().includes("webpack") ||
      b.toLowerCase().includes("npm")
  );

  let description = `## Description\n\n`;
  description += `Set up the initial project structure and tooling for the ${projectName} ${
    docType === "mvp" ? "MVP" : "application"
  } so that the team can implement features quickly and consistently.\n\n`;

  description += `### Include:\n\n`;

  // Add initialization step
  if (docType === "mvp" || content.toLowerCase().includes("react")) {
    description += `- Initialize a new React-based project (Create React App, Vite, or similar).\n`;
  } else {
    description += `- Initialize the project with appropriate tooling.\n`;
  }

  // Add folder structure
  if (folderItems.length > 0) {
    description += `- Create recommended folder structure:\n`;
    folderItems.forEach((item) => {
      description += `  - \`${item}\`\n`;
    });
  } else {
    description += `- Create recommended folder structure based on project conventions.\n`;
  }

  // Add tooling
  if (toolingItems.length > 0) {
    description += `- Configure tooling:\n`;
    toolingItems.forEach((item) => {
      description += `  - ${item}\n`;
    });
  } else {
    description += `- Configure basic tooling (linting, formatting, build scripts).\n`;
  }

  description += `- Add a minimal global CSS reset and base typography.\n`;
  description += `- Add a simple app shell that renders a placeholder layout.\n\n`;

  // Acceptance Criteria
  description += `## Acceptance Criteria\n\n`;
  description += `- [ ] Project boots successfully with \`npm run dev\` or \`npm start\`.\n`;
  description += `- [ ] The folder structure matches the defined convention.\n`;
  description += `- [ ] The app renders a basic layout structure.\n`;
  description += `- [ ] Linting and formatting tools are configured and can be run via npm scripts.\n`;
  description += `- [ ] Project is committed to the repository with an initial README.\n`;

  return {
    title: `Set up ${projectName} project structure and tooling`,
    description,
    issueType: "Story",
    labels: [
      "frontend",
      docType === "mvp" ? "mvp" : "setup",
      "scaffolding",
      projectName.toLowerCase(),
    ],
    priority: "High",
  };
}

/**
 * Create a data model/persistence story.
 */
function createDataModelStory(section, projectName, projectKey, docType) {
  const { title, content, bullets, codeBlocks } = section;

  // Extract data shape fields
  const fieldItems = bullets.filter(
    (b) =>
      b.includes(":") ||
      b.toLowerCase().includes("id") ||
      b.toLowerCase().includes("string") ||
      b.toLowerCase().includes("number") ||
      b.toLowerCase().includes("boolean")
  );

  // Detect storage mechanism
  const usesLocalStorage =
    content.toLowerCase().includes("localstorage") ||
    content.toLowerCase().includes("local storage");
  const usesDatabase =
    content.toLowerCase().includes("database") ||
    content.toLowerCase().includes("mongodb") ||
    content.toLowerCase().includes("postgres");

  // Detect entity name
  const entityMatch = title.match(
    /(\w+)\s+(?:data|model|storage|persistence)/i
  );
  const entityName = entityMatch ? entityMatch[1] : "entity";

  let description = `## Description\n\n`;
  description += `Implement a reusable hook/module to manage the ${entityName.toLowerCase()} data model and persist data`;

  if (usesLocalStorage) {
    description += ` in localStorage`;
  } else if (usesDatabase) {
    description += ` in the database`;
  }
  description += `. This will be the foundation for all ${entityName.toLowerCase()}-related behavior in the ${
    docType === "mvp" ? "MVP" : "application"
  }.\n\n`;

  description += `### Include:\n\n`;

  // Data shape
  description += `- Define a basic ${entityName} shape, for example:\n`;
  if (fieldItems.length > 0) {
    fieldItems.slice(0, 8).forEach((field) => {
      description += `  - \`${field}\`\n`;
    });
  } else {
    description += `  - \`id: string\`\n`;
    description += `  - \`createdAt: number\`\n`;
    description += `  - \`updatedAt: number\`\n`;
  }

  // Hook/module implementation
  description += `\n- Implement a \`use${entityName}s\` hook under \`src/hooks/\` that:\n`;
  description += `  - Initializes data from storage on first load.\n`;
  description += `  - Provides CRUD functions (create, read, update, delete).\n`;
  description += `  - Automatically saves changes to storage.\n`;

  // Utilities
  description += `\n- Add utilities in \`src/utils/\` for:\n`;
  description += `  - Generating unique IDs.\n`;
  description += `  - Sorting and filtering data.\n\n`;

  // Acceptance Criteria
  description += `## Acceptance Criteria\n\n`;
  description += `- [ ] \`use${entityName}s\` hook is implemented and returns state and CRUD functions.\n`;
  description += `- [ ] Data is rehydrated from storage on page refresh.\n`;
  description += `- [ ] Any data change is reflected in storage immediately or on debounce.\n`;
  description += `- [ ] If storage is empty, the app starts with appropriate default state.\n`;
  description += `- [ ] The data model and hook are covered by tests OR manual test steps are documented.\n`;

  return {
    title: `Implement ${entityName.toLowerCase()} data model and ${
      usesLocalStorage ? "localStorage" : ""
    }persistence hook`,
    description,
    issueType: "Story",
    labels: [
      "frontend",
      usesLocalStorage ? "localstorage" : "data",
      "state-management",
      projectName.toLowerCase(),
    ],
    priority: "High",
  };
}

/**
 * Create UI component stories from a components section.
 */
function createUIComponentStories(section, projectName, projectKey, docType) {
  const { title, content, bullets } = section;
  const items = [];

  // Extract component names from bullets
  const componentBullets = bullets.filter(
    (b) =>
      b.match(/^[A-Z]/) || // Starts with capital (component name)
      b.toLowerCase().includes("component") ||
      b.toLowerCase().includes("sidebar") ||
      b.toLowerCase().includes("editor") ||
      b.toLowerCase().includes("list") ||
      b.toLowerCase().includes("header") ||
      b.toLowerCase().includes("footer") ||
      b.toLowerCase().includes("modal") ||
      b.toLowerCase().includes("form") ||
      b.toLowerCase().includes("button")
  );

  // Group related components or create individual stories
  if (componentBullets.length > 3) {
    // Create a single story for the component group
    let description = `## Description\n\n`;
    description += `Implement the core UI components for ${projectName} that enable the main user interactions.\n\n`;

    description += `### Components to Implement:\n\n`;
    componentBullets.forEach((comp) => {
      description += `- **${comp}**\n`;
    });

    description += `\n### Requirements:\n\n`;
    description += `- Components should be reusable and follow project conventions.\n`;
    description += `- Use consistent styling approach (CSS modules, styled-components, or Tailwind).\n`;
    description += `- Ensure accessibility (keyboard navigation, ARIA labels).\n\n`;

    description += `## Acceptance Criteria\n\n`;
    description += `- [ ] All listed components are implemented and render correctly.\n`;
    description += `- [ ] Components are properly typed (if using TypeScript).\n`;
    description += `- [ ] Components handle loading, error, and empty states where applicable.\n`;
    description += `- [ ] Styling is consistent with design specifications.\n`;
    description += `- [ ] Components are accessible and keyboard navigable.\n`;

    items.push({
      title: `Implement core UI components for ${projectName}`,
      description,
      issueType: "Story",
      labels: ["frontend", "ui", "components", projectName.toLowerCase()],
      priority: "High",
    });
  } else {
    // Create individual component stories
    componentBullets.forEach((comp) => {
      const componentName = comp.split(/\s*[-–—:,]\s*/)[0].trim();

      let description = `## Description\n\n`;
      description += `Implement the ${componentName} component for ${projectName}.\n\n`;
      description += `### Details:\n${comp}\n\n`;

      description += `## Acceptance Criteria\n\n`;
      description += `- [ ] Component renders correctly with all variants.\n`;
      description += `- [ ] Component handles edge cases (empty state, loading, errors).\n`;
      description += `- [ ] Component is accessible and keyboard navigable.\n`;
      description += `- [ ] Component is properly typed.\n`;

      items.push({
        title: `Implement ${componentName} component`,
        description,
        issueType: "Task",
        labels: ["frontend", "ui", projectName.toLowerCase()],
        priority: "Medium",
      });
    });
  }

  return items;
}

/**
 * Create API/integration story.
 */
function createAPIStory(section, projectName, projectKey, docType) {
  const { title, content, bullets } = section;

  let description = `## Description\n\n`;
  description += `Implement API integration layer for ${projectName} to enable data synchronization and backend communication.\n\n`;

  description += `### Include:\n\n`;

  if (bullets.length > 0) {
    bullets.slice(0, 6).forEach((item) => {
      description += `- ${item}\n`;
    });
  } else {
    description += `- Set up API client with proper error handling.\n`;
    description += `- Implement authentication flow if required.\n`;
    description += `- Create service functions for CRUD operations.\n`;
  }

  description += `\n## Acceptance Criteria\n\n`;
  description += `- [ ] API client is properly configured.\n`;
  description += `- [ ] Error handling provides meaningful feedback.\n`;
  description += `- [ ] Network requests are properly typed.\n`;
  description += `- [ ] Loading states are handled in the UI.\n`;
  description += `- [ ] API calls are tested with mock data.\n`;

  return {
    title: `Implement API integration for ${projectName}`,
    description,
    issueType: "Story",
    labels: ["api", "integration", "backend", projectName.toLowerCase()],
    priority: "Medium",
  };
}

/**
 * Create feature stories from bullets.
 */
function createFeatureStories(section, projectName, projectKey, docType) {
  const { bullets } = section;
  const items = [];

  bullets.slice(0, 5).forEach((bullet, index) => {
    // Skip very short bullets or non-feature items
    if (bullet.length < 15) return;

    const featureName = extractFeatureName(bullet);

    let description = `## Description\n\n`;
    description += `Implement the following feature for ${projectName}:\n\n`;
    description += `> ${bullet}\n\n`;

    description += `## Acceptance Criteria\n\n`;
    description += `- [ ] Feature works as described.\n`;
    description += `- [ ] UI is intuitive and matches design.\n`;
    description += `- [ ] Edge cases are handled gracefully.\n`;
    description += `- [ ] Feature is accessible.\n`;
    description += `- [ ] Changes are tested.\n`;

    items.push({
      title: featureName,
      description,
      issueType: "Story",
      labels: ["feature", projectName.toLowerCase()],
      priority: index === 0 ? "High" : "Medium",
    });
  });

  return items;
}

/**
 * Create requirement stories.
 */
function createRequirementStories(section, projectName, projectKey, docType) {
  const { bullets } = section;
  const items = [];

  bullets.slice(0, 5).forEach((bullet, index) => {
    if (bullet.length < 15) return;

    const reqName = extractFeatureName(bullet);

    let description = `## Description\n\n`;
    description += `Implement the following requirement:\n\n`;
    description += `> ${bullet}\n\n`;

    description += `## Acceptance Criteria\n\n`;
    description += `- [ ] Requirement is fully implemented.\n`;
    description += `- [ ] Implementation is tested.\n`;
    description += `- [ ] Documentation is updated.\n`;

    items.push({
      title: reqName,
      description,
      issueType: "Story",
      labels: ["requirement", projectName.toLowerCase()],
      priority: "High",
    });
  });

  return items;
}

/**
 * Create future/backlog stories with lower priority.
 */
function createFutureStories(section, projectName, projectKey, docType) {
  const { bullets } = section;
  const items = [];

  bullets.slice(0, 3).forEach((bullet) => {
    if (bullet.length < 15) return;

    const featureName = extractFeatureName(bullet);

    let description = `## Description\n\n`;
    description += `Future enhancement for ${projectName}:\n\n`;
    description += `> ${bullet}\n\n`;

    description += `## Notes\n\n`;
    description += `- This is a future/nice-to-have item.\n`;
    description += `- Priority should be reassessed when MVP is complete.\n`;

    items.push({
      title: featureName,
      description,
      issueType: "Story",
      labels: ["future", "nice-to-have", projectName.toLowerCase()],
      priority: "Low",
    });
  });

  return items;
}

/**
 * Analyze generic bullets and create appropriate stories.
 */
function analyzeBulletsForStories(section, projectName, projectKey, docType) {
  const { title, bullets } = section;
  const items = [];

  // Check if bullets form a cohesive feature area
  if (bullets.length >= 2 && title.length > 3) {
    let description = `## Description\n\n`;
    description += `Implement the "${title}" functionality for ${projectName}.\n\n`;

    description += `### Requirements:\n\n`;
    bullets.slice(0, 6).forEach((bullet) => {
      description += `- ${bullet}\n`;
    });

    description += `\n## Acceptance Criteria\n\n`;
    description += `- [ ] All requirements above are implemented.\n`;
    description += `- [ ] Implementation is tested.\n`;
    description += `- [ ] Documentation is updated.\n`;
    description += `- [ ] Code follows project standards.\n`;

    items.push({
      title: `Implement ${title}`,
      description,
      issueType: "Story",
      labels: ["feature", projectName.toLowerCase()],
      priority: "Medium",
    });
  }

  return items;
}

/**
 * Extract a meaningful feature name from a bullet point.
 */
function extractFeatureName(bullet) {
  // Clean up the bullet
  let name = bullet
    .replace(/^[-•*]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  // If it's too long, truncate at a reasonable point
  if (name.length > 80) {
    const truncated = name.substring(0, 77);
    const lastSpace = truncated.lastIndexOf(" ");
    name =
      lastSpace > 50
        ? truncated.substring(0, lastSpace) + "..."
        : truncated + "...";
  }

  // Ensure it starts with a verb or "Implement"
  const startsWithVerb =
    /^(implement|create|build|add|enable|support|integrate|configure|set up|design|develop)/i.test(
      name
    );

  if (!startsWithVerb) {
    // Try to make it action-oriented
    if (name.toLowerCase().startsWith("the ")) {
      name = "Implement " + name.substring(4);
    } else {
      name = "Implement " + name.charAt(0).toLowerCase() + name.slice(1);
    }
  }

  // Capitalize first letter
  name = name.charAt(0).toUpperCase() + name.slice(1);

  return name;
}

/**
 * Create a fallback story when no specific items are detected.
 */
function createFallbackStory(pageTitle, plainText, projectKey) {
  const projectName = extractProjectName(pageTitle, plainText);

  let description = `## Description\n\n`;
  description += `Review and implement the requirements documented in "${pageTitle}".\n\n`;

  // Include summary of content
  const contentPreview =
    plainText.length > 500 ? plainText.substring(0, 500) + "..." : plainText;
  description += `### Document Summary:\n\n${contentPreview}\n\n`;

  description += `## Acceptance Criteria\n\n`;
  description += `- [ ] All documented requirements are reviewed.\n`;
  description += `- [ ] Requirements are broken down into smaller tasks if needed.\n`;
  description += `- [ ] Implementation plan is created.\n`;
  description += `- [ ] Stakeholders are aligned on scope.\n`;

  return {
    title: `Review and implement: ${pageTitle}`,
    description,
    issueType: "Story",
    labels: ["needs-breakdown", "planning", projectName.toLowerCase()],
    priority: "Medium",
  };
}

/**
 * Deduplicate items by similar titles and prioritize.
 */
function deduplicateAndPrioritize(items) {
  const unique = [];
  const seenTitles = new Set();

  // Sort by priority first (High > Medium > Low)
  const priorityOrder = { High: 0, Medium: 1, Low: 2, Highest: -1, Lowest: 3 };
  items.sort(
    (a, b) =>
      (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
  );

  items.forEach((item) => {
    // Normalize title for comparison
    const normalizedTitle = item.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 40);

    if (!seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      unique.push(item);
    }
  });

  return unique;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate storage key for a page's backlog.
 */
function getStorageKey(pageId, projectKey) {
  return `${STORAGE_KEY_PREFIX}${pageId}_${projectKey}`;
}

/**
 * Calculate cache age string.
 */
function getCacheAgeString(timestamp) {
  const ageMs = Date.now() - timestamp;
  const minutes = Math.floor(ageMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}

// ============================================================================
// RESOLVERS
// ============================================================================

/**
 * Resolver: ping - Health check endpoint.
 */
resolver.define("ping", () => {
  return { message: "Confluence Task Generator v3.0 - Semantic Analysis 🧠" };
});

/**
 * Resolver: getProjects - Fetch Jira projects.
 */
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

/**
 * Resolver: getConfluenceSpaces - Fetch Confluence spaces.
 */
resolver.define("getConfluenceSpaces", async () => {
  const res = await api
    .asUser()
    .requestConfluence(route`/wiki/api/v2/spaces?limit=50&sort=name`);

  if (!res.ok) {
    const text = await res.text();
    console.error("getConfluenceSpaces error:", res.status, text);
    throw new Error("Failed to fetch Confluence spaces");
  }

  const data = await res.json();
  const spaces = (data.results || []).map((s) => ({
    id: s.id,
    key: s.key,
    name: s.name,
    type: s.type,
  }));

  return { spaces };
});

/**
 * Resolver: getConfluencePages - Fetch pages in a space.
 */
resolver.define("getConfluencePages", async ({ payload }) => {
  const { spaceId } = payload;

  if (!spaceId) {
    throw new Error("Space ID is required to fetch pages.");
  }

  const res = await api
    .asUser()
    .requestConfluence(
      route`/wiki/api/v2/spaces/${spaceId}/pages?limit=50&sort=title&status=current`
    );

  if (!res.ok) {
    const text = await res.text();
    console.error("getConfluencePages error:", res.status, text);
    throw new Error("Failed to fetch Confluence pages for this space");
  }

  const data = await res.json();
  const pages = (data.results || []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    spaceId: p.spaceId,
  }));

  return { pages };
});

/**
 * Resolver: analyzeConfluencePage
 *
 * Performs semantic analysis of a Confluence page and generates
 * well-structured, meaningful backlog items.
 */
resolver.define("analyzeConfluencePage", async ({ payload }) => {
  const { pageId, pageTitle, projectKey } = payload;

  if (!pageId) {
    throw new Error("Please select a Confluence page to analyze.");
  }

  // Check for cached analysis first
  const storageKey = getStorageKey(pageId, projectKey);
  const cachedData = await storage.get(storageKey);

  if (cachedData && cachedData.timestamp) {
    // Cache is valid for 1 hour
    const cacheAge = Date.now() - cachedData.timestamp;
    if (cacheAge < 3600000) {
      console.log("Returning cached analysis for", storageKey);
      return {
        ...cachedData,
        fromCache: true,
        cacheAge: getCacheAgeString(cachedData.timestamp),
      };
    }
  }

  // Fetch the Confluence page
  const res = await api
    .asUser()
    .requestConfluence(route`/wiki/api/v2/pages/${pageId}?body-format=storage`);

  if (!res.ok) {
    const text = await res.text();
    console.error("Confluence fetch error:", res.status, text);

    if (res.status === 404) {
      throw new Error(`Confluence page not found (ID: ${pageId}).`);
    } else if (res.status === 403) {
      throw new Error(
        "You don't have permission to access this Confluence page."
      );
    } else {
      throw new Error(`Failed to fetch Confluence page: ${res.status}`);
    }
  }

  const pageData = await res.json();
  const bodyHtml = pageData.body?.storage?.value || "";
  const actualTitle = pageData.title || pageTitle || "Untitled";

  console.log(
    "Analyzing page:",
    actualTitle,
    "Content length:",
    bodyHtml.length
  );

  // Parse and analyze the content
  const parsedContent = parseConfluenceContent(bodyHtml);
  console.log("Parsed sections:", parsedContent.sections.length);

  // Perform semantic analysis
  const issues = analyzeDocumentSemantics(
    parsedContent,
    actualTitle,
    projectKey
  );
  console.log("Generated issues:", issues.length);

  // Generate analysis summary
  const summary = generateAnalysisSummary(issues, actualTitle, parsedContent);

  // Store in Forge Storage
  const analysisResult = {
    summary,
    issues,
    timestamp: Date.now(),
    pageTitle: actualTitle,
    raw: {
      sectionsFound: parsedContent.sections.length,
      contentLength: bodyHtml.length,
      issueTypes: countByProperty(issues, "issueType"),
      priorities: countByProperty(issues, "priority"),
    },
  };

  await storage.set(storageKey, analysisResult);

  return {
    ...analysisResult,
    fromCache: false,
  };
});

/**
 * Generate a summary of the analysis.
 */
function generateAnalysisSummary(issues, pageTitle, parsedContent) {
  const storyCount = issues.filter((i) => i.issueType === "Story").length;
  const taskCount = issues.filter((i) => i.issueType === "Task").length;
  const highPriorityCount = issues.filter(
    (i) => i.priority === "High" || i.priority === "Highest"
  ).length;

  let summary = `Analyzed "${pageTitle}" and extracted ${issues.length} backlog items.\n\n`;

  summary += `📊 Breakdown:\n`;
  summary += `• ${storyCount} User Stories\n`;
  summary += `• ${taskCount} Tasks\n`;
  summary += `• ${highPriorityCount} High Priority Items\n\n`;

  // Add key areas identified
  const areas = new Set();
  issues.forEach((i) => {
    i.labels.forEach((l) => {
      if (!["from-confluence", "auto-analyzed"].includes(l)) {
        areas.add(l);
      }
    });
  });

  if (areas.size > 0) {
    summary += `🏷️ Key Areas: ${[...areas].slice(0, 5).join(", ")}`;
  }

  return summary;
}

/**
 * Count items by a property value.
 */
function countByProperty(items, prop) {
  return items.reduce((acc, item) => {
    const val = item[prop] || "Unknown";
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Resolver: getStoredBacklog - Retrieve cached analysis.
 */
resolver.define("getStoredBacklog", async ({ payload }) => {
  const { pageId, projectKey } = payload;

  if (!pageId || !projectKey) {
    return { found: false };
  }

  const storageKey = getStorageKey(pageId, projectKey);
  const data = await storage.get(storageKey);

  if (data && data.timestamp) {
    // Check if still valid (1 hour)
    const age = Date.now() - data.timestamp;
    if (age < 3600000) {
      return {
        found: true,
        data,
        cacheAge: getCacheAgeString(data.timestamp),
      };
    }
  }

  return { found: false };
});

/**
 * Resolver: clearStoredBacklog - Clear cached analysis.
 */
resolver.define("clearStoredBacklog", async ({ payload }) => {
  const { pageId, projectKey } = payload;

  if (!pageId || !projectKey) {
    return { success: false };
  }

  const storageKey = getStorageKey(pageId, projectKey);
  await storage.delete(storageKey);

  return { success: true };
});

/**
 * Resolver: createJiraIssues - Create Jira issues from backlog items.
 */
resolver.define("createJiraIssues", async ({ payload }) => {
  const { projectKey, pageId, pageTitle, issues } = payload;

  if (!projectKey) {
    throw new Error("Project key is required to create issues.");
  }

  if (!issues || issues.length === 0) {
    throw new Error("No issues provided to create.");
  }

  const created = [];
  const errors = [];

  for (const issue of issues) {
    try {
      // Build the issue payload
      const issuePayload = {
        fields: {
          project: { key: projectKey },
          summary: (issue.title || "Untitled").trim().substring(0, 255),
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: issue.description || "No description provided.",
                  },
                ],
              },
            ],
          },
          issuetype: { name: issue.issueType || "Task" },
        },
      };

      // Add labels if provided
      const labels = Array.isArray(issue.labels)
        ? issue.labels
        : typeof issue.labels === "string"
        ? issue.labels.split(",").map((l) => l.trim())
        : [];

      if (labels.length > 0) {
        issuePayload.fields.labels = labels.filter((l) => l.length > 0);
      }

      // Create the issue
      const res = await api.asUser().requestJira(route`/rest/api/3/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issuePayload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Issue creation failed:", res.status, errText);
        errors.push({
          issue,
          error: `API Error ${res.status}: ${errText.substring(0, 200)}`,
        });
        continue;
      }

      const createdIssue = await res.json();
      created.push({
        key: createdIssue.key,
        id: createdIssue.id,
        summary: issue.title,
        self: createdIssue.self,
      });

      console.log("Created issue:", createdIssue.key);
    } catch (err) {
      console.error("Issue creation exception:", err);
      errors.push({
        issue,
        error: err.message || "Unknown error",
      });
    }
  }

  // Clear cache after creating issues
  if (pageId && projectKey) {
    const storageKey = getStorageKey(pageId, projectKey);
    await storage.delete(storageKey);
  }

  return { created, errors };
});

// ============================================================================
// ROVO ACTION HANDLER
// ============================================================================

/**
 * Rovo Action Handler: Store AI-Generated Backlog Items
 *
 * This function is invoked by the Rovo Agent AFTER it has analyzed the
 * Confluence content using Atlassian Intelligence. The Agent passes the
 * AI-generated backlog items as a JSON string for storage.
 *
 * Flow:
 * 1. User triggers Rovo Agent with Confluence content
 * 2. Rovo Agent (AI) analyzes content and generates backlog items
 * 3. Agent invokes this action with the generated items
 * 4. This handler parses and stores items in Forge Storage
 * 5. UI can then retrieve and display the stored items
 *
 * @param {Object} request - The action request from Rovo Agent
 * @returns {Object} Result indicating success/failure
 */
export async function backlogActionHandler(request) {
  console.log(
    "=== Rovo Action Handler Invoked ===",
    JSON.stringify(request, null, 2)
  );

  // Extract inputs from the request - handle different payload structures
  // Rovo Agent can pass data in various ways
  const inputs = request.context?.inputs || request.payload || request;
  const { backlogItems, pageTitle, projectKey, pageId, analysisSummary } =
    inputs;

  // Validate required inputs
  if (!backlogItems || !pageTitle || !projectKey || !pageId) {
    console.error("Missing required inputs:", {
      hasBacklogItems: !!backlogItems,
      hasPageTitle: !!pageTitle,
      hasProjectKey: !!projectKey,
      hasPageId: !!pageId,
    });
    return {
      success: false,
      error:
        "Missing required inputs. Need: backlogItems, pageTitle, projectKey, pageId",
    };
  }

  try {
    console.log("Processing AI-generated backlog for page:", pageTitle);

    // Parse the backlog items JSON from the AI
    // The AI passes items as a JSON string that we need to parse
    let issues;
    if (typeof backlogItems === "string") {
      try {
        issues = JSON.parse(backlogItems);
      } catch (parseError) {
        console.error("Failed to parse backlogItems JSON:", parseError.message);
        // Try to extract JSON from the string if it's wrapped in text
        const jsonMatch = backlogItems.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          issues = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error(
            "Could not parse backlog items JSON: " + parseError.message
          );
        }
      }
    } else if (Array.isArray(backlogItems)) {
      issues = backlogItems;
    } else {
      throw new Error("backlogItems must be a JSON string or array");
    }

    console.log("Parsed AI-generated issues:", issues.length);

    // Validate and normalize each issue
    const normalizedIssues = issues
      .map((issue, index) => {
        // Validate required fields
        if (!issue.title) {
          console.warn(`Issue ${index} missing title, skipping`);
          return null;
        }

        // Normalize issue type to match Jira's expected values
        const validTypes = ["Story", "Task", "Bug", "Epic"];
        let issueType = issue.issueType || issue.type || "Task";
        if (!validTypes.includes(issueType)) {
          // Try to match partial/lowercase
          const lowerType = issueType.toLowerCase();
          if (lowerType.includes("story")) issueType = "Story";
          else if (lowerType.includes("bug")) issueType = "Bug";
          else if (lowerType.includes("epic")) issueType = "Epic";
          else issueType = "Task";
        }

        // Normalize priority
        const validPriorities = ["Highest", "High", "Medium", "Low", "Lowest"];
        let priority = issue.priority || "Medium";
        if (!validPriorities.includes(priority)) {
          const lowerPri = priority.toLowerCase();
          if (lowerPri.includes("high"))
            priority = lowerPri.includes("est") ? "Highest" : "High";
          else if (lowerPri.includes("low"))
            priority = lowerPri.includes("est") ? "Lowest" : "Low";
          else priority = "Medium";
        }

        // Ensure labels is an array
        let labels = issue.labels || [];
        if (typeof labels === "string") {
          labels = labels.split(",").map((l) => l.trim());
        }

        return {
          title: issue.title.substring(0, 255), // Jira title max length
          description: issue.description || `Task: ${issue.title}`,
          issueType,
          priority,
          labels: labels.filter((l) => l && l.length > 0),
          // Preserve any additional fields the AI added
          estimatedEffort: issue.estimatedEffort || null,
          technicalNotes: issue.technicalNotes || null,
        };
      })
      .filter(Boolean); // Remove nulls from invalid issues

    console.log("Normalized issues count:", normalizedIssues.length);

    // Build the summary for storage
    const summary =
      analysisSummary ||
      `AI-Generated Analysis: ${normalizedIssues.length} backlog items extracted from "${pageTitle}"`;

    // Generate statistics for the UI
    const stats = {
      total: normalizedIssues.length,
      byType: countByProperty(normalizedIssues, "issueType"),
      byPriority: countByProperty(normalizedIssues, "priority"),
    };

    // Store in Forge Storage
    const storageKey = getStorageKey(pageId, projectKey);
    const analysisResult = {
      summary,
      issues: normalizedIssues,
      timestamp: Date.now(),
      pageTitle,
      projectKey,
      pageId,
      usedAI: true,
      source: "rovo-agent", // Indicates this came from Rovo AI
      stats,
    };

    await storage.set(storageKey, analysisResult);
    console.log("Stored AI-generated analysis with key:", storageKey);

    // Return success response to Rovo Agent
    return {
      success: true,
      message: `Successfully stored ${normalizedIssues.length} AI-generated backlog items for "${pageTitle}"`,
      itemCount: normalizedIssues.length,
      storageKey,
      statistics: stats,
      // Preview of generated items for the Agent to display
      preview: normalizedIssues.slice(0, 3).map((i) => ({
        title: i.title,
        type: i.issueType,
        priority: i.priority,
      })),
    };
  } catch (error) {
    console.error("Rovo Action error:", error);
    return {
      success: false,
      error: error.message || "Failed to store AI-generated backlog items",
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export the resolver handler for the main function
export const handler = resolver.getDefinitions();
