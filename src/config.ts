import * as vscode from "vscode";
import { LLMConfig, LLMProvider, PROVIDER_PRESETS } from "./llm/provider.js";

const STORE_KEY = "instruct-me.llm.profiles";

export interface LLMProfile {
  id: string;
  name: string;
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ProfileSummary {
  id: string;
  name: string;
  provider: LLMProvider;
  baseUrl: string;
  model: string;
  apiKeyMasked: string;
  hasKey: boolean;
}

interface ProfileStore {
  profiles: LLMProfile[];
  activeId: string;
}

function toConfig(profile: LLMProfile): LLMConfig {
  return {
    provider: profile.provider,
    apiKey: profile.apiKey,
    baseUrl: profile.baseUrl,
    model: profile.model,
  };
}

function newId(): string {
  return `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

async function readStore(secrets: vscode.SecretStorage): Promise<ProfileStore> {
  const raw = await secrets.get(STORE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ProfileStore;
      if (Array.isArray(parsed.profiles)) {
        return parsed;
      }
    } catch {
      // fall through
    }
  }
  return { profiles: [], activeId: "" };
}

async function writeStore(secrets: vscode.SecretStorage, store: ProfileStore): Promise<void> {
  await secrets.store(STORE_KEY, JSON.stringify(store));
}

export async function listProfiles(secrets: vscode.SecretStorage): Promise<ProfileSummary[]> {
  const store = await readStore(secrets);
  return store.profiles.map((p) => ({
    id: p.id,
    name: p.name,
    provider: p.provider,
    baseUrl: p.baseUrl,
    model: p.model,
    apiKeyMasked: maskApiKey(p.apiKey),
    hasKey: !!p.apiKey,
  }));
}

export async function getActiveConfig(secrets: vscode.SecretStorage): Promise<LLMConfig> {
  const store = await readStore(secrets);
  const active = store.profiles.find((p) => p.id === store.activeId);
  if (active) {
    return toConfig(active);
  }
  if (store.profiles.length > 0) {
    return toConfig(store.profiles[0]);
  }
  return { ...PROVIDER_PRESETS.deepseek, apiKey: "" };
}

export async function getActiveProfileId(secrets: vscode.SecretStorage): Promise<string> {
  const store = await readStore(secrets);
  if (store.profiles.find((p) => p.id === store.activeId)) {
    return store.activeId;
  }
  return store.profiles[0]?.id ?? "";
}

export async function saveProfile(
  secrets: vscode.SecretStorage,
  profile: { id?: string; name: string; provider: LLMProvider; apiKey: string; baseUrl: string; model: string }
): Promise<ProfileSummary> {
  const store = await readStore(secrets);
  let target: LLMProfile;

  if (profile.id) {
    target = store.profiles.find((p) => p.id === profile.id)!;
    if (!target) {
      target = {
        id: profile.id,
        name: profile.name,
        provider: profile.provider,
        apiKey: profile.apiKey,
        baseUrl: profile.baseUrl,
        model: profile.model,
      };
      store.profiles.push(target);
    } else {
      target.name = profile.name;
      target.provider = profile.provider;
      target.baseUrl = profile.baseUrl;
      target.model = profile.model;
      if (profile.apiKey) {
        target.apiKey = profile.apiKey;
      }
    }
  } else {
    target = {
      id: newId(),
      name: profile.name,
      provider: profile.provider,
      apiKey: profile.apiKey,
      baseUrl: profile.baseUrl,
      model: profile.model,
    };
    store.profiles.push(target);
  }

  store.activeId = target.id;
  await writeStore(secrets, store);

  return {
    id: target.id,
    name: target.name,
    provider: target.provider,
    baseUrl: target.baseUrl,
    model: target.model,
    apiKeyMasked: maskApiKey(target.apiKey),
    hasKey: !!target.apiKey,
  };
}

export async function deleteProfile(secrets: vscode.SecretStorage, id: string): Promise<void> {
  const store = await readStore(secrets);
  store.profiles = store.profiles.filter((p) => p.id !== id);
  if (store.activeId === id) {
    store.activeId = store.profiles[0]?.id ?? "";
  }
  await writeStore(secrets, store);
}

export async function setActiveProfile(secrets: vscode.SecretStorage, id: string): Promise<void> {
  const store = await readStore(secrets);
  if (store.profiles.find((p) => p.id === id)) {
    store.activeId = id;
    await writeStore(secrets, store);
  }
}

export function getPresetForProvider(provider: LLMProvider): Omit<LLMConfig, "apiKey"> {
  return PROVIDER_PRESETS[provider];
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return key.substring(0, 4) + "****" + key.substring(key.length - 4);
}
