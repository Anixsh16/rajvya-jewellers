import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({ reservations: 0, limit: 2, provider: vi.fn() }));
vi.mock('../src/lib/db', () => ({
  db: () => async () => [{ ok: ++state.reservations <= state.limit }],
  plain: (x: unknown) => x,
}));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: state.provider, embedContent: state.provider };
  },
}));
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  state.reservations = 0;
  state.limit = 2;
  state.provider.mockReset();
  vi.stubEnv('AI_EVALUATION', '0');
  vi.stubEnv('GEMINI_API_KEY', 'quota-mock-key');
});
it('offline previews never contact the model provider', async () => {
  vi.stubEnv('GEMINI_API_KEY', 'local-offline-fixture');
  const { gemini } = await import('../src/lib/ai');
  await expect(
    gemini().models.embedContent({ model: 'fixture', contents: 'test' }),
  ).rejects.toThrow(/offline preview/i);
  expect(state.provider).not.toHaveBeenCalled();
  expect(state.reservations).toBe(0);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
it('counts a provider retry against the daily allowance', async () => {
  const { gemini } = await import('../src/lib/ai');
  state.provider
    .mockRejectedValueOnce({ status: 429, message: 'per minute' })
    .mockResolvedValueOnce({ text: 'ok' });
  const pending = gemini().models.generateContent({ model: 'fixture', contents: 'test' });
  await vi.advanceTimersByTimeAsync(15000);
  await expect(pending).resolves.toEqual({ text: 'ok' });
  expect(state.reservations).toBe(2);
  expect(state.provider).toHaveBeenCalledTimes(2);
});
it('blocks a retry at the exhausted cap before contacting the provider', async () => {
  const { gemini } = await import('../src/lib/ai');
  state.limit = 1;
  state.provider.mockRejectedValue({ status: 429, message: 'per minute' });
  const pending = expect(
    gemini().models.embedContent({ model: 'fixture', contents: 'test' }),
  ).rejects.toThrow(/allowance/i);
  await vi.advanceTimersByTimeAsync(30000);
  await pending;
  expect(state.provider).toHaveBeenCalledTimes(1);
});
