import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendPush(expoPushToken: string | null | undefined, message: PushMessage): Promise<void> {
    if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken[')) {
      return;
    }

    try {
      const res = await axios.post(
        EXPO_PUSH_URL,
        {
          to: expoPushToken,
          sound: 'default',
          title: message.title,
          body: message.body,
          data: message.data ?? {},
        },
        {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        },
      );

      // Log Expo's response to diagnose delivery issues
      const result = res.data?.data ?? res.data;
      if (result?.status === 'ok') {
        this.logger.log(`Push sent ✅  id=${result.id}  token=${expoPushToken.slice(0, 30)}...`);
      } else {
        this.logger.warn(`Push returned error: ${JSON.stringify(result)}`);
      }
    } catch (err: any) {
      this.logger.warn(`Push notification failed for token ${expoPushToken}: ${err?.message}`);
    }
  }
}
