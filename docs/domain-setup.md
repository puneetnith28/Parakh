# Production Custom Domain (.tech), TLS 1.3, & DNS Routing Guide

- **Application:** Parakh Capability Evaluation Platform
- **Registered Domain:** `parakh.tech` (Sponsored by .tech Domains)
- **Deployment Platform:** Render Cloud Application Platform
- **SSL / TLS Authority:** Automated Let's Encrypt TLS 1.3

---

## 1. DNS Architecture & Host Mapping

Parakh splits frontend presentation and REST API workloads into decoupled endpoints to enforce least-privilege security boundaries and independent scaling:

| Subdomain | Target Service | Record Type | Value / Destination | Port |
|---|---|---|---|---|
| `parakh.tech` | Primary Web Dashboard (`parakh-web`) | `ALIAS` / `ANAME` | `parakh-web.onrender.com` | 443 |
| `www.parakh.tech` | Redirect to Apex | `CNAME` | `parakh-web.onrender.com` | 443 |
| `api.parakh.tech` | Backend Assessment Engine (`parakh-api`) | `CNAME` | `parakh-api.onrender.com` | 443 |

---

## 2. Automated TLS 1.3 & Certificate Provisioning

Render manages automated TLS certificate lifecycles via the **Let's Encrypt ACME v2** protocol with zero downtime:
1. **DNS Verification:** Render creates an ACME challenge record (`_acme-challenge.parakh.tech`) to verify domain ownership.
2. **Cipher Suites:** TLS 1.3 and TLS 1.2 strict cipher suites are enforced. Deprecated TLS 1.0/1.1 and insecure ciphers (RC4, 3DES) are terminated at the edge proxy.
3. **Automated Renewal:** Certificates auto-renew every 60 days before the 90-day expiry threshold.

---

## 3. HTTP-to-HTTPS Redirection & HSTS Enforcement

All unencrypted HTTP requests (`http://parakh.tech/*` and `http://api.parakh.tech/*`) are automatically redirected via HTTP 301 Permanent Redirect to HTTPS.

In addition, the API server executes `helmet()` middleware which transmits the following production security headers on all responses:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Cross-Origin-Opener-Policy: same-origin
```

---

## 4. Cross-Origin Resource Sharing (CORS) Policy

In production environments, `api.parakh.tech` restricts incoming cross-origin requests specifically to verified origins:
- `https://parakh.tech`
- `https://www.parakh.tech`
- `https://parakh-web.onrender.com`

Any unauthorized third-party origin attempting to invoke `/api/*` endpoints with credentials is rejected with HTTP 403 Forbidden.

---

## 5. Verification Commands

Verify live DNS resolution and TLS handshake with standard terminal utilities:

```bash
# Verify DNS CNAME resolution
dig api.parakh.tech CNAME +short

# Verify HTTPS redirection and HSTS response headers
curl -sI https://api.parakh.tech/healthz | grep -iE 'HTTP/|strict-transport-security|access-control'

# Validate TLS cipher negotiation and certificate chain
openssl s_client -connect api.parakh.tech:443 -servername api.parakh.tech -tls1_3 </dev/null
```
