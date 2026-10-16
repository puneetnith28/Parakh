import { AssessmentReport } from "@parakh/contracts";

export interface StoredReportRecord {
  report: AssessmentReport;
  viewToken: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredOpportunityRecord {
  id: string;
  rawText: string;
  title: string;
  createdAt: Date;
}

export interface ReportStorage {
  getMode(): "mongodb" | "memory";
  isPersistent(): boolean;
  saveReport(report: AssessmentReport, viewToken: string, ttlDays?: number): Promise<AssessmentReport>;
  getReportById(id: string): Promise<{ report: AssessmentReport; viewToken: string } | null>;
  getReportByToken(id: string, viewToken: string): Promise<AssessmentReport | null>;
  deleteReport(id: string, viewToken: string): Promise<boolean>;
  saveOpportunity(opp: { id: string; rawText: string; title: string }): Promise<void>;
  getOpportunity(id: string): Promise<StoredOpportunityRecord | null>;
  clearAll(): Promise<void>;
}

/**
 * Ephemeral In-Memory Storage for 100% stateless execution when MONGODB_URI is not configured.
 */
export class MemoryReportStorage implements ReportStorage {
  private reports = new Map<string, StoredReportRecord>();
  private opportunities = new Map<string, StoredOpportunityRecord>();

  getMode(): "memory" {
    return "memory";
  }

  isPersistent(): boolean {
    return false;
  }

  async saveReport(
    report: AssessmentReport,
    viewToken: string,
    ttlDays?: number
  ): Promise<AssessmentReport> {
    const now = new Date();
    const expiresAt = ttlDays
      ? new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000)
      : undefined;

    this.reports.set(report.id, {
      report: JSON.parse(JSON.stringify(report)), // clone
      viewToken,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return report;
  }

  async getReportById(id: string): Promise<{ report: AssessmentReport; viewToken: string } | null> {
    const record = this.reports.get(id);
    if (!record) return null;

    if (record.expiresAt && record.expiresAt < new Date()) {
      this.reports.delete(id);
      return null;
    }

    return {
      report: JSON.parse(JSON.stringify(record.report)),
      viewToken: record.viewToken,
    };
  }

  async getReportByToken(id: string, viewToken: string): Promise<AssessmentReport | null> {
    const record = await this.getReportById(id);
    if (!record) return null;

    if (record.viewToken !== viewToken) {
      return null;
    }

    return record.report;
  }

  async deleteReport(id: string, viewToken: string): Promise<boolean> {
    const record = this.reports.get(id);
    if (!record) return false;

    if (record.viewToken !== viewToken) {
      return false;
    }

    return this.reports.delete(id);
  }

  async saveOpportunity(opp: { id: string; rawText: string; title: string }): Promise<void> {
    this.opportunities.set(opp.id, {
      ...opp,
      createdAt: new Date(),
    });
  }

  async getOpportunity(id: string): Promise<StoredOpportunityRecord | null> {
    const opp = this.opportunities.get(id);
    return opp ? { ...opp } : null;
  }

  async clearAll(): Promise<void> {
    this.reports.clear();
    this.opportunities.clear();
  }
}
