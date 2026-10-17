/**
 * DigitalOcean Background Worker Specification & Adapter
 *
 * Defines droplet and App Platform worker specifications for scalable assessment jobs.
 * Operates gracefully as a decoupled deployment descriptor when DIGITALOCEAN_ACCESS_TOKEN is omitted.
 */

export interface DigitalOceanWorkerSpec {
  name: string;
  region: string;
  size: string;
  image: string;
  instanceCount: number;
}

export class DigitalOceanAdapter {
  private apiToken?: string;

  constructor(apiToken?: string) {
    this.apiToken = apiToken || process.env.DIGITALOCEAN_ACCESS_TOKEN;
  }

  public isEnabled(): boolean {
    return Boolean(this.apiToken && this.apiToken.trim().length > 0);
  }

  public getWorkerSpecification(): DigitalOceanWorkerSpec {
    return {
      name: "parakh-eval-worker",
      region: "nyc3",
      size: "s-2vcpu-4gb",
      image: "docker.io/parakh/api:latest",
      instanceCount: 1,
    };
  }

  public async checkWorkerStatus(): Promise<{
    available: boolean;
    provider: "digitalocean" | "local_container" | "render";
    status: string;
  }> {
    if (!this.isEnabled()) {
      return {
        available: true,
        provider: "render",
        status: "Running in primary Render / Docker container (DigitalOcean worker bypassed).",
      };
    }

    return {
      available: true,
      provider: "digitalocean",
      status: "Configured with DigitalOcean token.",
    };
  }
}

export const digitalOceanAdapter = new DigitalOceanAdapter();
