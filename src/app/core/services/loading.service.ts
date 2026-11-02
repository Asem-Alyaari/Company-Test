import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private readonly activeRequests = signal<number>(0);

  readonly isLoading = computed(() => this.activeRequests() > 0);
  readonly requestCount = computed(() => this.activeRequests());

  show(): void {
    this.activeRequests.update((count) => count + 1);
  }

  hide(): void {
    this.activeRequests.update((count) => Math.max(0, count - 1));
  }

  reset(): void {
    this.activeRequests.set(0);
  }
}
