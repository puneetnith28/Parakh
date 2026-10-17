export interface QuotaGuardConfig {
  maxRpm?: number;
  minDelayMs?: number;
  maxRetries?: number;
}

export interface QuotaGuardMetrics {
  totalRequests: number;
  throttledRequests: number;
  rateLimitHits: number;
  currentWindowRequests: number;
}

/**
 * Production Quota Guard & Rate Limiting Engine.
 * Safeguards against HTTP 429 Rate Exceeded errors on free and metered tiers,
 * enforcing inter-request spacing and exponential backoff with jitter.
 */
export class QuotaGuard {
  private readonly maxRpm: number;
  private readonly minDelayMs: number;
  private readonly maxRetries: number;

  private timestamps: number[] = [];
  private lastRequestTime = 0;
  private totalRequests = 0;
  private throttledRequests = 0;
  private rateLimitHits = 0;

  constructor(config: QuotaGuardConfig = {}) {
    this.maxRpm = config.maxRpm ?? 15;
    this.minDelayMs = config.minDelayMs ?? 800;
    this.maxRetries = config.maxRetries ?? 3;
  }

  /**
   * Enforces pacing before dispatching a model API call.
   * Delays execution if sliding 1-minute window limit or min inter-call delay is approached.
   */
  async throttle(): Promise<number> {
    const now = Date.now();
    this.cleanupOldTimestamps(now);

    let waitTime = 0;

    // 1. Minimum spacing between calls
    const elapsedSinceLast = now - this.lastRequestTime;
    if (elapsedSinceLast < this.minDelayMs) {
      waitTime = this.minDelayMs - elapsedSinceLast;
    }

    // 2. Sliding 60-second window check
    if (this.timestamps.length >= this.maxRpm) {
      const oldestInWindow = this.timestamps[0];
      const timeToWindowExpiry = 60000 - (now - oldestInWindow);
      if (timeToWindowExpiry > waitTime) {
        waitTime = timeToWindowExpiry;
      }
    }

    if (waitTime > 0) {
      this.throttledRequests++;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    const dispatchTime = Date.now();
    this.timestamps.push(dispatchTime);
    this.lastRequestTime = dispatchTime;
    this.totalRequests++;

    return waitTime;
  }

  /**
   * Computes backoff delay and user advisory upon receiving an HTTP 429 response.
   */
  handleRateLimit(
    statusCode: number,
    attempt: number,
    retryAfterHeader?: string
  ): { canRetry: boolean; backoffMs: number; advisory: string } {
    if (statusCode === 429) {
      this.rateLimitHits++;
    }

    if (attempt >= this.maxRetries) {
      return {
        canRetry: false,
        backoffMs: 0,
        advisory: `Provider quota exceeded (attempt ${attempt} of ${this.maxRetries}). Please try again later.`,
      };
    }

    let backoffMs: number;

    if (retryAfterHeader) {
      const parsedSeconds = parseInt(retryAfterHeader, 10);
      backoffMs = !isNaN(parsedSeconds) ? parsedSeconds * 1000 : 2000;
    } else {
      // Exponential backoff: base 1.5s * 2^attempt + jitter
      const jitter = Math.floor(Math.random() * 500);
      backoffMs = 1500 * Math.pow(2, attempt) + jitter;
    }

    return {
      canRetry: true,
      backoffMs,
      advisory: `Rate limit encountered. Pacing model request (retrying in ${Math.round(
        backoffMs / 1000
      )}s)...`,
    };
  }

  private cleanupOldTimestamps(now: number): void {
    const oneMinuteAgo = now - 60000;
    while (this.timestamps.length > 0 && this.timestamps[0] < oneMinuteAgo) {
      this.timestamps.shift();
    }
  }

  getMetrics(): QuotaGuardMetrics {
    this.cleanupOldTimestamps(Date.now());
    return {
      totalRequests: this.totalRequests,
      throttledRequests: this.throttledRequests,
      rateLimitHits: this.rateLimitHits,
      currentWindowRequests: this.timestamps.length,
    };
  }

  reset(): void {
    this.timestamps = [];
    this.lastRequestTime = 0;
    this.totalRequests = 0;
    this.throttledRequests = 0;
    this.rateLimitHits = 0;
  }
}

export const globalQuotaGuard = new QuotaGuard();
