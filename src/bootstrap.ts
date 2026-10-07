import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { IamPageComponent } from './app/iam/pages/iam-page.component';

bootstrapApplication(IamPageComponent, {
  providers: [provideHttpClient()],
}).catch((error: unknown) => console.error(error));