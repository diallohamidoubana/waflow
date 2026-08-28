import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index.js';

describe('Testing Infrastructure Foundation', () => {
  it('should validate testing infrastructure is operational', () => {
    expect(PACKAGE_NAME).toBe('@waflow/testing');
    expect(1 + 1).toBe(2);
  });
});
