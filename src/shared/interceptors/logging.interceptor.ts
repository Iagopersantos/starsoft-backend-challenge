import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { randomUUID } from 'crypto';

export interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const { method, url, ip } = request;
    const requestId = randomUUID();
    const startTime = Date.now();

    request.requestId = requestId;

    this.logger.log(`[${requestId}] ${method} ${url} - Started from ${ip}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `[${requestId}] ${method} ${url} - Completed in ${duration}ms`,
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `[${requestId}] ${method} ${url} - Failed in ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
