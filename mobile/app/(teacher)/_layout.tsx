import { Tabs } from "expo-router";
import { Home, Users, BookOpen } from "lucide-react-native";

export default function TeacherLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#00072D", borderTopColor: "#ffffff10" },
        tabBarActiveTintColor: "#2840E8",
        tabBarInactiveTintColor: "#ffffff40",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Home", tabBarIcon: ({ color }) => <Home size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="students"
        options={{ title: "Students", tabBarIcon: ({ color }) => <Users size={22} color={color} /> }}
      />
    </Tabs>
  );
}
