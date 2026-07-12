provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "CreditCrew-AI"
      Environment = var.environment
      Owner       = var.owner
      Compliance  = "RBI-SEBI-DPDP"
      ManagedBy   = "Terraform"
    }
  }
}
