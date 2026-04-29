import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";
import { RootStackParamList, MainTabParamList } from "../types";
import { useAuth } from "../context/AuthContext";
import { AIChatProvider } from "../context/AIChatContext";
import { AIChatFAB, AIChatPanel } from "../components";

// Screens — 공개 영역
import LandingScreen from "../screens/LandingScreen";
import AuthScreen from "../screens/AuthScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import CompanyScreen from "../screens/CompanyScreen";
import B2BScreen from "../screens/B2BScreen";

// Screens — 메인 탭
import HomeScreen from "../screens/HomeScreen";
import TaxServiceScreen from "../screens/TaxServiceScreen";
import LifecycleScreen from "../screens/LifecycleScreen";
import MyPageScreen from "../screens/MyPageScreen";

// Screens — 스택 (탭 외부)
import Track1YouthTaxScreen from "../screens/Track1YouthTaxScreen";
import Track2PropertyScreen from "../screens/Track2PropertyScreen";
import LifecycleDetailScreen from "../screens/LifecycleDetailScreen";
import TaxConsultantListScreen from "../screens/TaxConsultantListScreen";
import TaxConsultantChatScreen from "../screens/TaxConsultantChatScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/** 하단 탭바: 홈 | 세무서비스 | 생애주기 | 마이페이지 */
const MainTabNavigator = () => {
	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				tabBarIcon: ({ focused, color, size }) => {
					let iconName: keyof typeof Ionicons.glyphMap = "home";
					switch (route.name) {
						case "Home":
							iconName = focused ? "home" : "home-outline";
							break;
						case "TaxService":
							iconName = focused ? "calculator" : "calculator-outline";
							break;
						case "Lifecycle":
							iconName = focused ? "leaf" : "leaf-outline";
							break;
						case "MyPage":
							iconName = focused ? "person" : "person-outline";
							break;
					}
					return <Ionicons name={iconName} size={size} color={color} />;
				},
				tabBarActiveTintColor: COLORS.teal600,
				tabBarInactiveTintColor: COLORS.gray400,
				tabBarStyle: {
					backgroundColor: COLORS.white,
					borderTopColor: COLORS.gray200,
					height: 85,
					paddingBottom: 25,
					paddingTop: 8,
				},
				tabBarLabelStyle: {
					fontSize: 11,
					fontWeight: "600",
				},
				headerShown: false,
			})}
		>
			<Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "홈" }} />
			<Tab.Screen name="TaxService" component={TaxServiceScreen} options={{ tabBarLabel: "세무서비스" }} />
			<Tab.Screen name="Lifecycle" component={LifecycleScreen} options={{ tabBarLabel: "생애주기" }} />
			<Tab.Screen name="MyPage" component={MyPageScreen} options={{ tabBarLabel: "마이" }} />
		</Tab.Navigator>
	);
};

/** 루트 스택 네비게이터 */
const AppNavigator = () => {
	const { isSignedIn, isLoading } = useAuth();

	if (isLoading) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator size="large" color="#0D9488" />
			</View>
		);
	}

	return (
		<NavigationContainer>
			<Stack.Navigator screenOptions={{ headerShown: false }}>
				{isSignedIn ? (
					<>
						{/* 인증 후 영역 */}
						<Stack.Screen name="MainTab" component={MainTabNavigator} />
						<Stack.Screen name="Track1YouthTax" component={Track1YouthTaxScreen} />
						<Stack.Screen name="Track2Property" component={Track2PropertyScreen} />
						<Stack.Screen name="LifecycleDetail" component={LifecycleDetailScreen} />
						<Stack.Screen name="TaxConsultantList" component={TaxConsultantListScreen} />
						<Stack.Screen name="TaxConsultantChat" component={TaxConsultantChatScreen} />
					</>
				) : (
					<>
						{/* 공개 영역 */}
						<Stack.Screen name="Landing" component={LandingScreen} />
						<Stack.Screen name="Auth" component={AuthScreen} />
						<Stack.Screen name="Onboarding" component={OnboardingScreen} />
						<Stack.Screen name="Company" component={CompanyScreen} />
						<Stack.Screen name="B2B" component={B2BScreen} />
					</>
				)}
			</Stack.Navigator>

			{/* AI 챗봇 — 인증 후 영역에서만 표시 */}
			{isSignedIn && (
				<>
					<AIChatFAB />
					<AIChatPanel />
				</>
			)}
		</NavigationContainer>
	);
};

export default AppNavigator;
