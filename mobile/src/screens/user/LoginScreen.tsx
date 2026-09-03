import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '@/constants/theme';
import { LoginForm } from '@/screens/auth/LoginForm';

/** User Module - Login. */
export function UserLoginScreen({ navigation }: NativeStackScreenProps<any>) {
  return (
    <LoginForm
      role="user"
      title="Welcome back"
      subtitle="Sign in to report a lost pet, help a stray, and get alerts in your area."
      footer={
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
          <Text style={{ fontSize: 13, color: theme.colors.muted }}>No account yet?</Text>
          <Pressable onPress={() => navigation.navigate('UserRegister')} hitSlop={8}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>
              Create one
            </Text>
          </Pressable>
        </View>
      }
    />
  );
}
