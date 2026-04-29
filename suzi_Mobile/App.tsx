import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { AIChatProvider } from "./src/context/AIChatContext";
import ErrorBoundary from "./src/components/ErrorBoundary";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
	return (
		<ErrorBoundary>
			<SafeAreaProvider>
				<StatusBar style="auto" />
				<AuthProvider>
					<AIChatProvider>
						<AppNavigator />
					</AIChatProvider>
				</AuthProvider>
			</SafeAreaProvider>
		</ErrorBoundary>
	);
}
