import { isWithinServiceArea } from '../src/config/serviceArea';

describe('service-area geo-fence (Limitation #1)', () => {
  it('accepts a point inside San Jose Del Monte', () => {
    expect(isWithinServiceArea([121.0453, 14.8136])).toBe(true);
  });

  it('rejects a point in Manila', () => {
    expect(isWithinServiceArea([120.9842, 14.5995])).toBe(false);
  });
});
