import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.');
const publish = resolve(root, '.netlify-publish');
const dashboard = 'core-kpi-dashboard.html';

await rm(publish, { recursive: true, force: true });
await mkdir(publish, { recursive: true });
await cp(resolve(root, 'index.html'), resolve(publish, 'index.html'));
await cp(resolve(root, dashboard), resolve(publish, dashboard));
