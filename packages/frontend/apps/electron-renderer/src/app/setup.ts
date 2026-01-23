import '@madisboard/core/bootstrap/electron';
import '@madisboard/core/bootstrap/cleanup';
import '@madisboard/component/theme';
import './global.css';

import { apis } from '@madisboard/electron-api';
import { bindNativeDBApis } from '@madisboard/nbstore/sqlite';
import { bindNativeDBV1Apis } from '@madisboard/nbstore/sqlite/v1';

// oxlint-disable-next-line no-non-null-assertion
bindNativeDBApis(apis!.nbstore);
// oxlint-disable-next-line no-non-null-assertion
bindNativeDBV1Apis(apis!.db);
