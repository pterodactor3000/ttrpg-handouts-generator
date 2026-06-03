import { loadEnv } from 'vite';

Object.assign(process.env, loadEnv('test', process.cwd(), ''));
