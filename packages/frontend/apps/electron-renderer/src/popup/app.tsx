import { ThemeProvider } from '@madisboard/core/components/theme-provider';
import { configureElectronStateStorageImpls } from '@madisboard/core/desktop/storage';
import { configureDesktopApiModule } from '@madisboard/core/modules/desktop-api';
import { configureI18nModule, I18nProvider } from '@madisboard/core/modules/i18n';
import { configureStorageModule } from '@madisboard/core/modules/storage';
import { configureEssentialThemeModule } from '@madisboard/core/modules/theme';
import { appInfo } from '@madisboard/electron-api';
import { Framework, FrameworkRoot } from '@toeverything/infra';

import * as styles from './app.css';
import { Recording } from './recording';

const framework = new Framework();
configureI18nModule(framework);
configureEssentialThemeModule(framework);
configureStorageModule(framework);
configureElectronStateStorageImpls(framework);
configureDesktopApiModule(framework);
const frameworkProvider = framework.provider();

const mode = appInfo?.windowName as 'notification' | 'recording';

export function App() {
  return (
    <FrameworkRoot framework={frameworkProvider}>
      <ThemeProvider>
        <I18nProvider>
          <div className={styles.root} data-is-windows={environment.isWindows}>
            {mode === 'recording' && <Recording />}
          </div>
        </I18nProvider>
      </ThemeProvider>
    </FrameworkRoot>
  );
}
