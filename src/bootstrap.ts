import { bootstrapApplication } from '@angular/platform-browser';
import { FakeIamApiService } from './app/iam/data/fake-iam-api.service';
import { IamApiService } from './app/iam/data/iam-api.service';
import { IamPageComponent } from './app/iam/pages/iam-page.component';

bootstrapApplication(IamPageComponent, {
  providers: [{ provide: IamApiService, useClass: FakeIamApiService }],
}).catch((error: unknown) => console.error(error));
