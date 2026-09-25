import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { GoogleLoginProvider, SOCIAL_AUTH_CONFIG, SocialAuthServiceConfig } from '@abacritt/angularx-social-login';

const googleAuthConfig: SocialAuthServiceConfig = {
  autoLogin: false,
  providers: [
    {
      id: GoogleLoginProvider.PROVIDER_ID,
      provider: new GoogleLoginProvider('974766938528-8tuu7ufvnj5ucbj47eh3q2sdjt2qgeb9.apps.googleusercontent.com')
    }
  ],
  onError: (err) => {
    console.error('Google Auth Error:', err);
  }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    {
      provide: 'SocialAuthServiceConfig',
      useValue: googleAuthConfig
    },
    {
      provide: SOCIAL_AUTH_CONFIG,
      useValue: googleAuthConfig
    }
  ]
};
