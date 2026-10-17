/**
 * Secondary Sponsor Integration Boundary
 *
 * Implements adapters for optional secondary sponsors:
 * - ElevenLabs (Audio summary narration)
 * - Backboard (Context memory)
 * - DigitalOcean (Worker hosting specification)
 *
 * INVARIANT: All secondary integrations are non-blocking, isolated behind feature flags,
 * and failure/absence of any secondary sponsor NEVER impacts core assessment completion.
 */

export interface SecondaryFeatureFlags {
  enableElevenLabsAudio: boolean;
  enableBackboardMemory: boolean;
  enableDigitalOceanWorkers: boolean;
}

export function getSecondaryFeatureFlags(): SecondaryFeatureFlags {
  return {
    enableElevenLabsAudio: process.env.ENABLE_ELEVENLABS_AUDIO === "true" || Boolean(process.env.ELEVENLABS_API_KEY),
    enableBackboardMemory: process.env.ENABLE_BACKBOARD_MEMORY === "true" || Boolean(process.env.BACKBOARD_API_KEY),
    enableDigitalOceanWorkers: process.env.ENABLE_DIGITALOCEAN_WORKERS === "true" || Boolean(process.env.DIGITALOCEAN_ACCESS_TOKEN),
  };
}

export * from "./elevenlabs.js";
export * from "./backboard.js";
export * from "./digitalocean.js";
