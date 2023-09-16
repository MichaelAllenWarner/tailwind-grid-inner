import { foo } from '../src';

describe('foo', () => {
  it('should return `bar`', () => {
    expect(foo() === 'bar').toBe(true);
  });
});
