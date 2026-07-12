# CreditCrew AI — Regulatory control mapping

Maps each control to the AWS resource(s) provisioned by `terraform/` and the app-level control that enforces it. Nothing on this page is a certification claim.

## DPDP Act 2023

| Requirement | Implementation |
| --- | --- |
| Purpose limitation & lawful ground | Explicit borrower consent captured at intake (`applications.consent_given`, `consent_reference`, `consent_at`). Server-side validated. |
| Retention limitation | `applications.retention_until` set per application; erasure job documented in `RUNBOOK.md`. |
| Data localisation | All resources in `ap-south-1`. CloudFront geo-restricted to `IN`. |
| Encryption at rest | RDS `storage_encrypted=true` (KMS CMK), S3 SSE-KMS with bucket key. |
| Encryption in transit | ALB HTTPS + CloudFront TLS 1.2 min (`TLSv1.2_2021` when custom cert). `rds.force_ssl=1` recommended parameter group override. |
| Data-principal rights | Erasure runbook + PII masking in list views (`src/lib/pii.ts`). |
| Notice of breach | Handled operationally via CloudWatch alarms + on-call. |

## RBI — IT Framework, MD on IT Governance, Digital Lending Guidelines

| Requirement | Implementation |
| --- | --- |
| Audit trail (append-only) | `audit_logs` table; every action (create, connect, agent complete, decision, doc access) logged with actor + timestamp + JSON details. |
| RBAC & segregation | Loan officer scoping via RLS on all rows (`loan_officer_id = auth.uid()`). Admin actions gated by `has_role()`. |
| Segregation of environments | Terraform workspaces `dev / uat / prod`, separate VPCs, separate KMS CMKs. |
| Immutable logs | CloudWatch Logs (731-day retention). S3 Object Lock (GOVERNANCE, 7 years) for exported audit logs. |
| MFA for admin | Enforced at AWS IAM Identity Center / IdP layer (bank-managed). |
| Consent Architecture (AA) | Adapter accepts `IDBI_AA_CONSENT_HANDLE`; consent artefact stored with the application. |
| Digital Lending — LSP/DL app disclosures | Trust page (`/compliance`) discloses controls; loan officer keeps decisioning authority. |
| Record retention (7y) | S3 Object Lock GOVERNANCE 7 years. |

## SEBI SAR (System Audit Report) alignment

| Requirement | Implementation |
| --- | --- |
| Log retention ≥ 2 years | CloudWatch Logs retention 731 days (`log_retention_days`). |
| Change management | GitHub PR + CI (OIDC, no long-lived AWS keys). Terraform state + plan approvals. |
| Vulnerability management | ECR `scan_on_push`, WAFv2 managed rules, `readonlyRootFilesystem` on tasks. |
| Incident response | `RUNBOOK.md` § On-call and DR. |

## Shared responsibility

- **Lovable / app**: application code, adapter layer, RLS, audit logging, DPDP consent capture.
- **IDBI**: AWS account guardrails (SCPs), IdP + MFA, DNS, incident-response BCP, regulatory reporting.
- **AWS**: physical infra, hypervisor, managed-service patching.
