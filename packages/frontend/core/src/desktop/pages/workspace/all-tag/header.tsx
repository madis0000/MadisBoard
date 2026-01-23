import { ExplorerNavigation } from '@madisboard/core/components/explorer/header/navigation';
import { Header } from '@madisboard/core/components/pure/header';

export const AllTagHeader = () => {
  return <Header left={<ExplorerNavigation active={'tags'} />} />;
};
