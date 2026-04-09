export interface SessionRecord {
  userId: string;
  refreshToken: string;
  accessToken: string;
  ipAddress: string;
  userAgent: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  location: string;
  isActive: boolean;
  revokedReason?: string;
  revokedAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt: string;
}

export interface SessionStore {
  create(session: SessionRecord): Promise<void>;
  findByRefreshToken(refreshToken: string): Promise<SessionRecord | null>;
  rotateRefreshToken(oldRefreshToken: string, nextSession: SessionRecord): Promise<void>;
  touch(refreshToken: string): Promise<void>;
  revoke(refreshToken: string, reason?: string): Promise<void>;
  revokeAllByUser(userId: string, reason?: string): Promise<void>;
}
