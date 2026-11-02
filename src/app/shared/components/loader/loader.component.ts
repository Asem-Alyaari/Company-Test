import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProgressSpinner } from 'primeng/progressspinner';
import { LoadingService } from '@core';

@Component({
  selector: 'app-loader',
  imports: [ProgressSpinner],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent {
  protected readonly loadingService = inject(LoadingService);
}
