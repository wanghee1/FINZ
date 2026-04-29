import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// Log error without exposing sensitive data
		console.error("ErrorBoundary caught:", error.message);
		if (__DEV__) {
			console.error("Component stack:", errorInfo.componentStack);
		}
	}

	private handleRetry = (): void => {
		this.setState({ hasError: false, error: null });
	};

	render(): ReactNode {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<View style={styles.container}>
					<Text style={styles.title}>문제가 발생했습니다</Text>
					<Text style={styles.message}>
						일시적인 오류가 발생했습니다. 다시 시도해주세요.
					</Text>
					{__DEV__ && this.state.error && (
						<Text style={styles.debug}>{this.state.error.message}</Text>
					)}
					<TouchableOpacity style={styles.button} onPress={this.handleRetry}>
						<Text style={styles.buttonText}>다시 시도</Text>
					</TouchableOpacity>
				</View>
			);
		}

		return this.props.children;
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
		backgroundColor: "#fff",
	},
	title: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#1a1a1a",
		marginBottom: 12,
	},
	message: {
		fontSize: 15,
		color: "#666",
		textAlign: "center",
		lineHeight: 22,
		marginBottom: 24,
	},
	debug: {
		fontSize: 12,
		color: "#cc0000",
		fontFamily: "monospace",
		backgroundColor: "#f5f5f5",
		padding: 12,
		borderRadius: 8,
		marginBottom: 24,
		maxWidth: "100%",
	},
	button: {
		backgroundColor: "#4A90D9",
		paddingHorizontal: 32,
		paddingVertical: 12,
		borderRadius: 8,
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
});

export default ErrorBoundary;
