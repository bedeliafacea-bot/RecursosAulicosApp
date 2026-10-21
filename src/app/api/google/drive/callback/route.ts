import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin-user';
import {
  exchangeGoogleAuthorizationCode,
  saveGoogleDriveRefreshToken,
} from '@/lib/google-drive';

function redirectToBackup(request: NextRequest, result: string) {
  const url = new URL('/respaldo', request.url);
  url.searchParams.set('drive', result);
  const response = NextResponse.redirect(url);
  response.cookies.set('google_drive_oauth_state', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/google/drive/callback',
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  const googleError = request.nextUrl.searchParams.get('error');
  const expectedState = request.cookies.get('google_drive_oauth_state')?.value;

  if (!state || !expectedState || state !== expectedState) {
    return redirectToBackup(request, 'authorization-error');
  }
  if (googleError === 'access_denied') {
    return redirectToBackup(request, 'access-denied');
  }
  if (!code) return redirectToBackup(request, 'authorization-error');

  try {
    const user = await requireAdminUser();
    const refreshToken = await exchangeGoogleAuthorizationCode(code);
    await saveGoogleDriveRefreshToken(refreshToken, user.id);
    return redirectToBackup(request, 'connected');
  } catch (error) {
    console.error('No se pudo completar la autorización de Google Drive:', error);
    return redirectToBackup(request, 'authorization-error');
  }
}
