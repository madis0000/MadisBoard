import { setupGlobal } from '@madisboard/env/global';
import { getBuildConfig } from '@madisboard-tools/utils/build-config';
import { Package } from '@madisboard-tools/utils/workspace';

globalThis.BUILD_CONFIG = getBuildConfig(new Package('@madisboard/web'), {
  mode: 'development',
  channel: 'canary',
});

if (typeof window !== 'undefined') {
  window.location.search = '?prefixUrl=http://127.0.0.1:3010/';
}

setupGlobal();
