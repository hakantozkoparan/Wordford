import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/context/AuthContext';
import { WordProvider } from '@/context/WordContext';
import { AppNavigator } from '@/navigation/AppNavigator';
import { NotificationInitializer } from '@/components/NotificationInitializer';
import { RewardProvider } from '@/context/RewardContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RewardProvider>
            <NotificationInitializer />
            <WordProvider>
              <StatusBar style="light" />
              <AppNavigator />
            </WordProvider>
          </RewardProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
