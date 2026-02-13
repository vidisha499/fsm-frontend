// import { NgModule } from '@angular/core';
// import { BrowserModule } from '@angular/platform-browser';
// import { RouteReuseStrategy } from '@angular/router';
// import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
// import { HttpClient, provideHttpClient } from '@angular/common/http';
// import { TranslateHttpLoader } from '@ngx-translate/http-loader';
// import { AppComponent } from './app.component';
// import { AppRoutingModule } from './app-routing.module';
// import {  HttpClientModule } from '@angular/common/http';
// import { TranslateModule, TranslateLoader } from '@ngx-translate/core';


// export function HttpLoaderFactory(http: HttpClient) {
//   return new TranslateHttpLoader(http, 'http://localhost:3000/api/translations/', ''); 
// }
// // @NgModule({
// //   declarations: [AppComponent],
// //   imports: [
// //     BrowserModule, 
// //     IonicModule.forRoot(), 
// //     AppRoutingModule,
    
// //   ],

// @NgModule({
//   declarations: [AppComponent],
//   imports: [
//     BrowserModule,
//     HttpClientModule, // Required!
//     IonicModule.forRoot(),
//     AppRoutingModule,
//     TranslateModule.forRoot({
//       loader: {
//         provide: TranslateLoader,
//         useFactory: HttpLoaderFactory,
//         deps: [HttpClient]
//       }
//     })
//   ],
//   providers: [
//     { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
//     provideHttpClient() // Added this to fix the HttpClient error
//   ],
//   bootstrap: [AppComponent],
// })
// export class AppModule {}


import { NgModule, APP_INITIALIZER } from '@angular/core'; // 1. Added APP_INITIALIZER
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { HttpClient, provideHttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// Loader factory for backend translations
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, 'http://localhost:3000/api/translations/', ''); 
}

// 2. New Initializer function to prevent the "Race Condition"
// export function appInitializerFactory(translate: TranslateService) {
//   return () => new Promise<void>((resolve) => {
//     // Matches the key used in your LanguageService
//     const savedLang = localStorage.getItem('app_language_code') || 'en';
    
//     translate.setDefaultLang('en');
//     translate.use(savedLang).subscribe({
//       next: () => {
//         console.log(`Successfully loaded language: ${savedLang}`);
//         resolve();
//       },
//       error: () => {
//         console.error(`Could not load language: ${savedLang}, falling back to English.`);
//         resolve(); // Still resolve so the app loads
//       }
//     });
//   });
// }

export function appInitializerFactory(translate: TranslateService) {
  return () => {
    const savedLang = localStorage.getItem('app_language_code') || 'en';
    translate.setDefaultLang('en');
    // Returning the Observable as a Promise directly ensures Angular waits
    return translate.use(savedLang).toPromise()
      .then(() => console.log(`Language ${savedLang} loaded`))
      .catch(() => console.error('Language load failed'));
  };
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideHttpClient(),
    // 3. Added the Initializer Provider
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializerFactory,
      deps: [TranslateService],
      multi: true
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}