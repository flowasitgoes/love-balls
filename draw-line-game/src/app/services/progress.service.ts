import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private readonly STORAGE_KEY = 'completedLevels';

  constructor() { }

  getCompletedLevels(): number[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  isLevelCompleted(levelId: number): boolean {
    return this.getCompletedLevels().includes(levelId);
  }

  completeLevel(levelId: number): void {
    const completed = this.getCompletedLevels();
    if (!completed.includes(levelId)) {
      completed.push(levelId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(completed));
    }
  }

  resetProgress(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

