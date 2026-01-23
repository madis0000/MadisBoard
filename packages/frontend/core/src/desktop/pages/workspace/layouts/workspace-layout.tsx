import { uniReactRoot } from '@madisboard/component';
import { AiLoginRequiredModal } from '@madisboard/core/components/affine/auth/ai-login-required';
import { useResponsiveSidebar } from '@madisboard/core/components/hooks/use-responsive-siedebar';
import { SWRConfigProvider } from '@madisboard/core/components/providers/swr-config-provider';
import { WorkspaceSideEffects } from '@madisboard/core/components/providers/workspace-side-effects';
import { AIIsland } from '@madisboard/core/desktop/components/ai-island';
import { AppContainer } from '@madisboard/core/desktop/components/app-container';
import { DocumentTitle } from '@madisboard/core/desktop/components/document-title';
import { WorkspaceDialogs } from '@madisboard/core/desktop/dialogs';
import { PeekViewManagerModal } from '@madisboard/core/modules/peek-view';
import { QuotaCheck } from '@madisboard/core/modules/quota';
import { WorkbenchService } from '@madisboard/core/modules/workbench';
import { WorkspaceService } from '@madisboard/core/modules/workspace';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import type { PropsWithChildren } from 'react';

export const WorkspaceLayout = function WorkspaceLayout({
  children,
}: PropsWithChildren) {
  const currentWorkspace = useService(WorkspaceService).workspace;
  return (
    <SWRConfigProvider>
      <WorkspaceDialogs />

      {/* ---- some side-effect components ---- */}
      {currentWorkspace?.flavour !== 'local' ? (
        <QuotaCheck workspaceMeta={currentWorkspace.meta} />
      ) : null}
      <AiLoginRequiredModal />
      <WorkspaceSideEffects />
      <PeekViewManagerModal />
      <DocumentTitle />

      <WorkspaceLayoutInner>{children}</WorkspaceLayoutInner>
      {/* should show after workspace loaded */}
      {/* FIXME: wait for better ai, <WorkspaceAIOnboarding /> */}
      <AIIsland />
      <uniReactRoot.Root />
    </SWRConfigProvider>
  );
};

/**
 * Wraps the workspace layout main router view
 */
const WorkspaceLayoutUIContainer = ({ children }: PropsWithChildren) => {
  const workbench = useService(WorkbenchService).workbench;
  const currentPath = useLiveData(
    LiveData.computed(get => {
      return get(workbench.basename$) + get(workbench.location$).pathname;
    })
  );
  useResponsiveSidebar();

  return (
    <AppContainer data-current-path={currentPath}>{children}</AppContainer>
  );
};
const WorkspaceLayoutInner = ({ children }: PropsWithChildren) => {
  return <WorkspaceLayoutUIContainer>{children}</WorkspaceLayoutUIContainer>;
};
