# Git Gallery

Git Gallery is an interactive 2D visualization tool for exploring and visualizing Git repositories.

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) with your browser to see the result.

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- @principal-ai/code-city-react - Repository visualization library

## Features

- **Repository Visualization**: Interactive 2D mosaic views of repository structure
- **Git History**: Animated visualization of repository changes over time
- **PR & Release Comparison**: Visual comparison of pull requests and releases
- **City Planning View**: Alternative architectural visualization
- **Gallery**: Browse and explore multiple repositories
- **Color Palette**: Customizable file type color schemes

## Project Structure

```
git-gallery/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes
│   │   ├── mosaic/       # Mosaic visualization pages
│   │   ├── git-history/  # Git history pages
│   │   ├── pr/           # PR comparison pages
│   │   └── gallery/      # Gallery pages
│   ├── components/       # React components
│   ├── services/         # Business logic & services
│   ├── lib/              # Utilities & libraries
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
└── docs/                 # Documentation
```

## Development

The app runs on port 3002 by default.
