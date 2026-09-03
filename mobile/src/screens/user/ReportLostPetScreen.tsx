import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ReportForm } from './ReportForm';

/** User Module - Report Lost Pet. */
export function ReportLostPetScreen({ navigation }: NativeStackScreenProps<any>) {
  return <ReportForm kind="lost" navigation={navigation} />;
}
