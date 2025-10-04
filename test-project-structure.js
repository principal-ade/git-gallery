#!/usr/bin/env node

/**
 * Test script for project structure analysis functionality
 * Tests detection of project boundaries, monorepo patterns, and ecosystem classification
 */

const API_BASE = "http://localhost:3000/api/filetree-cache/search-index";

async function testProjectStructureFilters() {
  console.log("🧪 Testing Project Structure Analysis\n");

  const tests = [
    {
      name: "Single Project Repositories",
      filters: { project_structure_type: "single" },
      description: "Repositories with single project structure",
    },
    {
      name: "Monorepo Repositories",
      filters: { is_monorepo: "true" },
      description: "Repositories identified as monorepos",
    },
    {
      name: "Multi-Ecosystem Projects",
      filters: { has_multiple_ecosystems: "true" },
      description: "Projects using multiple programming ecosystems",
    },
    {
      name: "Node.js Ecosystem",
      filters: { primary_ecosystem: "node" },
      description: "Projects primarily using Node.js ecosystem",
    },
    {
      name: "Python Ecosystem",
      filters: { primary_ecosystem: "python" },
      description: "Projects primarily using Python ecosystem",
    },
    {
      name: "Java Ecosystem",
      filters: { primary_ecosystem: "java" },
      description: "Projects primarily using Java ecosystem",
    },
    {
      name: "Large Projects (5+ subprojects)",
      filters: { min_projects: "5" },
      description: "Projects with 5 or more subprojects",
    },
    {
      name: "Polyglot Workspaces",
      filters: { workspace_type: "polyglot" },
      description: "Workspaces using multiple programming languages",
    },
    {
      name: "Large Monorepos",
      filters: { workspace_type: "large-monorepo" },
      description: "Large monorepo workspaces",
    },
    {
      name: "Multi-Module Projects",
      filters: { project_structure_type: "multi-module" },
      description: "Projects with multiple modules",
    },
  ];

  for (const test of tests) {
    console.log(`\n📊 ${test.name}`);
    console.log(`   ${test.description}`);

    try {
      const params = new URLSearchParams({ per_page: "5", ...test.filters });
      const response = await fetch(`${API_BASE}?${params.toString()}`);

      if (!response.ok) {
        console.log(`   ❌ API Error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log(`   ✅ Found ${data.pagination.total} repositories`);

      // Show sample repositories
      if (data.repositories.length > 0) {
        console.log(`   📝 Sample repositories:`);
        data.repositories.slice(0, 3).forEach((repo) => {
          const structureInfo = [];
          if (repo.is_monorepo) structureInfo.push("monorepo");
          if (repo.total_projects > 1)
            structureInfo.push(`${repo.total_projects} projects`);
          if (repo.has_multiple_ecosystems)
            structureInfo.push("multi-ecosystem");
          if (repo.primary_ecosystem && repo.primary_ecosystem !== "unknown") {
            structureInfo.push(`${repo.primary_ecosystem} primary`);
          }

          console.log(
            `      ${repo.owner}/${repo.name} - ${structureInfo.join(", ")}`,
          );

          if (repo.project_files && repo.project_files.length > 0) {
            const projectFiles = repo.project_files.slice(0, 3);
            console.log(
              `        Project files: ${projectFiles.map((f) => `${f.name} (${f.ecosystem})`).join(", ")}`,
            );
          }
        });
      }
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
    }
  }
}

async function testProjectBoundaryDetection() {
  console.log("\n\n🔍 Testing Project Boundary Detection\n");

  // Test with known repositories that should have different structures
  const testRepos = [
    "facebook/react",
    "microsoft/vscode",
    "vercel/next.js",
    "babel/babel",
    "facebook/react-native",
    "angular/angular",
    "vuejs/vue",
    "nodejs/node",
  ];

  for (const repo of testRepos) {
    const [owner, name] = repo.split("/");
    console.log(`\n📂 Analyzing ${owner}/${name}`);

    try {
      const params = new URLSearchParams({ owner, q: name, per_page: "1" });
      const response = await fetch(`${API_BASE}?${params.toString()}`);

      if (!response.ok) {
        console.log(`   ❌ API Error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const repoData = data.repositories.find(
        (r) => r.owner === owner && r.name === name,
      );

      if (!repoData) {
        console.log(`   ⚠️  Repository not found in search index`);
        continue;
      }

      console.log(`   📊 Project Structure Analysis:`);
      console.log(
        `      Type: ${repoData.project_structure_type || "unknown"}`,
      );
      console.log(`      Workspace: ${repoData.workspace_type || "unknown"}`);
      console.log(`      Projects: ${repoData.total_projects || 0}`);
      console.log(
        `      Ecosystems: ${repoData.ecosystem_diversity || 0} (${(repoData.ecosystems_detected || []).join(", ")})`,
      );
      console.log(
        `      Primary ecosystem: ${repoData.primary_ecosystem || "unknown"}`,
      );
      console.log(`      Is monorepo: ${repoData.is_monorepo ? "Yes" : "No"}`);
      console.log(
        `      Has nested projects: ${repoData.has_nested_projects ? "Yes" : "No"}`,
      );
      console.log(
        `      Architecture pattern: ${repoData.architecture_pattern || "unknown"}`,
      );

      if (
        repoData.boundary_file_types &&
        repoData.boundary_file_types.length > 0
      ) {
        console.log(
          `      Boundary file types: ${repoData.boundary_file_types.join(", ")}`,
        );
      }

      if (repoData.monorepo_tools && repoData.monorepo_tools.length > 0) {
        console.log(
          `      Monorepo tools: ${repoData.monorepo_tools.join(", ")}`,
        );
      }

      if (
        repoData.projects_by_ecosystem &&
        Object.keys(repoData.projects_by_ecosystem).length > 0
      ) {
        console.log(
          `      Projects by ecosystem:`,
          repoData.projects_by_ecosystem,
        );
      }
    } catch (error) {
      console.log(`   ❌ Analysis failed: ${error.message}`);
    }
  }
}

async function testEcosystemStatistics() {
  console.log("\n\n📈 Testing Ecosystem Statistics\n");

  try {
    const response = await fetch(`${API_BASE}?per_page=1`);

    if (!response.ok) {
      console.log(`❌ API Error: ${response.status}`);
      return;
    }

    const data = await response.json();

    if (data.stats) {
      console.log(`📊 Repository Statistics:`);
      console.log(`   Total repositories: ${data.stats.total_repos}`);
      console.log(
        `   Languages detected: ${Object.keys(data.stats.languages).length}`,
      );
      console.log(
        `   Top languages:`,
        Object.entries(data.stats.languages)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([lang, count]) => `${lang} (${count})`)
          .join(", "),
      );

      console.log(
        `   Categories: ${Object.keys(data.stats.categories).length}`,
      );
      console.log(`   Owners: ${Object.keys(data.stats.owners).length}`);

      if (data.stats.complexity_distribution) {
        console.log(
          `   Complexity distribution:`,
          data.stats.complexity_distribution,
        );
      }
    }
  } catch (error) {
    console.log(`❌ Statistics test failed: ${error.message}`);
  }
}

async function main() {
  console.log("🚀 Project Structure Analysis Test Suite\n");
  console.log(
    "Testing search index API for project boundary detection and filtering...\n",
  );

  await testProjectStructureFilters();
  await testProjectBoundaryDetection();
  await testEcosystemStatistics();

  console.log("\n✅ Project structure analysis testing completed!\n");
  console.log("💡 Key insights:");
  console.log(
    "   • Project boundaries are detected from manifest files like package.json, pom.xml, etc.",
  );
  console.log(
    "   • Monorepo detection looks for multiple projects or explicit monorepo tools",
  );
  console.log(
    "   • Ecosystem classification based on project file types and structure",
  );
  console.log(
    "   • Architecture patterns enhanced with project structure information",
  );
  console.log(
    "   • Advanced filtering enables discovery of specific project patterns\n",
  );
}

// Run the tests
main().catch(console.error);
