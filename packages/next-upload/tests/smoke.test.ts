import * as pkg from '../src';
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('package loads', () => {
    expect(pkg).toBeTruthy();
  });
});
