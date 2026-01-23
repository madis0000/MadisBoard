import { registerAIEffects } from '@madisboard/core/blocksuite/ai/effects';
import { editorEffects } from '@madisboard/core/blocksuite/editors';

import { registerTemplates } from './register-templates';

editorEffects();
registerAIEffects();
registerTemplates();

export * from './blocksuite-editor';
