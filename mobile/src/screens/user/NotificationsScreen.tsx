import { View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { formatDistance, useApp } from '@saanpaw/shared';
import { theme } from '@/constants/theme';
import { Banner, Button, Card, Caption, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { NotificationRow } from '@/components/domain';

/**
 * User Module - Smart Notifications.
 * Alerts for reports inside the user radius. The radius itself lives in Profile
 * with the rest of the account settings.
 */
export function UserNotificationsScreen({ navigation }: BottomTabScreenProps<any>) {
  const { notificationsFor, markNotificationRead, markAllNotificationsRead, currentUser } = useApp();

  const items = notificationsFor('user');
  const unread = items.filter((n) => !n.isRead).length;

  return (
    <Screen>
      <Banner
        tone="success"
        icon="notifications"
        title={`Alerts within ${formatDistance(currentUser.alertRadiusMeters)}`}
        message={`You hear about lost and found animals reported near ${currentUser.barangay}, and whenever the matcher finds a candidate for one of your own reports.`}
      />

      <SectionHeader
        title={unread ? `${unread} unread` : 'All caught up'}
        action="Change radius"
        onAction={() => navigation.navigate('Profile')}
      />

      {unread ? (
        <Button
          label="Mark all as read"
          variant="ghost"
          icon="checkmark-done-outline"
          onPress={() => markAllNotificationsRead('user')}
        />
      ) : null}

      <View style={{ gap: theme.spacing(1) }}>
        {items.length ? (
          items.map((n) => (
            <NotificationRow
              key={n.id}
              item={n}
              onPress={() => {
                markNotificationRead(n.id);
                if (n.type === 'match_found' && n.relatedReportId) {
                  navigation.navigate('ImageRecognition', { reportId: n.relatedReportId });
                } else if (n.relatedReportId) {
                  navigation.navigate('Map');
                }
              }}
            />
          ))
        ) : (
          <Card>
            <EmptyState
              icon="notifications-off-outline"
              title="No alerts yet"
              message={`Nothing has been reported within ${formatDistance(currentUser.alertRadiusMeters)} of you. Widen your radius in Profile to hear about more of the city.`}
              action="Open profile"
              onAction={() => navigation.navigate('Profile')}
            />
          </Card>
        )}
      </View>

      <Caption style={{ textAlign: 'center' }}>Alerts cover San Jose Del Monte only.</Caption>
    </Screen>
  );
}
