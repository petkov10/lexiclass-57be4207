# AGENTS.md
- Docker builds use NITRO_PRESET=node-server and run `.output/server/index.mjs`; Lovable hosting keeps the default Cloudflare target — so one codebase serves both.
- Visitor (anon) read access uses separate simple RLS policies without SECURITY DEFINER calls; editor policies are scoped TO authenticated — avoids "permission denied for function" for visitors.
