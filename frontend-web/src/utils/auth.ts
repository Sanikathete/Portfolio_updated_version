export const AUTH_STORAGE_KEYS = ['token', 'refresh_token', 'user_id', 'username'] as const;

export const clearStoredAuth = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new Event('auth-changed'));
};

export const decodeJwtPayload = (token: string) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string) => {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp ?? 0);

  if (!exp) return true;
  return Date.now() >= exp * 1000;
};

export const getValidStoredToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (isTokenExpired(token)) {
    return null;
  }

  return token;
};

export const getValidStoredRefreshToken = () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  if (isTokenExpired(refreshToken)) {
    clearStoredAuth();
    return null;
  }

  return refreshToken;
};

export const storeAuthSession = ({
  token,
  refreshToken,
  username,
  userId,
}: {
  token: string;
  refreshToken?: string | null;
  username?: string | null;
  userId?: number | null;
}) => {
  localStorage.setItem('token', token);

  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }

  if (username) {
    localStorage.setItem('username', username);
  }

  if (userId !== null && userId !== undefined) {
    localStorage.setItem('user_id', String(userId));
  }

  window.dispatchEvent(new Event('auth-changed'));
};
