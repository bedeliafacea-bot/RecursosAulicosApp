import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin-user';
import { buildGoogleAuthorizationUrl } from '@/lib/google-drive';

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
    const state = randomBytes(32).toString('hex');
    const response = NextResponse.redirect(buildGoogleAuthorizationUrl(state));
    response.cookies.set('google_drive_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/google/drive/callback',
      maxAge: 600,
    });
    return response;
  } catch (error) {
    console.error('No se pudo iniciar la autorización de Google Drive:', error);
    return NextResponse.redirect(new URL('/respaldo?drive=configuration-error', request.url));
  }
}
