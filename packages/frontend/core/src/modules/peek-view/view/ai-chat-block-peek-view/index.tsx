import { toReactNode } from '@madisboard/component';
import { AIChatBlockPeekViewTemplate } from '@madisboard/core/blocksuite/ai';
import type { AIChatBlockModel } from '@madisboard/core/blocksuite/ai/blocks/ai-chat-block/model/ai-chat-model';
import { useAIChatConfig } from '@madisboard/core/components/hooks/affine/use-ai-chat-config';
import { useAISubscribe } from '@madisboard/core/components/hooks/affine/use-ai-subscribe';
import {
  AIDraftService,
  AIToolsConfigService,
} from '@madisboard/core/modules/ai-button';
import { AIModelService } from '@madisboard/core/modules/ai-button/services/models';
import {
  ServerService,
  SubscriptionService,
} from '@madisboard/core/modules/cloud';
import { WorkspaceDialogService } from '@madisboard/core/modules/dialogs';
import { FeatureFlagService } from '@madisboard/core/modules/feature-flag';
import type { EditorHost } from '@blocksuite/affine/std';
import { useFramework } from '@toeverything/infra';
import { useMemo } from 'react';

export type AIChatBlockPeekViewProps = {
  model: AIChatBlockModel;
  host: EditorHost;
};

export const AIChatBlockPeekView = ({
  model,
  host,
}: AIChatBlockPeekViewProps) => {
  const { docDisplayConfig, searchMenuConfig, reasoningConfig } =
    useAIChatConfig();

  const framework = useFramework();
  const serverService = framework.get(ServerService);
  const affineFeatureFlagService = framework.get(FeatureFlagService);
  const affineWorkspaceDialogService = framework.get(WorkspaceDialogService);
  const aiDraftService = framework.get(AIDraftService);
  const aiToolsConfigService = framework.get(AIToolsConfigService);
  const subscriptionService = framework.get(SubscriptionService);
  const aiModelService = framework.get(AIModelService);
  const handleAISubscribe = useAISubscribe();

  return useMemo(() => {
    const template = AIChatBlockPeekViewTemplate(
      model,
      host,
      docDisplayConfig,
      searchMenuConfig,
      reasoningConfig,
      serverService,
      affineFeatureFlagService,
      affineWorkspaceDialogService,
      aiDraftService,
      aiToolsConfigService,
      subscriptionService,
      aiModelService,
      handleAISubscribe
    );
    return toReactNode(template);
  }, [
    model,
    host,
    docDisplayConfig,
    searchMenuConfig,
    reasoningConfig,
    serverService,
    affineFeatureFlagService,
    affineWorkspaceDialogService,
    aiDraftService,
    aiToolsConfigService,
    subscriptionService,
    aiModelService,
    handleAISubscribe,
  ]);
};
