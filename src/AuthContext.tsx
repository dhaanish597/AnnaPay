import { createContext, useContext, useState, ReactNode } from 'react';

export type Role = 'UNIVERSITY_ADMIN' | 'COLLEGE_ADMIN' | 'FINANCE_OFFICER' | 'FACULTY';

export interface User {
    role: Role;
    college?: string;
    department?: string;
}

interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>({
        role: 'COLLEGE_ADMIN',
        college: 'CEG (College of Engineering Guindy)'
    });

    const login = (userData: User) => {
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
