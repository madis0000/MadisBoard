import {
  useMutateQueryResource,
  useMutation,
} from '@madisboard/admin/use-mutation';
import { useQuery } from '@madisboard/admin/use-query';
import { useAsyncCallback } from '@madisboard/core/components/hooks/affine-async-hooks';
import { getPromptsQuery, updatePromptMutation } from '@madisboard/graphql';
import { toast } from 'sonner';

import type { Prompt } from './prompts';

export const usePrompt = () => {
  const { data } = useQuery({
    query: getPromptsQuery,
  });

  const { trigger } = useMutation({
    mutation: updatePromptMutation,
  });

  const revalidate = useMutateQueryResource();

  const updatePrompt = useAsyncCallback(
    async ({
      name,
      messages,
    }: {
      name: string;
      messages: Prompt['messages'];
    }) => {
      await trigger({
        name,
        messages,
      })
        .then(async () => {
          await revalidate(getPromptsQuery);
          toast.success('Prompt updated successfully');
        })
        .catch(e => {
          toast(e.message);
          console.error(e);
        });
    },
    [revalidate, trigger]
  );

  return {
    prompts: data.listCopilotPrompts,
    updatePrompt,
  };
};
