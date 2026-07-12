variable "environment" {
  description = "Deployment environment (dev|uat|prod)."
  type        = string
}

variable "aws_region" {
  description = "AWS region. Default ap-south-1 for RBI data-localisation."
  type        = string
  default     = "ap-south-1"
}

variable "owner" {
  description = "Team or contact owning this stack (goes into resource tags)."
  type        = string
  default     = "creditcrew-platform"
}

variable "vpc_cidr" {
  description = "CIDR block for the CreditCrew VPC."
  type        = string
  default     = "10.40.0.0/16"
}

variable "azs" {
  description = "Availability zones to spread subnets across."
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
}

variable "app_image_tag" {
  description = "ECR image tag to deploy. Pushed by CI (see .github/workflows/deploy.yml)."
  type        = string
  default     = "latest"
}

variable "app_container_port" {
  description = "Port the app container listens on."
  type        = number
  default     = 3000
}

variable "app_desired_count" {
  description = "Baseline Fargate task count."
  type        = number
  default     = 2
}

variable "app_cpu" {
  description = "Fargate task CPU units (1024 = 1 vCPU)."
  type        = number
  default     = 1024
}

variable "app_memory" {
  description = "Fargate task memory MiB."
  type        = number
  default     = 2048
}

variable "db_instance_class" {
  description = "RDS Postgres instance class."
  type        = string
  default     = "db.t4g.medium"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage (GB). gp3."
  type        = number
  default     = 100
}

variable "log_retention_days" {
  description = "CloudWatch log group retention. RBI/SEBI expects >= 2 years for audit logs."
  type        = number
  default     = 731
}

variable "public_domain" {
  description = "Public FQDN for the CloudFront distribution (e.g. creditcrew.uat.idbi.example)."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN in us-east-1 for CloudFront. Empty = use default CloudFront cert (dev only)."
  type        = string
  default     = ""
}

variable "idbi_sandbox_allowlist_cidrs" {
  description = "IDBI sandbox CIDR blocks reachable from the NAT egress IPs. Populated by IDBI networking."
  type        = list(string)
  default     = []
}
