// import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// import { AppModule } from './app/app.module';

// platformBrowserDynamic().bootstrapModule(AppModule)
//   .catch(err => console.log(err));

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// ... other imports

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));

// Add this line at the bottom
defineCustomElements(window);