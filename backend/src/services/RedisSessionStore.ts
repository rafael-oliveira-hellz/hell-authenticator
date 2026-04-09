import { getRedisClient } from '../config/redis';
import { SessionRecord, SessionStore } from './SessionStore';

const sessionKey = (refreshToken: string) => `session:refresh:${refreshToken}`;
const userIndexKey = (userId: string) => `session:user:${userId}`;

const ttlFromExpiresAt = (expiresAt: string): number => {
  const seconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  return Math.max(seconds, 1);
};

export class RedisSessionStore implements SessionStore {
  async create(session: SessionRecord): Promise<void> {
    const client = await getRedisClient();
    const ttl = ttlFromExpiresAt(session.expiresAt);

    await client.set(sessionKey(session.refreshToken), JSON.stringify(session), { EX: ttl });
    await client.sAdd(userIndexKey(session.userId), session.refreshToken);
    await client.expire(userIndexKey(session.userId), ttl);
  }

  async findByRefreshToken(refreshToken: string): Promise<SessionRecord | null> {
    const client = await getRedisClient();
    const raw = await client.get(sessionKey(refreshToken));

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as SessionRecord;
  }

  async rotateRefreshToken(oldRefreshToken: string, nextSession: SessionRecord): Promise<void> {
    const oldSession = await this.findByRefreshToken(oldRefreshToken);

    if (oldSession) {
      const client = await getRedisClient();
      await client.del(sessionKey(oldRefreshToken));
      await client.sRem(userIndexKey(oldSession.userId), oldRefreshToken);
    }

    await this.create(nextSession);
  }

  async touch(refreshToken: string): Promise<void> {
    const current = await this.findByRefreshToken(refreshToken);

    if (!current) {
      return;
    }

    const updated: SessionRecord = {
      ...current,
      lastUsedAt: new Date().toISOString()
    };

    await this.create(updated);
  }

  async revoke(refreshToken: string, reason = 'Manual revocation'): Promise<void> {
    const current = await this.findByRefreshToken(refreshToken);

    if (!current) {
      return;
    }

    const updated: SessionRecord = {
      ...current,
      isActive: false,
      revokedReason: reason,
      revokedAt: new Date().toISOString()
    };

    await this.create(updated);
  }

  async revokeAllByUser(userId: string, reason = 'Logout all sessions'): Promise<void> {
    const client = await getRedisClient();
    const refreshTokens = await client.sMembers(userIndexKey(userId));

    for (const refreshToken of refreshTokens) {
      await this.revoke(refreshToken, reason);
    }
  }
}
