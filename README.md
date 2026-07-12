# CreditCrew AI

## App Description
CreditCrew AI is a React and TypeScript web application built to support MSME underwriting workflows. It helps teams review application data, manage documents, and track progress through a streamlined, user-friendly experience.

## Tech Stack
- Frontend: React 19, TypeScript, Vite
- Routing and state: TanStack Router, TanStack Start, React Query
- UI: Tailwind CSS, shadcn/ui, Radix UI
- Data and integrations: Supabase, Lovable integrations
- Tooling: ESLint, Prettier, TypeScript

## Project Structure
- src/routes: application routes and page components
- src/components: shared UI and CreditCrew-specific components
- src/lib: domain logic, document helpers, utilities, and error handling
- src/integrations: Supabase and Lovable integration modules
- supabase: database config and migration files
- terraform: infrastructure as code for deployment environments
- docs: architecture, runbook, and implementation notes

## Agents
This repository includes repository-specific guidance in AGENTS.md for contributors and automation. Follow those instructions when working on the project to stay aligned with the expected workflow and constraints.

## Features
- Application review workflows for MSME underwriting
- Document management and document panel experience
- Dashboard and history views for tracking progress
- Guided routes for creating and viewing applications
- Built-in error handling and reporting support
- Responsive, modern UI with reusable component libraries

## Getting Started
Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Useful scripts:

- `npm run dev` - start the development server
- `npm run build` - build the app for production
- `npm run lint` - run linting
- `npm run format` - format the codebase with Prettier

## Notes
- The project is connected to Lovable, so avoid rewriting published git history.
- Environment-specific infrastructure configuration is stored under the terraform and supabase folders.
