import { Injectable } from '@nestjs/common';

/** Horloge injectable : les tests figent ou avancent le temps sans attendre. */
@Injectable()
export class Clock {
  private fixed: Date | null = null;

  now(): Date {
    return this.fixed ? new Date(this.fixed) : new Date();
  }

  set(date: Date | null): void {
    this.fixed = date;
  }

  advance(ms: number): void {
    this.fixed = new Date(this.now().getTime() + ms);
  }
}

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
