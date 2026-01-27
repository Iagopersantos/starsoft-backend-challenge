import { RabbitMQModule, MessageHandlerErrorBehavior } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';

export const getRabbitMQConfig = (configService: ConfigService) => {
  return RabbitMQModule.forRootAsync({
    useFactory: () => ({
      exchanges: [
        {
          name: 'cinema.events',
          type: 'topic',
          options: {
            durable: true,
          },
        },
      ],
      uri: configService.get('RABBITMQ_URL'),
      connectionInitOptions: { wait: true, timeout: 10000 },
      enableControllerDiscovery: true,
      // Configuração de retry com exponential backoff
      defaultSubscribeErrorBehavior: MessageHandlerErrorBehavior.NACK,
      defaultNackErrorHandler: async (channel: any, msg: any, error: any) => {
        const retryCount = (msg.properties.headers['x-retry-count'] || 0) + 1;
        const maxRetries = 3;

        if (retryCount <= maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          
          await channel.publish(
            'cinema.events',
            msg.fields.routingKey,
            msg.content,
            {
              headers: {
                ...msg.properties.headers,
                'x-retry-count': retryCount,
                'x-original-error': error.message,
              },
              expiration: delay.toString(),
            }
          );
          
          channel.ack(msg);
        } else {
          // Enviar para Dead Letter Queue
          await channel.publish(
            'cinema.events.dlq',
            msg.fields.routingKey,
            msg.content,
            {
              headers: {
                ...msg.properties.headers,
                'x-death-reason': 'max-retries-exceeded',
                'x-final-error': error.message,
              },
            }
          );
          
          channel.ack(msg);
        }
      },
    }),
  });
};