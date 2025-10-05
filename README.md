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

## Configuration

Authentication and gallery management rely on the following environment variables:

- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` – OAuth credentials for GitHub sign-in.
- `NEXTAUTH_SECRET` – Secret used by NextAuth.js to encrypt session data.
- `S3_GIT_MOSAICS` – S3 bucket that stores gallery metadata (each gallery record is persisted as JSON under the `galleries/` prefix).

Set these variables in your preferred `.env.local` file before starting the development server to unlock the gallery management experience.

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
- **Gallery Management**: Create and configure hackathon galleries with GitHub authentication and S3-backed storage
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
