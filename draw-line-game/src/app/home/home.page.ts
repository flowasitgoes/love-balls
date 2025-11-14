import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LevelsService } from '../services/levels.service';
import { ProgressService } from '../services/progress.service';
import { Level } from '../models/level.model';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  levels: Level[] = [];

  constructor(
    private levelsService: LevelsService,
    private progressService: ProgressService,
    private router: Router
  ) {}

  ngOnInit() {
    this.levels = this.levelsService.getLevels();
  }

  isLevelCompleted(levelId: number): boolean {
    return this.progressService.isLevelCompleted(levelId);
  }

  startLevel(levelId: number): void {
    this.router.navigate(['/game', levelId]);
  }
}
