const RATE_LIMIT_ERROR_MESSAGE =
  "Terlalu banyak percobaan daftar. Coba lagi nanti atau gunakan akun yang sudah terdaftar.";

const rateLimitSignals = [
  "email rate limit exceeded",
  "rate limit",
  "for security purposes",
];

export function getAuthErrorMessage(
  message: string | null | undefined,
  fallback: string,
) {
  const normalizedMessage = (message ?? "").toLowerCase();
  const isRateLimited = rateLimitSignals.some((signal) =>
    normalizedMessage.includes(signal),
  );

  return isRateLimited ? RATE_LIMIT_ERROR_MESSAGE : fallback;
}
