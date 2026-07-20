export type User = {
  email: string;
  fullName?: string;
  username?: string;
  role?: string;
  bio?: string;
};

const USER_KEY = "aksiyoncuk_user";

export function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function removeUser() {
  localStorage.removeItem(USER_KEY);
}