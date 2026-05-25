import messaging, { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { api } from './api';
import { Alert, Platform, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigate } from './navigation';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'urgent' | 'route_update' | 'alert' | string;
  data?: Record<string, string>;
  receivedAt: string;
}

export class PushNotificationService {
  /**
   * Requests push notification permissions and, if granted, synchronizes the token.
   */
  public async requestUserPermission(): Promise<void> {
    try {
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
        console.log('[PUSH] Retrieved FCM Token:', fcmToken);
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
   * Custom vibration trigger based on push notification categories.
   */
  private triggerVibration(category: string) {
    if (category === 'urgent') {
      // 3 rapid rapid vibrations (urgent)
      Vibration.vibrate([0, 400, 150, 400, 150, 400]);
    } else if (category === 'route_update') {
      // 1 standard vibration
      Vibration.vibrate([0, 500]);
    } else if (category === 'alert') {
      // 1 long continuous buzz
      Vibration.vibrate([0, 1500]);
    } else {
      // Default vibration
      Vibration.vibrate(400);
    }
  }

  /**
   * Appends push notification message details into persistent AsyncStorage logs.
   */
  private async logToHistory(remoteMessage: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
    try {
      const title = remoteMessage.notification?.title ?? 'PlowPath Alert';
      const body = remoteMessage.notification?.body ?? 'Notification received';
      const category = (remoteMessage.data?.category as string) || 'alert';
      const id = remoteMessage.messageId || `msg-${Date.now()}`;

      const newItem: NotificationItem = {
        id,
        title,
        body,
        category,
        data: remoteMessage.data as Record<string, string>,
        receivedAt: new Date().toISOString(),
      };

      const historyStr = await AsyncStorage.getItem('plowpath.notificationHistory.v1');
      let history: NotificationItem[] = [];
      if (historyStr) {
        history = JSON.parse(historyStr);
      }

      // Prepend, cap at last 50 items
      history.unshift(newItem);
      if (history.length > 50) {
        history = history.slice(0, 50);
      }

      await AsyncStorage.setItem('plowpath.notificationHistory.v1', JSON.stringify(history));
      console.log('[PUSH LOGGED] Saved push message to AsyncStorage logs');
    } catch (err) {
      console.warn('[PUSH LOGGED ERROR] Failed to log push to history', err);
    }
  }

  /**
   * Evaluates custom notification data payloads to deep-link users into active screens.
   */
  private handleNotificationTap(remoteMessage: FirebaseMessagingTypes.RemoteMessage): void {
    console.log('[PUSH TAP] Notification tapped by driver:', remoteMessage);
    const category = remoteMessage.data?.category;
    const routeId = remoteMessage.data?.routeId;

    if (category === 'urgent' && routeId) {
      // Route immediately into turn-by-turn Navigation HUD
      navigate('Navigation', { routeId });
    } else {
      // Default fallback: Go to Today's Route
      navigate('Route');
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
      const category = (remoteMessage.data?.category as string) || 'alert';

      // Record in logs history & run customized haptic vibration
      await this.logToHistory(remoteMessage);
      this.triggerVibration(category);
      
      Alert.alert(title, body, [
        {
          text: 'Open',
          onPress: () => this.handleNotificationTap(remoteMessage),
        },
        { text: 'Dismiss', style: 'cancel' }
      ]);
    });

    // 2. Tapped from background / closed state
    messaging().onNotificationOpenedApp((remoteMessage) => {
      this.handleNotificationTap(remoteMessage);
    });

    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          this.handleNotificationTap(remoteMessage);
        }
      });

    // 3. Token refresh handler
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
