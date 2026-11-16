// Runs the game server and the Vite dev server together; stops both when either exits.
import { spawn } from 'node:child_process';

const run = (workspace) =>
  spawn(`npm run dev -w ${workspace}`, { stdio: 'inherit', shell: true });

const children = [run('apps/server'), run('apps/web')];
for (const child of children)
  child.on('exit', (code) => {
    children.forEach((c) => c.kill());
    process.exit(code ?? 0);
  });
