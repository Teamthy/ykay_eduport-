import { Tabs } from "expo-router";
import { Home, CreditCard, FileText, Calendar, User } from "lucide-react-native";

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#00072D",
          borderTopColor: "#ffffff10",
          paddingBottom: 4,
          paddingTop: 4,
        },
        tabBarActiveTintColor: "#2840E8",
        tabBarInactiveTintColor: "#ffffff40",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Home", tabBarIcon: ({ color }) => <Home size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="fees"
        options={{ title: "Fees", tabBarIcon: ({ color }) => <CreditCard size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="report-cards"
        options={{ title: "Results", tabBarIcon: ({ color }) => <FileText size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="attendance"
        options={{ title: "Attendance", tabBarIcon: ({ color }) => <Calendar size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <User size={22} color={color} /> }}
      />
    </Tabs>
  );
}
