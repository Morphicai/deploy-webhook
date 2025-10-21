import { z } from 'zod';
import {
  createSecret,
  deleteSecret,
  getSecretByName,
  listSecrets,
  updateSecret,
  SecretRecord,
  SecretProvider,
} from './database';

export type SecretProviderType = SecretProvider;

const secretSchema = z.object({
  name: z.string().min(2).max(128),
  provider: z.enum(['infisical', 'file', 'docker-secret']),
  reference: z.string().min(1).max(512),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export function listSecretSummaries(): SecretRecord[] {
  return listSecrets();
}

export function createSecretRecord(payload: unknown): SecretRecord {
  const parsed = secretSchema.parse(payload);
  if (getSecretByName(parsed.name)) {
    throw new Error(`Secret with name ${parsed.name} already exists`);
  }
  return createSecret(parsed);
}

export function updateSecretRecord(id: number, payload: unknown): SecretRecord {
  const parsed = secretSchema.partial({ name: true }).parse(payload);
  return updateSecret({
    id,
    provider: parsed.provider,
    reference: parsed.reference,
    metadata: parsed.metadata,
  });
}

export function removeSecretRecord(id: number): void {
  deleteSecret(id);
}

export function getSecretEnvVars(input: { names: string[] }): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of input.names) {
    const found = getSecretByName(name);
    if (!found) {
      throw new Error(`Secret ${name} not found`);
    }
    result[name] = found.reference;
  }
  return result;
}
