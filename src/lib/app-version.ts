import packageJson from '../../package.json';

function formatAppVersion(version: string): string {
  return `v${version}`;
}

const APP_VERSION = formatAppVersion(packageJson.version);

export { APP_VERSION, formatAppVersion };
