import { DesktopApiService } from '@madisboard/core/modules/desktop-api';
import {
  CacheStorage,
  GlobalCache,
  GlobalState,
} from '@madisboard/core/modules/storage';
import {
  ElectronGlobalCache,
  ElectronGlobalState,
} from '@madisboard/core/modules/storage/impls/electron';
import { IDBGlobalState } from '@madisboard/core/modules/storage/impls/storage';
import type { Framework } from '@toeverything/infra';

export function configureElectronStateStorageImpls(framework: Framework) {
  framework.impl(GlobalCache, ElectronGlobalCache, [DesktopApiService]);
  framework.impl(GlobalState, ElectronGlobalState, [DesktopApiService]);
  framework.impl(CacheStorage, IDBGlobalState);
}
