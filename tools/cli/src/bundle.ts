import { existsSync, rmSync } from 'node:fs';
import { cpus } from 'node:os';

import { Logger } from '@madisboard-tools/utils/logger';
import { ProjectRoot } from '@madisboard-tools/utils/path';
import { Package } from '@madisboard-tools/utils/workspace';
import { merge } from 'lodash-es';
import webpack from 'webpack';
import WebpackDevServer, {
  type Configuration as DevServerConfiguration,
} from 'webpack-dev-server';

import { Option, PackageCommand } from './command';
import {
  createHTMLTargetConfig,
  createNodeTargetConfig,
  createWorkerTargetConfig,
} from './webpack';

function getBaseWorkerConfigs(pkg: Package) {
  const core = new Package('@madisboard/core');

  return [
    createWorkerTargetConfig(
      pkg,
      core.srcPath.join(
        'modules/workspace-engine/impls/workspace-profile.worker.ts'
      ).value
    ),
    createWorkerTargetConfig(
      pkg,
      core.srcPath.join('modules/pdf/renderer/pdf.worker.ts').value
    ),
    createWorkerTargetConfig(
      pkg,
      core.srcPath.join(
        'blocksuite/view-extensions/turbo-renderer/turbo-painter.worker.ts'
      ).value
    ),
  ];
}

function getBundleConfigs(pkg: Package): webpack.MultiConfiguration {
  switch (pkg.name) {
    case '@madisboard/admin': {
      return [
        createHTMLTargetConfig(pkg, pkg.srcPath.join('index.tsx').value),
      ] as webpack.MultiConfiguration;
    }
    case '@madisboard/web':
    case '@madisboard/mobile':
    case '@madisboard/ios':
    case '@madisboard/android': {
      const workerConfigs = getBaseWorkerConfigs(pkg);
      workerConfigs.push(
        createWorkerTargetConfig(
          pkg,
          pkg.srcPath.join('nbstore.worker.ts').value
        )
      );

      return [
        createHTMLTargetConfig(
          pkg,
          pkg.srcPath.join('index.tsx').value,
          {},
          workerConfigs.map(config => config.name)
        ),
        ...workerConfigs,
      ] as webpack.MultiConfiguration;
    }
    case '@madisboard/electron-renderer': {
      const workerConfigs = getBaseWorkerConfigs(pkg);

      return [
        createHTMLTargetConfig(
          pkg,
          {
            index: pkg.srcPath.join('app/index.tsx').value,
            shell: pkg.srcPath.join('shell/index.tsx').value,
            popup: pkg.srcPath.join('popup/index.tsx').value,
            backgroundWorker: pkg.srcPath.join('background-worker/index.ts')
              .value,
          },
          {
            additionalEntryForSelfhost: false,
            injectGlobalErrorHandler: false,
            emitAssetsManifest: false,
          },
          workerConfigs.map(config => config.name)
        ),
        ...workerConfigs,
      ] as webpack.MultiConfiguration;
    }
    case '@madisboard/server': {
      return [
        createNodeTargetConfig(pkg, pkg.srcPath.join('index.ts').value),
      ] as webpack.MultiConfiguration;
    }
  }

  throw new Error(`Unsupported package: ${pkg.name}`);
}

const IN_CI = !!process.env.CI;
const httpProxyMiddlewareLogLevel = IN_CI ? 'silent' : 'error';

const defaultDevServerConfig: DevServerConfiguration = {
  host: '0.0.0.0',
  allowedHosts: 'all',
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  },
  hot: false,
  liveReload: true,
  compress: !process.env.CI,
  setupExitSignals: true,
  client: {
    overlay: process.env.DISABLE_DEV_OVERLAY === 'true' ? false : undefined,
    logging: process.env.CI ? 'none' : 'error',
    // see: https://webpack.js.org/configuration/dev-server/#websocketurl
    // must be an explicit ws/wss URL because custom protocols (e.g. assets://)
    // cannot be used to construct WebSocket endpoints in Electron
    webSocketURL: 'ws://localhost:8080/ws',
  },
  historyApiFallback: {
    rewrites: [
      {
        from: /.*/,
        to: () => {
          return process.env.SELF_HOSTED === 'true'
            ? '/selfhost.html'
            : '/index.html';
        },
      },
    ],
  },
  proxy: [
    {
      context: '/api',
      target: 'http://localhost:3010',
      logLevel: httpProxyMiddlewareLogLevel,
    },
    {
      context: '/socket.io',
      target: 'http://localhost:3010',
      ws: true,
      logLevel: httpProxyMiddlewareLogLevel,
    },
    {
      context: '/graphql',
      target: 'http://localhost:3010',
      logLevel: httpProxyMiddlewareLogLevel,
    },
  ],
};

export class BundleCommand extends PackageCommand {
  static override paths = [['bundle'], ['webpack'], ['pack'], ['bun']];

  // bundle is not able to run with deps
  override _deps = false;
  override waitDeps = false;

  dev = Option.Boolean('--dev,-d', false, {
    description: 'Run in Development mode',
  });

  clean = Option.Boolean('--clean,-c', false, {
    description: 'Clean output and cache before building',
  });

  async execute() {
    const pkg = this.workspace.getPackage(this.package);

    if (this.dev) {
      await BundleCommand.dev(pkg);
    } else {
      await BundleCommand.build(pkg, { clean: this.clean });
    }
  }

  static async build(pkg: Package, options?: { clean?: boolean }) {
    process.env.NODE_ENV = 'production';
    const logger = new Logger('bundle');
    logger.info(`Packing package ${pkg.name}...`);

    const cacheDir = ProjectRoot.join(
      'node_modules',
      '.cache',
      'webpack',
      pkg.name.replace(/[/@]/g, '_')
    ).value;

    if (options?.clean) {
      logger.info('Cleaning output and cache (--clean flag)...');
      rmSync(pkg.distPath.value, { recursive: true, force: true });
      rmSync(cacheDir, { recursive: true, force: true });
    } else {
      // Only clean output directory, preserve webpack cache for faster rebuilds
      logger.info('Cleaning output directory (cache preserved)...');
      rmSync(pkg.distPath.value, { recursive: true, force: true });
      if (existsSync(cacheDir)) {
        logger.info('Using cached build artifacts for faster compilation...');
      }
    }

    const config = getBundleConfigs(pkg);
    config.parallelism = cpus().length;

    const compiler = webpack(config);
    if (!compiler) {
      throw new Error('Failed to create webpack compiler');
    }

    compiler.run((error, stats) => {
      if (error) {
        console.error(error);
        process.exit(1);
      }
      if (stats) {
        if (stats.hasErrors()) {
          console.error(stats.toString('errors-only'));
          process.exit(1);
        } else {
          console.log(stats.toString('minimal'));
        }
      }
    });
  }

  static async dev(pkg: Package, devServerConfig?: DevServerConfiguration) {
    process.env.NODE_ENV = 'development';
    const logger = new Logger('bundle');
    logger.info(`Starting dev server for ${pkg.name}...`);

    const config = getBundleConfigs(pkg);
    config.parallelism = cpus().length;

    const compiler = webpack(config);
    if (!compiler) {
      throw new Error('Failed to create webpack compiler');
    }

    const devServer = new WebpackDevServer(
      merge({}, defaultDevServerConfig, devServerConfig),
      compiler
    );

    await devServer.start();
  }
}
