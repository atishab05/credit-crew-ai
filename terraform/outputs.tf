output "cloudfront_domain" {
  value       = module.edge.cloudfront_domain
  description = "Public CloudFront domain serving the app."
}

output "alb_dns_name" {
  value       = module.compute.alb_dns_name
  description = "Internal ALB DNS name (behind CloudFront)."
}

output "ecr_repository_url" {
  value       = module.compute.ecr_repository_url
  description = "ECR repo the CI workflow pushes the app image to."
}

output "documents_bucket_name" {
  value       = module.data.documents_bucket_name
  description = "S3 bucket holding borrower documents and audit exports."
}

output "database_endpoint" {
  value       = module.data.database_endpoint
  description = "RDS Postgres endpoint (private subnet)."
  sensitive   = true
}

output "github_actions_role_arn" {
  value       = module.iam.github_actions_role_arn
  description = "IAM role ARN for GitHub Actions OIDC to assume during deploy."
}

output "nat_egress_ips" {
  value       = module.network.nat_egress_ips
  description = "Egress IPs to share with IDBI for sandbox allowlisting."
}
