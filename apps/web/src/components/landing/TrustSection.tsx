import React from 'react';
import { ShieldCheck, Lock, EyeOff, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export const TrustSection: React.FC = () => {
  return (
    <section id="trust" className="py-20 sm:py-28 bg-[#F2F4F0] border-t border-[#E2E5DE]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="dark" size="sm" className="mb-3">Zero-Trust Verification</Badge>
          <h2 className="font-display text-3xl sm:text-5xl text-[#111111] uppercase tracking-tight">
            BUILT FOR STRICT COMPLIANCE & PRIVACY
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5F625E]">
            Parakh safeguards engineering repositories with multi-layered perimeter validation, secret scrubbing, and cryptographic tamper detection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card variant="white" className="p-8">
            <div className="w-12 h-12 rounded-2xl bg-[#163300] text-[#9FE870] flex items-center justify-center mb-6">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#111111]">Cryptographic Provenance</h3>
            <p className="mt-3 text-sm text-[#5F625E] leading-relaxed">
              Every assessment report is stamped with a deterministic SHA-256 hash. Mutating any finding, citation, or status immediately invalidates the cryptographic signature.
            </p>
            <div className="mt-6 pt-4 border-t border-[#E2E5DE] text-xs font-mono text-[#163300] font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 72 Security Tests Passing
            </div>
          </Card>

          <Card variant="white" className="p-8">
            <div className="w-12 h-12 rounded-2xl bg-[#163300] text-[#9FE870] flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#111111]">SSRF Defense Gateway</h3>
            <p className="mt-3 text-sm text-[#5F625E] leading-relaxed">
              Target repository URLs are validated against private network boundaries (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, loopback, and cloud instance metadata 169.254.169.254).
            </p>
            <div className="mt-6 pt-4 border-t border-[#E2E5DE] text-xs font-mono text-[#163300] font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Strict Boundary Enforcement
            </div>
          </Card>

          <Card variant="white" className="p-8">
            <div className="w-12 h-12 rounded-2xl bg-[#163300] text-[#9FE870] flex items-center justify-center mb-6">
              <EyeOff className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#111111]">Secret Scrubbing</h3>
            <p className="mt-3 text-sm text-[#5F625E] leading-relaxed">
              API tokens, GitHub Personal Access Tokens (PATs), Google AI keys, and MongoDB connection credentials are automatically stripped from error logs, reports, and traces.
            </p>
            <div className="mt-6 pt-4 border-t border-[#E2E5DE] text-xs font-mono text-[#163300] font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Zero Plaintext Credentials
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
