// PM2 Ecosystem File — manages the Teeny Tanks game server process.
//
// Usage:
//   pm2 start ecosystem.config.cjs          # first time
//   pm2 reload ecosystem.config.cjs         # after code changes (zero-downtime)
//   pm2 stop teeny-tanks                    # stop the server
//   pm2 delete teeny-tanks                  # remove from pm2 process list
//
// IMPORTANT: JWT_SECRET must be set before starting pm2. See deploy/FIRST-DEPLOY.md.
// If JWT_SECRET is not set, the server falls back to a hardcoded dev secret which is
// NOT safe for production.

module.exports = {
  apps: [
    {
      name: 'teeny-tanks',
      script: 'packages/server/dist/index.js',
      cwd: __dirname,

      // Environment variables for the server process.
      // JWT_SECRET is intentionally NOT set here — it must come from the shell
      // environment on the server (e.g. ~/.bashrc). This keeps secrets out of git.
      // See deploy/FIRST-DEPLOY.md Step 11 for setup instructions.
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
