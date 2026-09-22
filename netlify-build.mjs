import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('.');
const publish = resolve(root, '.netlify-publish');
const dashboard = '핵심지표 대시보드(8월 실행계획 업데이트).html';

await rm(publish, { recursive: true, force: true });
await mkdir(publish, { recursive: true });
await cp(resolve(root, 'index.html'), resolve(publish, 'index.html'));
await cp(resolve(root, dashboard), resolve(publish, dashboard));
