import { Injectable } from '@angular/core';
import { Level } from '../models/level.model';
import { LEVELS } from './levels.data';

@Injectable({
  providedIn: 'root'
})
export class LevelsService {

  constructor() { }

  getLevels(): Level[] {
    return LEVELS;
  }

  getLevelById(id: number): Level | undefined {
    return LEVELS.find(level => level.id === id);
  }
}

