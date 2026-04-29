import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService, { AuthUser, SignupData, LoginData } from "../services/authService";

interface AuthContextType {
	user: AuthUser | null;
	isLoading: boolean;
	isSignedIn: boolean;
	login: (data: LoginData) => Promise<void>;
	signup: (data: SignupData) => Promise<AuthUser>;
	logout: () => Promise<void>;
	refreshUser: () => Promise<void>;
	updateProfile: (data: { name?: string; phone?: string; stage_index?: number }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Check stored auth on mount
	useEffect(() => {
		const checkAuth = async () => {
			try {
				const token = await authService.getStoredToken();
				if (token) {
					const storedUser = await authService.getStoredUser();
					if (storedUser) {
						setUser(storedUser);
					}
				}
			} catch (err) {
				console.warn("Auth check failed:", err);
			} finally {
				setIsLoading(false);
			}
		};
		checkAuth();
	}, []);

	const login = useCallback(async (data: LoginData) => {
		const { user } = await authService.login(data);
		setUser(user);
	}, []);

	const signup = useCallback(async (data: SignupData) => {
		const newUser = await authService.signup(data);
		// After signup, auto-login
		const { user } = await authService.login({
			email: data.email,
			password: data.password,
		});
		setUser(user);
		return newUser;
	}, []);

	const logout = useCallback(async () => {
		try {
			await authService.logout();
		} catch (err) {
			console.warn("Logout API failed:", err);
		} finally {
			// Always clear local state regardless of API result
			setUser(null);
		}
	}, []);

	const refreshUser = useCallback(async () => {
		const storedUser = await authService.getStoredUser();
		setUser(storedUser);
	}, []);

	const updateProfile = useCallback(async (data: { name?: string; phone?: string; stage_index?: number }) => {
		const updated = await authService.updateProfile(data);
		setUser(updated);
	}, []);

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				isSignedIn: !!user,
				login,
				signup,
				logout,
				refreshUser,
				updateProfile,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

export default AuthContext;
