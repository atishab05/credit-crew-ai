terraform {
  required_version = "~> 1.9"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.60" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
  # Configure remote state in the bank's own account before `terraform init`:
  # backend "s3" {
  #   bucket         = "idbi-creditcrew-tfstate"
  #   key            = "creditcrew/${var.environment}/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "idbi-creditcrew-tflock"
  #   encrypt        = true
  # }
}
