import { ConsoleLogger, Injectable, type LogLevel } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';

import { UserFriendlyError } from '../error';

// DO NOT use this Logger directly
// Use it via this way: `private readonly logger = new Logger(MyService.name)`
@Injectable()
export class AFFiNELogger extends ConsoleLogger {
  private readonly useJsonFormat: boolean;

  constructor() {
    super();
    // Use structured JSON logging in production for better log aggregation
    this.useJsonFormat = env.prod;
  }

  override stringifyMessage(message: unknown, logLevel: LogLevel) {
    if (this.useJsonFormat) {
      return this.formatJsonMessage(message, logLevel);
    }

    const messageString = super.stringifyMessage(message, logLevel);
    const requestId = AFFiNELogger.getRequestId();
    if (!requestId) {
      return messageString;
    }
    return `<${requestId}> ${messageString}`;
  }

  private formatJsonMessage(message: unknown, logLevel: LogLevel): string {
    const requestId = AFFiNELogger.getRequestId();
    const logEntry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      service: 'affine-server',
      version: env.version,
      deployment: env.DEPLOYMENT_TYPE,
    };

    if (requestId) {
      logEntry.requestId = requestId;
    }

    if (this.context) {
      logEntry.context = this.context;
    }

    return JSON.stringify(logEntry);
  }

  static getRequestId(): string | undefined {
    return ClsServiceManager.getClsService()?.getId();
  }

  static formatStack(stackOrError?: Error | string | unknown) {
    if (stackOrError instanceof Error) {
      let err = stackOrError;

      // most of the internal error are caught and created by `GlobalExceptionFilter`,
      // and their error stack is helpless
      if (err instanceof UserFriendlyError) {
        return err.stacktrace;
      }

      let stack = err.stack ?? '';
      if (err.cause instanceof Error && err.cause.stack) {
        stack += `\n\nCaused by:\n\n${err.cause.stack}`;
      }
      return stack;
    }
    return stackOrError;
  }

  /**
   * Nestjs ConsoleLogger.error() will not print the stack trace if the error is an instance of Error
   * This method is a workaround to print the stack trace
   *
   * Usage:
   * ```
   * this.logger.error('some error happens', errInstance);
   * ```
   */
  override error(
    message: any,
    stackOrError?: Error | string | unknown,
    context?: string
  ) {
    if (this.useJsonFormat) {
      const requestId = AFFiNELogger.getRequestId();
      const logEntry: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: typeof message === 'string' ? message : JSON.stringify(message),
        service: 'affine-server',
        version: env.version,
        deployment: env.DEPLOYMENT_TYPE,
        context: context || this.context,
      };

      if (requestId) {
        logEntry.requestId = requestId;
      }

      if (stackOrError instanceof Error) {
        logEntry.error = {
          name: stackOrError.name,
          message: stackOrError.message,
          stack: AFFiNELogger.formatStack(stackOrError),
        };
        if (stackOrError instanceof UserFriendlyError) {
          logEntry.errorCode = stackOrError.code;
          logEntry.errorStatus = stackOrError.status;
        }
      } else if (stackOrError) {
        logEntry.stack = stackOrError;
      }

      // Write directly to stderr in structured mode
      process.stderr.write(JSON.stringify(logEntry) + '\n');
      return;
    }
    super.error(message, AFFiNELogger.formatStack(stackOrError), context);
  }
}
