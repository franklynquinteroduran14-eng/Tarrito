import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator();

const ACTIVE_COLOR = '#D96A87';
const INACTIVE_COLOR = '#B08D7C';

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <Text style={{ fontSize: 22, color, opacity: 0.9 }} accessibilityElementsHidden>
      {icon}
    </Text>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarStyle: {
            backgroundColor: '#FFFDFB',
            borderTopColor: '#F0E4DA',
            height: 68,
            paddingTop: 8,
            paddingBottom: 10,
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
