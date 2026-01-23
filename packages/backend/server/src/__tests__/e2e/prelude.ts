import { getBuildConfig } from '@madisboard-tools/utils/build-config';
import { Package } from '@madisboard-tools/utils/workspace';

import { createApp } from './create-app';

globalThis.BUILD_CONFIG = getBuildConfig(new Package('@madisboard/web'), {
  mode: 'development',
  channel: 'canary',
});
// @ts-expect-error testing
globalThis.app = await createApp();
