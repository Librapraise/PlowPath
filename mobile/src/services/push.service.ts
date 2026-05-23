import messaging from '@react-native-firebase/messaging';
import { api } from './api';
import { Alert, Platform } from 'react-native';

export class PushNotificationService {
  /**
   * Requests push notification permissions and, if granted, synchronizes the token.
   */
  public async requestUserPermission(): Promise<void> {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        // Android 13+ requires explicit runtime POST_NOTIFICATIONS permission request.
        // React Native Firebase requestPermission handles this, but we log the status.
      }
      
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('[PUSH] Push notifications permission authorized status:', authStatus);
        await this.getAndSyncFcmToken();
      } else {
        console.log('[PUSH] Push notifications permission denied/declined.');
      }
    } catch (err) {
      console.warn('[PUSH] Failed to request push notification permission', err);
    }
  }

  /**
   * Retrieves the current device FCM token and synchronizes it with our backend.
   */
  public async getAndSyncFcmToken(): Promise<void> {
    try {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log('[PUSH] Retreived FCM Token:', fcmToken);
        await this.syncTokenWithBackend(fcmToken);
      } else {
        console.warn('[PUSH] No FCM token received from Firebase Messaging');
      }
    } catch (err) {
      console.warn('[PUSH] Failed to retrieve FCM token', err);
    }
  }

  /**
   * Calls the POST /drivers/me/fcm-token backend endpoint to save/update the FCM token.
   */
  public async syncTokenWithBackend(fcmToken: string): Promise<void> {
    try {
      await api.post('/drivers/me/fcm-token', { fcm_token: fcmToken });
      console.log('[PUSH] Successfully synced FCM token with the backend database roster');
    } catch (err) {
      console.error('[PUSH] Failed to sync FCM token with the backend:', err);
    }
  }

  /**
   * Registers foreground message handlers to show alert banners when the app is active,
   * and registers token refresh listeners so changing tokens are automatically synced.
   */
  public registerNotificationHandlers(): () => void {
    // 1. Foreground message handler
    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('[PUSH] A new push message arrived in the foreground!', remoteMessage);
      const title = remoteMessage.notification?.title ?? 'PlowPath Alert';
      const body = remoteMessage.notification?.body ?? 'A new event has occurred.';
      
      Alert.alert(title, body, [{ text: 'OK' }]);
    });

    // 2. Token refresh handler
    const unsubscribeOnTokenRefresh = messaging().onTokenRefresh(async (token) => {
      console.log('[PUSH] FCM Token refreshed:', token);
      await this.syncTokenWithBackend(token);
    });

    // Return an unsubscribe cleanup handler
    return () => {
      unsubscribeOnMessage();
      unsubscribeOnTokenRefresh();
    };
  }
}

export const pushService = new PushNotificationService();
