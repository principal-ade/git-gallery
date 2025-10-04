# 📚 Adding Tutorials to Your Code City

Learn how to configure interactive tutorials for your repository that will appear in the Code City interface.

## 🎯 Overview

Code City supports custom tutorials that help visitors understand your codebase, learn key concepts, and get started with contributing. Tutorials are displayed in the **Tutorials** tab and rendered as interactive slides.

## 📋 Configuration Structure

Tutorials are configured in your `city-config.json` file under the `tutorials` section:

```json
{
  "version": "1.0",
  "tutorials": {
    "autoDiscover": false,
    "discoveryDirectory": ".landmark-info",
    "customTutorials": [
      {
        "name": "Getting Started",
        "path": "docs/tutorials/getting-started.md",
        "description": "Learn the basics of this project",
        "icon": "🚀",
        "order": 1,
        "difficulty": "beginner",
        "estimatedTime": "10 minutes",
        "tags": ["basics", "setup"]
      }
    ]
  }
}
```

## 🏗️ Tutorial Properties

Each tutorial in the `customTutorials` array supports these properties:

| Property        | Type   | Required | Description                                          |
| --------------- | ------ | -------- | ---------------------------------------------------- |
| `name`          | string | ✅       | Display name for the tutorial                        |
| `path`          | string | ✅       | Path to the markdown file in your repository         |
| `description`   | string | ❌       | Brief description of tutorial content                |
| `icon`          | string | ❌       | Emoji icon to display with the tutorial              |
| `order`         | number | ❌       | Sort order (lower numbers appear first)              |
| `difficulty`    | string | ❌       | One of: `"beginner"`, `"intermediate"`, `"advanced"` |
| `estimatedTime` | string | ❌       | How long the tutorial takes (e.g., "15 minutes")     |
| `tags`          | array  | ❌       | Array of tag strings for categorization              |

## 📁 Configuration File Locations

Code City checks for configuration files in this priority order:

### 1. Local Configuration (Recommended)

Place your config in your repository:

```
your-repo/
├── .cosmic-landmark/
│   └── city-config.json
```

### 2. Community Configuration

Submit to the Voyager-Guides repository:

```
Voyager-Guides/
├── your-username/
│   └── your-repo/
│       └── city-config.json
```

> 💡 **Tip**: Local configurations always take precedence over community ones.

## 📝 Creating Tutorial Content

### Markdown Format

Tutorials should be written in standard Markdown and support:

- **Headers** (`#`, `##`, `###`) for slide breaks
- **Code blocks** with syntax highlighting
- **Images** and **links**
- **Lists** and **tables**
- **Emphasis** (`*italic*`, `**bold**`)

### Example Tutorial Structure

````markdown
# Welcome to Our Project

This tutorial will help you get started with contributing.

## Prerequisites

Before you begin, make sure you have:

- Node.js 16+ installed
- Git configured
- A GitHub account

## Setting Up Your Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/username/repo.git
   cd repo
   ```
````

2. Install dependencies:
   ```bash
   npm install
   ```

## Your First Contribution

Now you're ready to make your first change...

## Next Steps

- Check out our [advanced tutorials](advanced.md)
- Join our [Discord community](https://discord.gg/example)

```

## 🎨 Best Practices

### Tutorial Organization
- **Start simple**: Begin with beginner-friendly content
- **Progressive complexity**: Build from basic to advanced concepts
- **Clear structure**: Use consistent heading levels
- **Logical flow**: Each section should build on the previous

### Content Guidelines
- **Be concise**: Keep explanations clear and focused
- **Include examples**: Show, don't just tell
- **Add context**: Explain why, not just how
- **Test thoroughly**: Verify all code examples work

### File Organization
Organize tutorial files in a logical structure:

```

docs/
├── tutorials/
│ ├── getting-started.md
│ ├── advanced-features.md
│ ├── contributing.md
│ └── troubleshooting.md
├── images/
│ ├── tutorial-1-screenshot.png
│ └── setup-diagram.png

````

## 🔧 Configuration Examples

### Basic Setup
```json
{
  "version": "1.0",
  "tutorials": {
    "customTutorials": [
      {
        "name": "Quick Start",
        "path": "README.md",
        "description": "Get up and running in 5 minutes",
        "icon": "⚡",
        "order": 1,
        "difficulty": "beginner",
        "estimatedTime": "5 minutes"
      }
    ]
  }
}
````

### Advanced Setup

```json
{
  "version": "1.0",
  "tutorials": {
    "autoDiscover": true,
    "discoveryDirectory": ".landmark-info",
    "customTutorials": [
      {
        "name": "Architecture Overview",
        "path": "docs/architecture.md",
        "description": "Understanding the system design",
        "icon": "🏗️",
        "order": 1,
        "difficulty": "intermediate",
        "estimatedTime": "20 minutes",
        "tags": ["architecture", "design", "overview"]
      },
      {
        "name": "API Development",
        "path": "docs/tutorials/api-development.md",
        "description": "Building and testing APIs",
        "icon": "🔌",
        "order": 2,
        "difficulty": "advanced",
        "estimatedTime": "45 minutes",
        "tags": ["api", "backend", "testing"]
      },
      {
        "name": "Frontend Components",
        "path": "docs/tutorials/components.md",
        "description": "Creating reusable UI components",
        "icon": "🎨",
        "order": 3,
        "difficulty": "intermediate",
        "estimatedTime": "30 minutes",
        "tags": ["frontend", "ui", "components"]
      }
    ]
  }
}
```

## 🚀 Getting Started

1. **Create your tutorial content** in Markdown files
2. **Add tutorial configuration** to your `city-config.json`
3. **Place the config** in `.cosmic-landmark/city-config.json`
4. **Test your setup** by visiting your Code City
5. **Iterate and improve** based on user feedback

## 🔍 Troubleshooting

### Tutorials Not Appearing

- ✅ Check that `city-config.json` is in the correct location
- ✅ Verify JSON syntax is valid
- ✅ Ensure tutorial paths point to existing files
- ✅ Confirm file permissions allow public access

### Content Not Loading

- ✅ Verify markdown files are in the repository
- ✅ Check file paths are relative to repository root
- ✅ Ensure files are committed to the main branch

### Display Issues

- ✅ Validate that tutorial properties match expected types
- ✅ Check for special characters in tutorial names
- ✅ Verify estimated time format is readable

## 💡 Tips and Tricks

- **Use descriptive names**: Make tutorial titles clear and specific
- **Add visual cues**: Icons help users quickly identify content types
- **Estimate accurately**: Realistic time estimates improve user experience
- **Tag strategically**: Use consistent, meaningful tags for organization
- **Order thoughtfully**: Arrange tutorials in a logical learning progression

## 🤝 Community Contributions

Want to contribute tutorials to the community? Consider submitting your configuration to the [Voyager-Guides repository](https://github.com/The-Code-Cosmos/Voyager-Guides) to help other developers discover and learn from your project.

## 📞 Need Help?

- 📧 **Email**: [principle@principlemd.com](mailto:principle@principlemd.com)
- 🐛 **Issues**: Report problems on our GitHub repository
- 💬 **Community**: Join discussions in our community channels

---

_Happy tutorial building! 🎓_
