import { NotificationCountService } from '@madisboard/core/modules/notification';
import { WorkbenchService } from '@madisboard/core/modules/workbench';
import { useLiveData, useService } from '@toeverything/infra';
import { useEffect } from 'react';

export const DocumentTitle = () => {
  const notificationCountService = useService(NotificationCountService);
  const notificationCount = useLiveData(notificationCountService.count$);
  const workbenchService = useService(WorkbenchService);
  const workbenchView = useLiveData(workbenchService.workbench.activeView$);
  const viewTitle = useLiveData(workbenchView.title$);

  useEffect(() => {
    const prefix = notificationCount > 0 ? `(${notificationCount}) ` : '';
    document.title = prefix + (viewTitle ? `${viewTitle} · AFFiNE` : 'AFFiNE');

    return () => {
      document.title = 'AFFiNE';
    };
  }, [notificationCount, viewTitle]);

  return null;
};
