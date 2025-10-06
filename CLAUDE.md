# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a cybersecurity IDS (Intrusion Detection System) built as an Electron desktop application. The application monitors Windows security events, manages firewall rules, and provides a React-based dashboard for security management.

## Architecture

### Main Components
- **Electron Main Process** (`main.js`): Handles application lifecycle, IPC communication, and system integration
- **React Frontend** (`src/renderer/`): TypeScript-based UI with component-driven architecture
- **Database Layer** (`db/`): SQLite with Sequelize ORM for data persistence
- **Security Utilities** (`src/utils/`): Core security functionality including firewall management and event scanning

### Key Modules
- `FirewallManager` (`src/utils/firewallManager.js`): Windows firewall rule management
- `scanForIpIn4625.js`: Windows Event Log 4625 (failed logon) analysis
- Database Models: `User`, `DetectedIP`, `WhitelistIP`, `WindowsEvent`

### Frontend Structure
- Components organized by feature: `dashboard/`, `firewall/`, `logs/`, `scripts/`, `whitelist/`
- TypeScript path aliases configured: `@components/*`, `@hooks/*`, `@types/*`, `@utils/*`
- State management through React hooks and Electron IPC

## Development Commands

### Build & Development
```bash
npm run dev                 # Start development mode with hot reload
npm run build-react         # Build React frontend (development)
npm run build-react-prod    # Build React frontend (production)
npm run build              # Build complete application for production
```

### Code Quality
```bash
npm run type-check         # TypeScript type checking
npm run lint              # ESLint code linting
npm run clean             # Clean build artifacts
```

### Testing
```bash
npm test                  # Currently no tests defined
```

## Configuration

### Environment Configuration
- Development/production configs in `config.json`
- Paths automatically adjusted based on `NODE_ENV`
- SQLite database stored in `db/config/database.sqlite`

### Build Configuration
- Electron Builder for packaging (`dist-app/` output)
- Webpack for React bundling (`dist/` output)
- TypeScript compilation with strict mode enabled

## Database Schema

Uses Sequelize ORM with SQLite:
- **User**: Authentication and user management
- **DetectedIP**: Tracked suspicious IP addresses
- **WhitelistIP**: Approved IP addresses
- **WindowsEvent**: Windows security event logs

## Security Features

- Windows Event Log monitoring (Event ID 4625)
- Automatic firewall rule management
- IP address whitelist/blacklist management
- Real-time security event dashboard
- PowerShell script execution for system monitoring

## Development Notes

- Uses Electron with security best practices (context isolation, no node integration in renderer)
- React 18 with TypeScript for type safety
- Tailwind CSS for styling
- ESLint configuration includes React and TypeScript rules
- Hot reload enabled in development mode via `electron-reload`