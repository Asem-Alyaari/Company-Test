import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private readonly sidebarVisible = signal<boolean>(false);

  readonly isSidebarVisible = this.sidebarVisible.asReadonly();

  toggleSidebar(): void {
    this.sidebarVisible.update((visible) => !visible);
  }

  openSidebar(): void {
    this.sidebarVisible.set(true);
  }

  closeSidebar(): void {
    this.sidebarVisible.set(false);
  }

  setSidebarVisible(visible: boolean): void {
    this.sidebarVisible.set(visible);
  }
}
