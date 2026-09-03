import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '@/constants/theme';
import { LoginForm } from '@/screens/auth/LoginForm';

/**
 * Shelter Admin Module - Login.
 * Credentials are issued by the Developer after verification, so registering
 * only submits an application.
 */
export function ShelterLoginScreen({ navigation }: NativeStackScreenProps<any>) {
  return (
    <LoginForm
      role="shelter_admin"
      title="Shelter Admin"
      subtitle="Use the credentials issued after the Developer verified your shelter permit."
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
          <Text style={{ fontSize: 13, color: theme.colors.muted }}>Not registered yet?</Text>
          <Pressable onPress={() => navigation.navigate('ShelterRegister')} hitSlop={8}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.accent }}>
              Apply as a shelter
            </Text>
          </Pressable>
        </View>
      }
    />
  );
}
