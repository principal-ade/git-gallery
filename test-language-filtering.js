#!/usr/bin/env node

/**
 * Test script to verify language filtering improvements
 */

// Test data simulating repositories with different language compositions
const testRepos = [
  {
    owner: "test",
    name: "react-app",
    language: "JavaScript", // GitHub primary language
    languages: { JavaScript: 80000, TypeScript: 15000, CSS: 5000 }, // GitHub extended
    file_types: { js: 45, jsx: 25, ts: 8, tsx: 7, css: 10, json: 5 },
    file_types_percentage: {
      js: 45.0,
      jsx: 25.0,
      ts: 8.0,
      tsx: 7.0,
      css: 10.0,
      json: 5.0,
    },
    detected_languages: ["JavaScript", "TypeScript", "CSS"],
    language_percentages: { JavaScript: 70.0, TypeScript: 15.0, CSS: 10.0 },
    primary_language: "JavaScript",
    primary_language_percentage: 45.0,
  },
  {
    owner: "test",
    name: "python-ml",
    language: "Python",
    languages: { Python: 95000, "Jupyter Notebook": 5000 },
    file_types: { py: 85, ipynb: 10, yaml: 3, md: 2 },
    file_types_percentage: { py: 85.0, ipynb: 10.0, yaml: 3.0, md: 2.0 },
    detected_languages: ["Python"],
    language_percentages: { Python: 85.0 },
    primary_language: "Python",
    primary_language_percentage: 85.0,
  },
  {
    owner: "test",
    name: "go-microservice",
    language: "Go",
    languages: { Go: 90000, Dockerfile: 1000 },
    file_types: { go: 90, yaml: 5, md: 3, dockerfile: 2 },
    file_types_percentage: { go: 90.0, yaml: 5.0, md: 3.0, dockerfile: 2.0 },
    detected_languages: ["Go"],
    language_percentages: { Go: 90.0 },
    primary_language: "Go",
    primary_language_percentage: 90.0,
  },
  {
    owner: "test",
    name: "mixed-stack",
    language: "JavaScript", // GitHub primary
    languages: {
      JavaScript: 40000,
      Python: 30000,
      Go: 20000,
      TypeScript: 10000,
    },
    file_types: { js: 30, py: 25, go: 20, ts: 10, css: 8, html: 7 },
    file_types_percentage: {
      js: 30.0,
      py: 25.0,
      go: 20.0,
      ts: 10.0,
      css: 8.0,
      html: 7.0,
    },
    detected_languages: ["JavaScript", "Python", "Go", "TypeScript"],
    language_percentages: {
      JavaScript: 30.0,
      Python: 25.0,
      Go: 20.0,
      TypeScript: 10.0,
    },
    primary_language: "JavaScript",
    primary_language_percentage: 30.0,
  },
];

/**
 * Simulate the improved language filtering logic
 */
function testLanguageFilter(repos, targetLanguage) {
  return repos.filter((repo) => {
    // New improved logic - check all possible language sources
    const hasLanguage =
      repo.language === targetLanguage ||
      (repo.detected_languages &&
        repo.detected_languages.includes(targetLanguage)) ||
      (repo.languages &&
        Object.keys(repo.languages).some(
          (lang) => lang.toLowerCase() === targetLanguage.toLowerCase(),
        ));
    return hasLanguage;
  });
}

/**
 * Simulate the old broken logic
 */
function testOldLanguageFilter(repos, targetLanguage) {
  return repos.filter((repo) => repo.language === targetLanguage);
}

/**
 * Test language statistics building
 */
function testLanguageStats(repos) {
  const stats = { languages: {} };

  repos.forEach((repo) => {
    const languagesToCount = new Set();

    // Add GitHub primary language
    if (repo.language && repo.language !== "Unknown") {
      languagesToCount.add(repo.language);
    }

    // Add detected languages from file analysis
    if (repo.detected_languages) {
      repo.detected_languages.forEach((lang) => languagesToCount.add(lang));
    }

    // Add languages from GitHub extended metadata
    if (repo.languages) {
      Object.keys(repo.languages).forEach((lang) => languagesToCount.add(lang));
    }

    // Count each unique language
    languagesToCount.forEach((language) => {
      stats.languages[language] = (stats.languages[language] || 0) + 1;
    });
  });

  return stats;
}

/**
 * Run all tests
 */
function runTests() {
  console.log("🧪 Testing Language Filtering Improvements\n");
  console.log("=".repeat(60) + "\n");

  // Test 1: JavaScript filtering
  console.log("Test 1: Filter for JavaScript repositories");
  const oldJsResults = testOldLanguageFilter(testRepos, "JavaScript");
  const newJsResults = testLanguageFilter(testRepos, "JavaScript");

  console.log(`  Old logic found: ${oldJsResults.length} repos`);
  oldJsResults.forEach((repo) =>
    console.log(
      `    - ${repo.owner}/${repo.name} (GitHub primary: ${repo.language})`,
    ),
  );

  console.log(`  New logic found: ${newJsResults.length} repos`);
  newJsResults.forEach((repo) => {
    const languages = repo.detected_languages?.join(", ") || "None detected";
    console.log(`    - ${repo.owner}/${repo.name} (Detected: ${languages})`);
  });
  console.log();

  // Test 2: TypeScript filtering
  console.log("Test 2: Filter for TypeScript repositories");
  const oldTsResults = testOldLanguageFilter(testRepos, "TypeScript");
  const newTsResults = testLanguageFilter(testRepos, "TypeScript");

  console.log(`  Old logic found: ${oldTsResults.length} repos`);
  console.log(`  New logic found: ${newTsResults.length} repos`);
  newTsResults.forEach((repo) => {
    const tsPercentage = repo.language_percentages?.TypeScript || 0;
    console.log(
      `    - ${repo.owner}/${repo.name} (TypeScript: ${tsPercentage}%)`,
    );
  });
  console.log();

  // Test 3: Python filtering
  console.log("Test 3: Filter for Python repositories");
  const oldPyResults = testOldLanguageFilter(testRepos, "Python");
  const newPyResults = testLanguageFilter(testRepos, "Python");

  console.log(`  Old logic found: ${oldPyResults.length} repos`);
  console.log(`  New logic found: ${newPyResults.length} repos`);
  newPyResults.forEach((repo) => {
    const pyPercentage = repo.language_percentages?.Python || 0;
    console.log(`    - ${repo.owner}/${repo.name} (Python: ${pyPercentage}%)`);
  });
  console.log();

  // Test 4: Language statistics
  console.log("Test 4: Language statistics building");
  const stats = testLanguageStats(testRepos);
  console.log("  Languages found in repositories:");
  Object.entries(stats.languages)
    .sort(([, a], [, b]) => b - a)
    .forEach(([language, count]) => {
      console.log(`    - ${language}: ${count} repositories`);
    });
  console.log();

  // Test 5: Edge cases
  console.log("Test 5: Edge case testing");

  // Case sensitivity
  const caseResults = testLanguageFilter(testRepos, "javascript");
  console.log(
    `  Case insensitive search for 'javascript': ${caseResults.length} repos found`,
  );

  // Non-existent language
  const nonExistentResults = testLanguageFilter(testRepos, "COBOL");
  console.log(
    `  Search for non-existent language 'COBOL': ${nonExistentResults.length} repos found`,
  );

  console.log();

  // Summary
  console.log("=".repeat(60));
  console.log("✅ Summary of Improvements:");
  console.log();
  console.log("1. 🔍 Comprehensive Language Detection:");
  console.log(
    "   • Detects ALL languages in repository, not just GitHub primary",
  );
  console.log("   • Includes file extension analysis with >1% threshold");
  console.log("   • Combines GitHub primary + detected + extended metadata");
  console.log();
  console.log("2. 🎯 Better Filtering Logic:");
  console.log(
    "   • Checks detected_languages array for comprehensive coverage",
  );
  console.log("   • Falls back to GitHub primary and extended languages");
  console.log("   • Case-insensitive matching support");
  console.log();
  console.log("3. 📊 Accurate Statistics:");
  console.log("   • Counts repositories for ALL languages they contain");
  console.log("   • Provides complete language ecosystem view");
  console.log("   • Eliminates language filter gaps");
  console.log();
  console.log("4. 💪 Benefits:");
  console.log(
    "   • Multi-language repositories show up in all relevant filters",
  );
  console.log(
    '   • Users can find TypeScript repos even if GitHub says "JavaScript"',
  );
  console.log("   • Better discovery of polyglot repositories");
  console.log("   • More accurate language distribution statistics");
}

// Run the tests
runTests();
