# Handover — CreditCrew AI to IDBI Engineering

This document is the entry point for the IDBI engineering & infosec teams.

## What you're receiving

- Full application source (TanStack Start + React 19).
- **Terraform IaC** (`terraform/`) — VPC, RDS, ECS Fargate, S3 + KMS, CloudFront + WAFv2, Secrets Manager, IAM, CloudWatch.
- **Docker build** (`docker/Dockerfile`) + **GitHub Actions deploy pipeline** (`.github/workflows/deploy.yml`) using AWS OIDC (no long-lived keys).
- **Documentation** (`docs/`) — architecture, runbook, security-control mapping, sandbox-integration contract, this handover.

## Suggested review order

1. `docs/ARCHITECTURE.md` — 5-minute overview.
2. `docs/SECURITY_CONTROLS.md` — RBI / SEBI / DPDP mapping to specific AWS resources.
3. `terraform/README.md` + `terraform/main.tf` — module wiring.
4. `docs/SANDBOX_INTEGRATION.md` — how to plug your GST / UPI / AA / EPFO / Electricity endpoints.
5. `docs/RUNBOOK.md` — deploy, rollback, DR, on-call.

## What we need from IDBI

- **AWS account** in `ap-south-1` with an admin role for the first `terraform apply`.
- **Sandbox base URLs + credentials** for the 5 alternative data sources (see `docs/SANDBOX_INTEGRATION.md`).
- **CIDR blocks / PrivateLink** details for the sandbox endpoints so egress can be tightened.
- **Public DNS name** and an ACM certificate ARN in `us-east-1` for CloudFront (per environment).
- **GitHub org/repo** name (populated in `terraform/main.tf → module.iam.github_repo`) so the OIDC trust policy scopes correctly.

## Deploy checklist

- [ ] S3 + DynamoDB remote-state backend created and referenced in `terraform/versions.tf`.
- [ ] `module.iam.github_repo` updated to your GitHub org/repo.
- [ ] First `terraform apply -var-file=envs/dev.tfvars` completes clean.
- [ ] GitHub repo secret `AWS_DEPLOY_ROLE_ARN` set to `terraform output github_actions_role_arn`.
- [ ] IDBI sandbox credentials populated in Secrets Manager (`creditcrew/<env>/idbi/*`).
- [ ] DNS A/ALIAS pointed at the CloudFront distribution.
- [ ] Smoke test at `https://<public_domain>/` renders the landing page.

## Contact

- Engineering: `creditcrew-eng@your-org.example`
- Security: `creditcrew-security@your-org.example`

## Sharing

- **Git repo** — read access granted to the IDBI engineering team on request. Reference the release tag/commit in your submission.
- **Offline zip** — run `make zip` from the repo root to produce `handover-<date>.zip` containing `terraform/`, `docker/`, `.github/`, `docs/` and this file.
