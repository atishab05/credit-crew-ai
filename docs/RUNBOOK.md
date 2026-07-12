# CreditCrew AI — Runbook

## Deploy

- CI: push to `main` → `.github/workflows/deploy.yml` builds Docker image, pushes to ECR, runs `terraform apply`, forces ECS deployment. `workflow_dispatch` targets `dev|uat|prod`.
- Manual: `docker build -f docker/Dockerfile -t creditcrew:local .` then `cd terraform && terraform apply -var-file=envs/<env>.tfvars -var=app_image_tag=<sha>`.

## Rollback

1. `aws ecs describe-services --cluster creditcrew-<env> --services creditcrew-<env>` — note previous task definition ARN.
2. `aws ecs update-service --cluster creditcrew-<env> --service creditcrew-<env> --task-definition <prev-arn>`.
3. Or re-run the CI workflow pinning `app_image_tag` to the previous commit SHA.

Circuit breaker is enabled on the ECS deployment — bad tasks auto-roll back.

## On-call

- **CloudWatch alarms** (`creditcrew-<env>-ecs-cpu-high`, `creditcrew-<env>-alb-5xx`) → SNS topic (wire to PagerDuty / Ops-Genie via SNS subscription — not created by IaC).
- **Logs**: `/creditcrew/<env>/app` in CloudWatch Logs. Retained 731 days.
- **Container Insights** dashboards on the ECS cluster.

## Common tasks

### Rotate IDBI sandbox key
```bash
aws secretsmanager put-secret-value \
  --secret-id creditcrew/<env>/idbi/<source>_api_key \
  --secret-string '<new-key>'
aws ecs update-service --cluster creditcrew-<env> --service creditcrew-<env> --force-new-deployment
```

### Restore database point-in-time
```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier creditcrew-<env> \
  --target-db-instance-identifier creditcrew-<env>-restore \
  --restore-time <ISO-8601>
```
Then swap the `DATABASE_URL` secret and force redeploy.

### DPDP erasure request
1. Run the erasure SQL against the target application row (masks PII, sets `pii_erased_at`).
2. Delete matching S3 objects: `aws s3 rm s3://<bucket>/apps/<application_id>/ --recursive` (Object Lock GOVERNANCE allows deletion by holders of `s3:BypassGovernanceRetention`).
3. Log the action in `audit_logs`.

## Disaster recovery

- **RPO 15 min** via RDS PITR (14-day window) and cross-region S3 replication (add to `modules/data` before prod).
- **RTO 60 min** — Multi-AZ RDS failover + ECS redeploy from last known good image.
- Quarterly DR drills: restore RDS PITR into a scratch env and boot the app pointed at it.
