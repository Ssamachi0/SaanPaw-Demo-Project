import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '@/constants/theme';
import { formatDistance, useApp } from '@saanpaw/shared';
import type { AnimalReport, ReportKind } from '@saanpaw/shared';
import {
  Banner,
  Button,
  Card,
  Caption,
  Choice,
  EmptyState,
  Field,
  Screen,
  SectionHeader,
  Segmented,
  Sheet,
} from '@/components/ui';
import { ReportCard, describeAnimal } from '@/components/domain';

/**
 * Shelter Admin Module - Reports inside the shelter radius.
 * Responding opens a rescue case, tracked on the Animal Status screen.
 */
export function AnimalReportsScreen({ navigation }: NativeStackScreenProps<any>) {
  const { shelterAreaReports, currentShelter, openCase, caseForReport } = useApp();

  const [kind, setKind] = useState<ReportKind | 'all'>('all');
  const [onlyUnhandled, setOnlyUnhandled] = useState<'all' | 'unhandled'>('all');
  const [responding, setResponding] = useState<AnimalReport | null>(null);
  const [note, setNote] = useState('');

  const all = shelterAreaReports();
  const reports = useMemo(
    () =>
      all
        .filter((r) => (kind === 'all' ? true : r.kind === kind))
        .filter((r) => (onlyUnhandled === 'unhandled' ? !r.caseId : true)),
    [all, kind, onlyUnhandled],
  );

  const respond = () => {
    if (!responding) return;
    openCase(responding.id, note.trim() || 'Rescue team dispatched.');
    setResponding(null);
    setNote('');
  };

  return (
    <Screen>
      <Banner
        tone="info"
        icon="radio"
        title={`Reports within ${formatDistance(currentShelter.operatingRadiusMeters)}`}
        message={`Every lost and found report inside ${currentShelter.name}'s operating radius appears here automatically, newest and nearest first.`}
      />

      <Segmented
        options={[
          { label: `All (${all.length})`, value: 'all' },
          { label: 'Lost', value: 'lost', color: theme.colors.danger },
          { label: 'Found', value: 'found', color: theme.colors.accent },
        ]}
        value={kind}
        onChange={(v) => setKind(v as ReportKind | 'all')}
      />

      <Choice
        options={[
          { label: 'Everything', value: 'all' },
          { label: 'Not yet responded', value: 'unhandled' },
        ]}
        value={onlyUnhandled}
        onChange={(v) => setOnlyUnhandled(v as 'all' | 'unhandled')}
      />

      <SectionHeader title={`${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`} />

      {reports.length ? (
        reports.map((r) => {
          const linked = caseForReport(r.id);
          return (
            <ReportCard
              key={r.id}
              report={r}
              distance={r.distance}
              footer={
                <View style={{ gap: theme.spacing(1) }}>
                  <Caption>
                    Reported by {r.reporterName}
                    {r.reporterPhone ? ` · ${r.reporterPhone}` : ''}
                  </Caption>
                  {linked ? (
                    <Button
                      label="View case status"
                      variant="secondary"
                      icon="pulse-outline"
                      onPress={() => navigation.navigate('AnimalStatus')}
                    />
                  ) : (
                    <Button
                      label="Respond and open a case"
                      icon="medkit-outline"
                      onPress={() => setResponding(r)}
                    />
                  )}
                </View>
              }
            />
          );
        })
      ) : (
        <Card>
          <EmptyState
            icon="documents-outline"
            title="No reports match"
            message={`Nothing open inside your ${formatDistance(currentShelter.operatingRadiusMeters)} radius with these filters. Widen the operating radius in your shelter profile to cover more of the city.`}
            action="Shelter profile"
            onAction={() => navigation.navigate('ShelterProfile')}
          />
        </Card>
      )}

      <Sheet open={Boolean(responding)} onClose={() => setResponding(null)} title="Respond to report">
        <Caption>
          {responding
            ? `${describeAnimal(responding)} · ${responding.barangay}`
            : ''}
        </Caption>
        <Text style={{ fontSize: 13, lineHeight: 19, color: theme.colors.textSoft }}>
          Opening a case sets the animal to "Under rescue" and notifies the reporter that your
          shelter has responded.
        </Text>
        <Field
          label="Response note"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Rescue team dispatched to the location."
          multiline
        />
        <Button label="Open rescue case" icon="medkit" onPress={respond} />
      </Sheet>
    </Screen>
  );
}
