import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import {  HttpClientModule } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';


export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, 'http://localhost:3000/api/translations/', ''); 
}
// @NgModule({
//   declarations: [AppComponent],
//   imports: [
//     BrowserModule, 
//     IonicModule.forRoot(), 
//     AppRoutingModule,
    
//   ],

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule, // Required!
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
    provideHttpClient() // Added this to fix the HttpClient error
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

// import { HttpClient, HttpClientModule } from '@angular/common/http';
// import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
// import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// // Factory for the loader
// export function HttpLoaderFactory(http: HttpClient) {
//   return new TranslateHttpLoader(http, 'http://localhost:3000/api/translations/', '');
// }

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
//   bootstrap: [AppComponent]
// })
// export class AppModule {}