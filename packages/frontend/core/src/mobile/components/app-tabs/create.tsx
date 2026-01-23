import { usePageHelper } from '@madisboard/core/blocksuite/block-suite-page-list/utils';
import { useAsyncCallback } from '@madisboard/core/components/hooks/affine-async-hooks';
import { DocsService } from '@madisboard/core/modules/doc';
import { TemplateDocService } from '@madisboard/core/modules/template-doc';
import { WorkbenchService } from '@madisboard/core/modules/workbench';
import { WorkspaceService } from '@madisboard/core/modules/workspace';
import track from '@madisboard/track';
import { EditIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';

import { TabItem } from './tab-item';
import type { AppTabCustomFCProps } from './type';

export const AppTabCreate = ({ tab }: AppTabCustomFCProps) => {
  const workbench = useService(WorkbenchService).workbench;
  const workspaceService = useService(WorkspaceService);
  const templateDocService = useService(TemplateDocService);
  const docsService = useService(DocsService);

  const currentWorkspace = workspaceService.workspace;
  const pageHelper = usePageHelper(currentWorkspace.docCollection);
  const enablePageTemplate = useLiveData(
    templateDocService.setting.enablePageTemplate$
  );
  const pageTemplateDocId = useLiveData(
    templateDocService.setting.pageTemplateDocId$
  );

  const createPage = useAsyncCallback(
    async (isActive: boolean) => {
      if (isActive) return;
      if (enablePageTemplate && pageTemplateDocId) {
        const docId =
          await docsService.duplicateFromTemplate(pageTemplateDocId);
        workbench.openDoc({ docId, fromTab: 'true' });
      } else {
        const doc = pageHelper.createPage(undefined, { show: false });
        workbench.openDoc({ docId: doc.id, fromTab: 'true' });
      }
      track.$.navigationPanel.$.createDoc();
    },
    [docsService, enablePageTemplate, pageHelper, pageTemplateDocId, workbench]
  );

  return (
    <TabItem id={tab.key} onClick={createPage} label="New Page">
      <EditIcon />
    </TabItem>
  );
};
