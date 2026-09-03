import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ReportForm } from './ReportForm';

/** User Module - Report Found Animal. */
export function ReportFoundAnimalScreen({ navigation }: NativeStackScreenProps<any>) {
  return <ReportForm kind="found" navigation={navigation} />;
}
