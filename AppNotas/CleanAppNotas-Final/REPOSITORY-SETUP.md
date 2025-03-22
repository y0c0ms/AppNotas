# Git Repository Setup for CleanAppNotas

This document provides instructions for setting up and maintaining the Git repository for CleanAppNotas.

## Initial Setup

1. Initialize the repository:
   ```
   git init
   ```

2. Create a `.gitignore` file with the following content:
   ```
   # Dependencies
   node_modules/
   
   # Build outputs
   dist/
   out/
   
   # Keep releases
   !releases/
   !releases/*.exe
   
   # Misc
   .DS_Store
   Thumbs.db
   *.log
   ```

3. Add all the files:
   ```
   git add .
   ```

4. Make the initial commit:
   ```
   git config user.email "your.email@example.com"
   git config user.name "Your Name"
   git commit -m "Initial commit of CleanAppNotas 1.0.0 - optimized for low resource usage"
   ```

5. Create a version tag:
   ```
   git tag -a v1.0.0 -m "Version 1.0.0 - Initial Stable Release"
   ```

## Repository Structure

The repository contains the following key components:

- `main.js` - Main Electron process file
- `src/` - Application source code
  - `app.js` - Core application logic
  - `index.html` - Main HTML structure
  - `styles.css` - Application styling
- `public/` - Static assets
- `scripts/` - Build scripts
- `releases/` - Pre-built application installers
- `package.json` - Project configuration

## Adding a Remote Repository

To add a remote repository:

```
git remote add origin [repository-url]
git push -u origin master
```

## Sharing the Repository

To share this repository:

1. Host it on GitHub, GitLab, or any other Git hosting service
2. Include the releases directory to make installation easy
3. Direct users to the installation instructions in README.md and INSTALL.md

## Releasing New Versions

When releasing a new version:

1. Update the version number in `package.json`
2. Build the application with `npm run build`
3. Copy the installer to the `releases` directory
4. Commit the changes
5. Create a new version tag
6. Push the changes and tags to the remote repository 