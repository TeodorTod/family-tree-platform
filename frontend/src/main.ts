import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

document.documentElement.setAttribute('data-p-color-scheme', 'light');
document.documentElement.style.setProperty('color-scheme', 'light');

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)
);
