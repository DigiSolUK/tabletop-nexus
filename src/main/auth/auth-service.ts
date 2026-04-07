import { join } from 'node:path';
import { shell, type App } from 'electron';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthSessionState, BeginAuthRequest, ProfileSummary } from '../../shared/contracts';
import { defaultAuthState } from '../../shared/constants';
import type { AppDatabase } from '../persistence/database';
import { SecureStore } from './secure-store';

interface SupabaseConfig {
  url: string;
  anonKey: string;
  redirectUrl: string;
  siteUrl: string | null;
}

const STORAGE_KEY = 'tabletop-nexus-auth';

export class AuthService {
  private readonly secureStore: SecureStore;
  private readonly config: SupabaseConfig | null;
  private client: SupabaseClient | null = null;

  constructor(
    private readonly app: App,
    private readonly database: AppDatabase
  ) {
    this.secureStore = new SecureStore(join(app.getPath('userData'), 'secure', 'auth-session.json'));
    this.config =
      process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
        ? {
            url: process.env.SUPABASE_URL,
            anonKey: process.env.SUPABASE_ANON_KEY,
            redirectUrl: process.env.TABLETOP_NEXUS_AUTH_REDIRECT_URL ?? 'tabletopnexus://auth/callback',
            siteUrl: process.env.TABLETOP_NEXUS_SITE_URL ?? null,
          }
        : null;
  }

  getState(): AuthSessionState {
    return {
      ...defaultAuthState(),
      ...this.database.getAuthState(),
      configured: this.isConfigured(),
      provider: this.isConfigured() ? 'supabase' : 'local',
    };
  }

  isConfigured(): boolean {
    return Boolean(this.config?.url && this.config.anonKey);
  }

  async beginAuth(request: BeginAuthRequest): Promise<AuthSessionState> {
    if (!this.isConfigured()) {
      return this.saveState({
        ...this.getState(),
        provider: 'supabase',
        configured: false,
        state: 'unconfigured',
        pendingEmail: request.email,
        lastError: 'Supabase credentials are not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to enable cloud sign-in.',
      });
    }

    try {
      const client = this.getClient();
      const { error } = await client.auth.signInWithOtp({
        email: request.email,
        options: {
          emailRedirectTo: this.config?.redirectUrl,
          shouldCreateUser: request.mode === 'sign-up',
          data: request.displayName ? { displayName: request.displayName } : undefined,
        },
      });
      if (error) {
        throw error;
      }

      return this.saveState({
        ...this.getState(),
        provider: 'supabase',
        configured: true,
        state: 'pending',
        email: request.email,
        pendingEmail: request.email,
        lastError: null,
      });
    } catch (error) {
      return this.saveState({
        ...this.getState(),
        provider: 'supabase',
        configured: true,
        state: 'error',
        pendingEmail: request.email,
        lastError: error instanceof Error ? error.message : 'Unable to begin sign-in.',
      });
    }
  }

  async completeAuth(callbackUrl: string): Promise<AuthSessionState> {
    if (!this.isConfigured()) {
      return this.saveState({
        ...this.getState(),
        configured: false,
        state: 'unconfigured',
        pendingCallbackUrl: callbackUrl,
        lastError: 'Cloud auth is not configured for this build.',
      });
    }

    try {
      const parsed = new URL(callbackUrl);
      const errorDescription = parsed.searchParams.get('error_description');
      if (errorDescription) {
        return this.saveState({
          ...this.getState(),
          state: 'error',
          pendingCallbackUrl: null,
          lastError: errorDescription,
        });
      }

      const code = parsed.searchParams.get('code');
      if (!code) {
        return this.saveState({
          ...this.getState(),
          state: 'error',
          pendingCallbackUrl: null,
          lastError: 'No auth code was present in the callback URL.',
        });
      }

      const client = this.getClient();
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (error) {
        throw error;
      }

      const user = data.user ?? data.session?.user;
      const currentProfile = this.database.getCurrentProfile();
      const updatedProfile: ProfileSummary = {
        ...currentProfile,
        accountId: user?.id ?? currentProfile.accountId,
        email: user?.email ?? currentProfile.email,
        displayName:
          typeof user?.user_metadata?.displayName === 'string'
            ? user.user_metadata.displayName
            : currentProfile.displayName,
        authState: 'authenticated',
        createdBy: currentProfile.createdBy === 'local' ? 'cloud' : currentProfile.createdBy,
        updatedAt: new Date().toISOString(),
      };
      this.database.saveProfile(updatedProfile);

      return this.saveState({
        provider: 'supabase',
        configured: true,
        state: 'authenticated',
        email: user?.email ?? null,
        pendingEmail: null,
        accountId: user?.id ?? null,
        pendingCallbackUrl: null,
        lastError: null,
      });
    } catch (error) {
      return this.saveState({
        ...this.getState(),
        state: 'error',
        pendingCallbackUrl: null,
        lastError: error instanceof Error ? error.message : 'Unable to complete sign-in.',
      });
    }
  }

  async signOut(): Promise<AuthSessionState> {
    if (this.isConfigured()) {
      try {
        await this.getClient().auth.signOut();
      } catch {
        // Keep local sign-out resilient even if the network is unavailable.
      }
    }

    const currentProfile = this.database.getCurrentProfile();
    this.database.saveProfile({
      ...currentProfile,
      authState: 'offline',
      accountId: null,
      email: null,
      lastSyncedAt: null,
      updatedAt: new Date().toISOString(),
    });
    this.secureStore.clear();

    return this.saveState({
      provider: this.isConfigured() ? 'supabase' : 'local',
      configured: this.isConfigured(),
      state: 'offline',
      email: null,
      pendingEmail: null,
      accountId: null,
      pendingCallbackUrl: null,
      lastError: null,
    });
  }

  captureCallbackUrl(callbackUrl: string): AuthSessionState {
    return this.saveState({
      ...this.getState(),
      provider: this.isConfigured() ? 'supabase' : 'local',
      configured: this.isConfigured(),
      pendingCallbackUrl: callbackUrl,
      state: this.getState().state === 'authenticated' ? 'authenticated' : 'pending',
      lastError: null,
    });
  }

  async openAccountPortal(): Promise<void> {
    if (this.config?.siteUrl) {
      await shell.openExternal(this.config.siteUrl);
    }
  }

  getClient(): SupabaseClient {
    if (!this.config) {
      throw new Error('Supabase is not configured.');
    }
    if (!this.client) {
      this.client = createClient(this.config.url, this.config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          flowType: 'pkce',
          storageKey: STORAGE_KEY,
          storage: {
            getItem: (key: string) => this.secureStore.getItem(key),
            setItem: (key: string, value: string) => this.secureStore.setItem(key, value),
            removeItem: (key: string) => this.secureStore.removeItem(key),
          },
        },
      });
    }
    return this.client;
  }

  private saveState(nextState: AuthSessionState): AuthSessionState {
    return this.database.saveAuthState({
      ...defaultAuthState(),
      ...nextState,
      provider: this.isConfigured() ? 'supabase' : 'local',
      configured: this.isConfigured(),
    });
  }
}
