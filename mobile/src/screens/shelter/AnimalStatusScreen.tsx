import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '@/constants/theme';
import {
  AnimalPhoto,
  Banner,
  Button,
  Card,
  Caption,
  Choice,
  EmptyState,
  Field,
  Row,
  Screen,
  SectionHeader,
  Sheet,
} from '@/components/ui';
import { CASE_ICONS, CaseStatusPill, ShelterAnimalCard, describeAnimal, timeAgo } from '@/components/domain';
import { caseStatusMeta, useApp } from '@saanpaw/shared';
import type { AnimalCase, AnimalCaseStatus } from '@saanpaw/shared';

const STATUS_OPTIONS: { label: string; value: AnimalCaseStatus }[] = [
  { label: 'Under rescue', value: 'under_rescue' },
  { label: 'Reunited', value: 'reunited' },
  { label: 'Adopted', value: 'adopted' },
  { label: 'Inconclusive', value: 'inconclusive' },
];

/**
 * Shelter Admin Module - Case status: under rescue, reunited, adopted,
 * inconclusive. Covers both public reports and the shelter own animals.
 */
export function AnimalStatusScreen({ navigation }: NativeStackScreenProps<any>) {
  const { cases, currentShelter, reportById, setCaseStatus, shelterAnimals, setShelterAnimalStatus } =
    useApp();

  const [editing, setEditing] = useState<AnimalCase | null>(null);
  const [status, setStatus] = useState<AnimalCaseStatus>('under_rescue');
  const [note, setNote] = useState('');

  const myCases = cases
    .filter((c) => c.shelterId === currentShelter.id)
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const myAnimals = shelterAnimals.filter((a) => a.shelterId === currentShelter.id);

  const open = (c: AnimalCase) => {
    setEditing(c);
    setStatus(c.status);
    setNote('');
  };

  const save = () => {
    if (!editing) return;
    setCaseStatus(editing.id, status, note.trim() || `Status set to ${status.replace('_', ' ')}.`);
    setEditing(null);
  };

  return (
    <Screen>
      <Banner
        tone="info"
        icon="pulse"
        title="Case status management"
        message="Updating a case notifies the person who filed the report, and a 'Reunited' status closes their report automatically."
      />

      <SectionHeader title={`Rescue cases (${myCases.length})`} />
      <Caption>Cases opened in response to public lost and found reports.</Caption>

      {myCases.length ? (
        myCases.map((c) => {
          const report = reportById(c.reportId);
          const meta = caseStatusMeta[c.status];
          return (
            <Card key={c.id}>
              <Row gap={1.5} align="flex-start">
                <AnimalPhoto uri={report?.imageUrls[0]} size={68} tint={meta.soft} iconColor={meta.color} />
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={styles.caseTitle}>
                    {report ? describeAnimal(report) : 'Unknown animal'}
                  </Text>
                  <Caption>
                    {report?.barangay ?? 'Unknown'} · reported by {report?.reporterName ?? 'a user'}
                  </Caption>
                  <CaseStatusPill status={c.status} />
                  <Caption>Updated {timeAgo(c.updatedAt)}</Caption>
                </View>
              </Row>

              <View style={styles.timeline}>
                {c.timeline.map((t, i) => (
                  <Row key={i} gap={0.75} align="flex-start">
                    <Ionicons
                      name={CASE_ICONS[t.status]}
                      size={13}
                      color={caseStatusMeta[t.status].color}
                      style={{ marginTop: 2 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timelineNote}>{t.note}</Text>
                      <Caption>{timeAgo(t.at)}</Caption>
                    </View>
                  </Row>
                ))}
              </View>

              <Button label="Update case status" icon="create-outline" onPress={() => open(c)} />
            </Card>
          );
        })
      ) : (
        <Card>
          <EmptyState
            icon="pulse-outline"
            title="No open cases"
            message="Respond to a report from Animal Reports to open a rescue case here."
            action="Animal reports"
            onAction={() => navigation.navigate('AnimalReports')}
          />
        </Card>
      )}

      <SectionHeader title={`Animals in care (${myAnimals.length})`} />
      <Caption>Set the status of animals recorded directly in your shelter database.</Caption>

      {myAnimals.map((a) => (
        <ShelterAnimalCard
          key={a.id}
          animal={a}
          right={null}
        />
      ))}

      {myAnimals.length ? (
        <Card>
          <Caption>Quick status change</Caption>
          {myAnimals.map((a) => (
            <View key={a.id} style={styles.quickRow}>
              <Text style={styles.quickName} numberOfLines={1}>
                {a.name}
              </Text>
              <Choice
                options={STATUS_OPTIONS}
                value={a.caseStatus}
                onChange={(v) => setShelterAnimalStatus(a.id, v as AnimalCaseStatus)}
              />
            </View>
          ))}
        </Card>
      ) : null}

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} title="Update case status">
        <Choice
          label="New status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(v) => setStatus(v as AnimalCaseStatus)}
        />
        <Field
          label="Note for the reporter"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Owner verified via image match. Released to the family."
          multiline
        />
        <Button label="Save and notify reporter" icon="send-outline" onPress={save} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  caseTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  timeline: {
    gap: 7,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(1.25),
  },
  timelineNote: { fontSize: 12.5, lineHeight: 18, color: theme.colors.textSoft },
  quickRow: { gap: 6, paddingVertical: theme.spacing(0.75) },
  quickName: { fontSize: 13.5, fontWeight: '700', color: theme.colors.text },
});
