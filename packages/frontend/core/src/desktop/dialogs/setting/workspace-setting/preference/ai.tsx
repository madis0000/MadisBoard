import { Switch } from '@madisboard/component';
import {
  SettingRow,
  SettingWrapper,
} from '@madisboard/component/setting-components';
import { useAsyncCallback } from '@madisboard/core/components/hooks/affine-async-hooks';
import { ServerService } from '@madisboard/core/modules/cloud';
import { WorkspacePermissionService } from '@madisboard/core/modules/permissions';
import { WorkspaceShareSettingService } from '@madisboard/core/modules/share-setting';
import { useI18n } from '@madisboard/i18n';
import { useLiveData, useService } from '@toeverything/infra';

export const AiSetting = () => {
  const t = useI18n();
  const shareSetting = useService(WorkspaceShareSettingService).sharePreview;
  const serverService = useService(ServerService);
  const serverEnableAi = useLiveData(
    serverService.server.features$.map(f => f?.copilot)
  );
  const workspaceEnableAi = useLiveData(shareSetting.enableAi$);
  const loading = useLiveData(shareSetting.isLoading$);
  const permissionService = useService(WorkspacePermissionService);
  const isOwner = useLiveData(permissionService.permission.isOwner$);

  const toggleAi = useAsyncCallback(
    async (checked: boolean) => {
      await shareSetting.setEnableAi(checked);
    },
    [shareSetting]
  );

  if (!isOwner || !serverEnableAi) {
    return null;
  }

  return (
    <SettingWrapper
      title={t['com.affine.settings.workspace.affine-ai.title']()}
    >
      <SettingRow
        name={t['com.affine.settings.workspace.affine-ai.label']()}
        desc={t['com.affine.settings.workspace.affine-ai.description']()}
      >
        <Switch
          checked={!!workspaceEnableAi}
          onChange={toggleAi}
          disabled={loading}
        />
      </SettingRow>
    </SettingWrapper>
  );
};
