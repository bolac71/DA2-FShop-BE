import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserInteractionsService } from './user-interactions.service';
import { InteractionType } from './entities/user-interaction.entity';


@Injectable()
export class InteractionInterceptor implements NestInterceptor {
  constructor(private readonly interactionsService: UserInteractionsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const productId = request.params.id;
    const userId = user?.id ?? user?.sub ?? 'anonymous';
    console.log(`Intercepting request for product ${productId} by user ${userId}`);
    return next.handle().pipe(
      tap(() => {
        if (user && productId) {
          // Record interaction asynchronously
          this.interactionsService.recordInteraction(
            user.id,
            Number(productId),
            InteractionType.VIEW,
          ).catch(err => console.error('Failed to record interaction:', err));
        }
      }),
    );
  }
}
