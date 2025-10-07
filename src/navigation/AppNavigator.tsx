import { ActivityIndicator, Platform, View } from 'react-native';
import { NavigationContainer, DarkTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { AppStackParamList, TabsParamList } from './types';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { WordsScreen } from '../screens/words/WordsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { LevelDetailScreen } from '../screens/levels/LevelDetailScreen';
import { AdminWordScreen } from '../screens/admin/AdminWordScreen';
import { EditExampleScreen } from '../screens/words/EditExampleScreen';

const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator<TabsParamList>();

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.primary,
    notification: colors.accent,
  },
};

const TabNavigator = () => (
  <Tabs.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: 'rgba(15, 20, 42, 0.85)',
        borderTopColor: 'transparent',
        paddingTop: Platform.OS === 'ios' ? 12 : 4,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10,
        height: Platform.OS === 'ios' ? 90 : 70,
      },
      tabBarActiveTintColor: colors.textPrimary,
      tabBarInactiveTintColor: colors.tabInactive,
      tabBarLabelStyle: { fontSize: 12 },
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';
        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Words') {
          iconName = focused ? 'book' : 'book-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'Ana Sayfa' }} />
    <Tabs.Screen name="Words" component={WordsScreen} options={{ title: 'Kelimelerim' }} />
    <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profilim' }} />
  </Tabs.Navigator>
);

export const AppNavigator = () => {
  const { initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="Tabs" component={TabNavigator} />
        <AppStack.Screen name="LevelDetail" component={LevelDetailScreen} />
  <AppStack.Screen name="WordExampleEdit" component={EditExampleScreen} />
        <AppStack.Screen name="AdminWordManager" component={AdminWordScreen} />
        <AppStack.Screen
          name="Login"
          component={LoginScreen}
          options={{ presentation: 'modal' }}
        />
        <AppStack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ presentation: 'modal' }}
        />
      </AppStack.Navigator>
    </NavigationContainer>
  );
};
