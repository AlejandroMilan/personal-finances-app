import { BcryptPasswordHasher } from './bcrypt-password-hasher';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('hashes a plain password', async () => {
    const hashed = await hasher.hash('secret123');

    expect(hashed).not.toBe('secret123');
    expect(hashed).toContain('$2');
  });

  it('compares matching passwords', async () => {
    const hashed = await hasher.hash('secret123');

    await expect(hasher.compare('secret123', hashed)).resolves.toBe(true);
  });

  it('rejects non-matching passwords', async () => {
    const hashed = await hasher.hash('secret123');

    await expect(hasher.compare('other-password', hashed)).resolves.toBe(false);
  });
});
