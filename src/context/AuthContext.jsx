import { createContext, useContext, useState } from "react";

import { loginUser, logoutUser } from "../services/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {

        const storedUser =
            localStorage.getItem("user");

        if (!storedUser) {
            return null;
        }

        try {

            return JSON.parse(storedUser);

        } catch (error) {

            console.error(
                "Invalid stored user:",
                error
            );

            localStorage.removeItem("user");
            localStorage.removeItem("token");

            return null;
        }
    });

    // =====================================================
    // LOGIN
    // =====================================================

    const login = async (
        employeeId,
        password
    ) => {

        const response =
            await loginUser(
                employeeId,
                password
            );

        const userData =
            response.data;

        // Save JWT
        localStorage.setItem(
            "token",
            userData.token
        );

        // Save user
        localStorage.setItem(
            "user",
            JSON.stringify(userData)
        );

        // Update React state
        setUser(userData);

        return userData;
    };

    // =====================================================
    // LOGOUT
    // =====================================================

    const logout = () => {

        logoutUser();

        setUser(null);
    };

    // =====================================================
    // CONTEXT
    // =====================================================

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                logout,
                isAuthenticated: Boolean(user)
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () =>
    useContext(AuthContext);