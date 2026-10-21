import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

interface UploadedDriveFile {
  id: string;
  name: string;
  webViewLink?: string;
}

function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  }
  return createAdminClient();
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error(
      'Falta configurar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI.'
    );
  }

  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
  };
}

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!encodedKey) {
    throw new Error('Falta configurar GOOGLE_TOKEN_ENCRYPTION_KEY en el servidor.');
  }

  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY debe ser una clave Base64 de 32 bytes.');
  }
  return key;
}

function encryptRefreshToken(refreshToken: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(refreshToken, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64')).join('.');
}

function decryptRefreshToken(value: string): string {
  const [encodedIv, encodedTag, encodedCiphertext] = value.split('.');
  if (!encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error('El token de Google Drive guardado tiene un formato inválido.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(encodedIv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export async function saveGoogleDriveRefreshToken(
  refreshToken: string,
  connectedBy: string
): Promise<void> {
  const { error } = await getAdminClient()
    .from('google_drive_tokens')
    .upsert(
      {
        id: 'primary',
        refresh_token_encrypted: encryptRefreshToken(refreshToken),
        connected_by: connectedBy,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) {
    throw new Error(`No se pudo guardar la autorización de Google Drive: ${error.message}`);
  }
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const { data, error } = await getAdminClient()
    .from('google_drive_tokens')
    .select('refresh_token_encrypted')
    .eq('id', 'primary')
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo leer la autorización de Google Drive: ${error.message}`);
  }
  if (!data?.refresh_token_encrypted) {
    throw new Error('Primero conectá una cuenta de Google Drive.');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: decryptRefreshToken(data.refresh_token_encrypted),
    grant_type: 'refresh_token',
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  const token = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !token.access_token) {
    throw new Error(
      `Google no pudo renovar el acceso a Drive: ${token.error_description || token.error || response.statusText}`
    );
  }
  return token.access_token;
}

export async function uploadJsonToGoogleDrive(
  fileName: string,
  content: string
): Promise<UploadedDriveFile> {
  const accessToken = await getAccessToken();
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
  };

  const payload = new Blob([content], { type: 'application/json' });
  const sessionResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/json',
        'X-Upload-Content-Length': String(payload.size),
      },
      body: JSON.stringify(metadata),
      cache: 'no-store',
    }
  );
  if (!sessionResponse.ok) {
    const error = (await sessionResponse.json()) as { error?: { message?: string } };
    throw new Error(
      `No se pudo iniciar la subida a Google Drive: ${error.error?.message || sessionResponse.statusText}`
    );
  }

  const uploadUrl = sessionResponse.headers.get('Location');
  if (!uploadUrl || !uploadUrl.startsWith('https://www.googleapis.com/')) {
    throw new Error('Google no devolvió una URL de subida válida para el respaldo.');
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: payload,
    cache: 'no-store',
  });
  const result = (await uploadResponse.json()) as UploadedDriveFile & {
    error?: { message?: string };
  };

  if (!uploadResponse.ok || !result.id) {
    throw new Error(
      `No se pudo subir el respaldo a Google Drive: ${result.error?.message || uploadResponse.statusText}`
    );
  }
  return result;
}

export function buildGoogleAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleAuthorizationCode(code: string): Promise<string> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  const token = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !token.refresh_token) {
    throw new Error(
      `Google no entregó un token persistente para Drive: ${token.error_description || token.error || response.statusText}`
    );
  }
  return token.refresh_token;
}
