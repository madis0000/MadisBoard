import { type DropTargetDropEvent, useDropTarget } from '@madisboard/component';
import type { AffineDNDData } from '@madisboard/core/types/dnd';
import { useI18n } from '@madisboard/i18n';

import { EmptyNodeChildren } from '../../layouts/empty-node-children';

export const Empty = ({
  onDrop,
}: {
  onDrop: (data: DropTargetDropEvent<AffineDNDData>) => void;
}) => {
  const { dropTargetRef } = useDropTarget(
    () => ({
      onDrop,
    }),
    [onDrop]
  );
  const t = useI18n();
  return (
    <EmptyNodeChildren ref={dropTargetRef}>
      {t['com.affine.collection.emptyCollection']()}
    </EmptyNodeChildren>
  );
};
