import { PackageList, type PackageName } from './yarn';

export const PackageToDistribution = new Map<
  PackageName,
  BUILD_CONFIG_TYPE['distribution']
>([
  ['@madisboard/admin', 'admin'],
  ['@madisboard/web', 'web'],
  ['@madisboard/electron-renderer', 'desktop'],
  ['@madisboard/electron', 'desktop'],
  ['@madisboard/mobile', 'mobile'],
  ['@madisboard/ios', 'ios'],
  ['@madisboard/android', 'android'],
]);

export const AliasToPackage = new Map<string, PackageName>([
  ['admin', '@madisboard/admin'],
  ['web', '@madisboard/web'],
  ['electron', '@madisboard/electron'],
  ['desktop', '@madisboard/electron-renderer'],
  ['renderer', '@madisboard/electron-renderer'],
  ['mobile', '@madisboard/mobile'],
  ['ios', '@madisboard/ios'],
  ['android', '@madisboard/android'],
  ['server', '@madisboard/server'],
  ['gql', '@madisboard/graphql'],
  ...PackageList.map(
    pkg => [pkg.name.split('/').pop()!, pkg.name] as [string, PackageName]
  ),
]);
