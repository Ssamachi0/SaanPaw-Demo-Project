import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { ShelterNavigator } from './ShelterNavigator';
import { UserNavigator } from './UserNavigator';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {role === null && <Stack.Screen name="Auth" component={AuthNavigator} />}
      {role === 'shelter_admin' && <Stack.Screen name="Shelter" component={ShelterNavigator} />}
      {role === 'user' && <Stack.Screen name="User" component={UserNavigator} />}
    </Stack.Navigator>
  );
}
