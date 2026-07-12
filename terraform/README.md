# CreditCrew AI — Terraform (AWS)

Production-grade IaC for deploying CreditCrew AI into IDBI's AWS account.

## Layout

```
terraform/
├── main.tf, variables.tf, outputs.tf, providers.tf, versions.tf
├── envs/{dev,uat,prod}.tfvars
└── modules/
    ├── network        # VPC, public/private subnets, NAT, S3 gateway endpoint
    ├── data           # RDS Postgres (Multi-AZ, KMS, PITR), S3 + Object Lock, Secrets Manager, CMK
    ├── compute        # ECR, ECS Fargate cluster + service, task/exec roles, ALB, autoscaling
    ├── edge           # CloudFront (IN geo-restricted), WAFv2 (OWASP + rate-limit)
    ├── observability  # CloudWatch log groups, CPU + 5xx alarms
    └── iam            # GitHub Actions OIDC role for CI/CD
```

## Prerequisites

1. AWS account in `ap-south-1` (RBI data-localisation).
2. Terraform `~> 1.9` and AWS CLI configured with an admin role for the first apply.
3. Remote state backend — S3 bucket + DynamoDB lock table in the same account (uncomment `backend "s3"` in `versions.tf`).
4. Update `github_repo` in `main.tf` (`module.iam`) to your org/repo.

## Apply

```bash
cd terraform
terraform init
terraform workspace new dev  # or select
terraform apply -var-file=envs/dev.tfvars
```

Repeat with `uat.tfvars` / `prod.tfvars` in separate workspaces or state files.

## Post-apply

- Push a container image to the ECR repo output by `terraform output ecr_repository_url` (CI does this — see `.github/workflows/deploy.yml`).
- Populate IDBI sandbox secrets via CLI (values never enter Terraform state):
  ```bash
  aws secretsmanager put-secret-value \
    --secret-id creditcrew/uat/idbi/gst_api_key --secret-string '***'
  ```
- Share `terraform output nat_egress_ips` with IDBI networking for sandbox allowlisting.
- Configure the Route 53 (or IDBI-managed DNS) record for `public_domain` pointing to CloudFront.

## Destroy

`deletion_protection = true` is set on RDS; disable it in the module and re-apply before `terraform destroy` in dev.
