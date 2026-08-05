import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <Text style={{ fontSize: 22, color, opacity: 0.9 }} accessibilityElementsHidden>
      {icon}
    </Text>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            height: 68 + insets.bottom,
            paddingTop: 8,
            paddingBottom: Math.max(10, insets.bottom),
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Inicio"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Tarro',
            tabBarIcon: ({ color }) => <TabIcon icon="🏺" color={color} />,
          }}
        />
        <Tab.Screen
          name="Recuerdos"
          component={HistoryScreen}
          options={{
            tabBarLabel: 'Recuerdos',
            tabBarIcon: ({ color }) => <TabIcon icon="📖" color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
