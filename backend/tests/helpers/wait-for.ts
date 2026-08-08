type WaitForOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  description: string;
};

export async function waitFor<T>(
  operation: () => Promise<T>,
  isReady: (value: T) => boolean,
  {
    timeoutMs = 25_000,
    intervalMs = 500,
    description
  }: WaitForOptions
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const value = await operation();

      if (isReady(value)) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const errorDetails =
    lastError instanceof Error ? ` Last error: ${lastError.message}` : "";

  throw new Error(
    `Timed out waiting for ${description}.${errorDetails}`
  );
}