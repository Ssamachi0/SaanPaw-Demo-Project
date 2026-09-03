import { useState } from 'react';
import { Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { RADIUS_OPTIONS, SJDM_BARANGAYS, SJDM_BARANGAY_NAMES, formatDistance, useApp } from '@saanpaw/shared';
import {
  Badge,
  Banner,
  Button,
  Card,
  Caption,
  Choice,
  Field,
  KeyValue,
  Row,
  Screen,
  SectionHeader,
  Select,
} from '@/components/ui';
import { MapCanvas } from '@/components/map/MapCanvas';
import { useAuth } from '@/context/AuthContext';

/**
 * Shelter Admin Module - Shelter details and contact info.
 * The operating radius set here decides which reports reach this shelter.
 */
export function ShelterProfileScreen() {
  const { currentShelter, updateShelterProfile, shelterAreaReports } = useApp();
  const { signOut } = useAuth();

  const [name, setName] = useState(currentShelter.name);
  const [address, setAddress] = useState(currentShelter.address);
  const [contact, setContact] = useState(currentShelter.contactNumber);
  const [email, setEmail] = useState(currentShelter.email);
  const [capacity, setCapacity] = useState(String(currentShelter.capacity));
  const [occupancy, setOccupancy] = useState(String(currentShelter.currentOccupancy));
  const [barangay, setBarangay] = useState(currentShelter.barangay);
  const [radius, setRadius] = useState(currentShelter.operatingRadiusMeters);
  const [saved, setSaved] = useState(false);

  const center = SJDM_BARANGAYS.find((b) => b.name === barangay)?.center ?? currentShelter.location;
  const coverage = shelterAreaReports().length;

  const save = () => {
    updateShelterProfile({
      name: name.trim(),
      address: address.trim(),
      contactNumber: contact.trim(),
      email: email.trim(),
      capacity: Number(capacity) || currentShelter.capacity,
      currentOccupancy: Number(occupancy) || 0,
      barangay,
      location: center,
      operatingRadiusMeters: radius,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Screen>
      {saved ? (
        <Banner tone="success" icon="checkmark-circle" title="Profile saved" message="Your changes are live across the app." />
      ) : null}

      <Card>
        <SectionHeader title="Verification" />
        <KeyValue label="Permit number" value={currentShelter.permitNumber} />
        <KeyValue label="Registered" value={new Date(currentShelter.registeredAt).toLocaleDateString()} />
        <Row gap={0.75}>
          <Caption>Status</Caption>
          <Badge label="Approved by Developer" icon="shield-checkmark" />
        </Row>
        <Caption>
          The permit number was verified with the San Jose Del Monte local government. Contact the
          Developer to change it.
        </Caption>
      </Card>

      <SectionHeader title="Shelter information" />
      <Card>
        <Field label="Shelter name" value={name} onChangeText={setName} icon="home-outline" />
        <Field label="Address" value={address} onChangeText={setAddress} icon="location-outline" multiline />
        <Select label="Barangay" value={barangay} options={SJDM_BARANGAY_NAMES} onChange={setBarangay} />
        <Field label="Contact number" value={contact} onChangeText={setContact} keyboardType="phone-pad" icon="call-outline" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" icon="mail-outline" />
        <Row gap={1} align="flex-start">
          <View style={{ flex: 1 }}>
            <Field label="Capacity" value={capacity} onChangeText={setCapacity} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Current occupancy" value={occupancy} onChangeText={setOccupancy} keyboardType="numeric" />
          </View>
        </Row>
      </Card>

      <SectionHeader title="Operating radius" />
      <Card>
        <Choice
          options={RADIUS_OPTIONS.map((r) => ({ label: r.label, value: r.meters }))}
          value={radius}
          onChange={setRadius}
          hint="You receive a smart alert for every lost and found report inside this circle."
        />
        <MapCanvas
          height={240}
          initialCenter={center}
          initialZoom={radius >= 10000 ? 11 : radius >= 5000 ? 12 : 13}
          radiusMeters={radius}
          radiusCenter={center}
          markers={[{ id: 'shelter', coordinate: center, kind: 'shelter', label: name }]}
        />
        <Text style={{ fontSize: 13, color: theme.colors.textSoft }}>
          At {formatDistance(currentShelter.operatingRadiusMeters)} you currently cover{' '}
          <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{coverage}</Text> open
          {coverage === 1 ? ' report' : ' reports'}.
        </Text>
      </Card>

      <Button label="Save profile" icon="save-outline" onPress={save} />
      <Button label="Sign out" variant="secondary" icon="log-out-outline" onPress={signOut} />
    </Screen>
  );
}
