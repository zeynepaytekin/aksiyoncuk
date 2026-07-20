"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { getUser, removeUser, saveUser, User } from "../lib/auth";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  function login(userData: User) {
    saveUser(userData);
    setUser(userData);
  }

  function logout() {
    removeUser();
    setUser(null);
  }

  function updateUser(userData: User) {
    saveUser(userData);
    setUser(userData);
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}