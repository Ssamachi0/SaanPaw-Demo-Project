import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RADIUS_OPTIONS, formatDistance, useApp } from '@saanpaw/shared';
import { theme } from '@/constants/theme';
import { Button, Card, Caption, Choice, ListRow, Row, Screen, SectionHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

/** User Module - Account details, alert radius, and sign out. */
export function UserProfileScreen({ navigation }: BottomTabScreenProps<any>) {
  const { currentUser, updateUserProfile, myReports, notificationsFor } = useApp();
  const { signOut } = useAuth();

  const initials = currentUser.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const activeReports = myReports.filter((r) => r.status !== 'closed').length;
  const unread = notificationsFor('user').filter((n) => !n.isRead).length;

  return (
    <Screen padded={false}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{currentUser.fullName}</Text>
        <Text style={styles.email}>{currentUser.email}</Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{myReports.length}</Text>
            <Text style={styles.heroStatLabel}>Reports</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{activeReports}</Text>
            <Text style={styles.heroStatLabel}>Active</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{unread}</Text>
            <Text style={styles.heroStatLabel}>Unread</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <SectionHeader title="Your details" />
        <Card>
          <Row gap={1.25}>
            <Ionicons name="location" size={17} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Barangay</Text>
              <Caption>{currentUser.barangay}, San Jose Del Monte</Caption>
            </View>
          </Row>
          <Row gap={1.25}>
            <Ionicons name="call" size={17} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Mobile number</Text>
              <Caption>{currentUser.phone}</Caption>
            </View>
          </Row>
          <Row gap={1.25}>
            <Ionicons name="calendar" size={17} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Member since</Text>
              <Caption>{new Date(currentUser.joinedAt).toLocaleDateString()}</Caption>
            </View>
          </Row>
        </Card>

        <SectionHeader title="Alert radius" />
        <Card>
          <Caption>
            You are told about lost and found animals reported within this distance of{' '}
            {currentUser.barangay}.
          </Caption>
          <Choice
            options={RADIUS_OPTIONS.map((r) => ({ label: r.label, value: r.meters }))}
            value={currentUser.alertRadiusMeters}
            onChange={(m) => updateUserProfile({ alertRadiusMeters: m })}
          />
          <Caption>
            Currently {formatDistance(currentUser.alertRadiusMeters)}. Changes apply straight away.
          </Caption>
        </Card>

        <SectionHeader title="Shortcuts" />
        <ListRow
          icon="clipboard"
          title="My reports"
          subtitle={`${myReports.length} submitted`}
          onPress={() => navigation.navigate('LostPetStatus')}
        />
        <ListRow
          icon="home"
          title="Shelters"
          subtitle="Browse shelters and message them"
          iconColor={theme.colors.info}
          iconSoft={theme.colors.infoSoft}
          onPress={() => navigation.navigate('ShelterView')}
        />

        <View style={{ height: theme.spacing(1) }} />
        <Button label="Sign out" variant="danger" icon="log-out-outline" onPress={signOut} />

        <Caption style={{ textAlign: 'center', marginTop: theme.spacing(1) }}>
          SaanPaw · San Jose Del Monte, Bulacan
        </Caption>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: theme.colors.primaryDark,
    alignItems: 'center',
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(2.5),
    paddingHorizontal: theme.spacing(2),
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...theme.type.h1, color: theme.colors.onPrimary },
  name: { ...theme.type.h1, color: theme.colors.onPrimary, marginTop: theme.spacing(1.25) },
  email: { ...theme.type.caption, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing(2),
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing(1.25),
    alignSelf: 'stretch',
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { ...theme.type.h2, color: theme.colors.onPrimary },
  heroStatLabel: { ...theme.type.tiny, color: 'rgba(255,255,255,0.7)' },
  heroDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },

  body: { padding: theme.spacing(2), gap: theme.spacing(1.5) },
  rowLabel: { ...theme.type.label, color: theme.colors.text },
});
