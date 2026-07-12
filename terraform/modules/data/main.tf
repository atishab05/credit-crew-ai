variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "db_instance_class" { type = string }
variable "db_allocated_storage" { type = number }
variable "app_security_group" { type = string }

resource "aws_kms_key" "primary" {
  description             = "CreditCrew ${var.environment} CMK — RDS, S3, Secrets Manager"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = { Name = "creditcrew-${var.environment}-cmk" }
}

resource "aws_kms_alias" "primary" {
  name          = "alias/creditcrew-${var.environment}"
  target_key_id = aws_kms_key.primary.key_id
}

# ---------------- S3: documents + audit exports ----------------
resource "random_id" "bucket_suffix" { byte_length = 4 }

resource "aws_s3_bucket" "documents" {
  bucket        = "creditcrew-${var.environment}-docs-${random_id.bucket_suffix.hex}"
  force_destroy = false
  object_lock_enabled = true
  tags = { Name = "creditcrew-${var.environment}-documents" }
}

resource "aws_s3_bucket_ownership_controls" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket                  = aws_s3_bucket.documents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.primary.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_object_lock_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    default_retention {
      mode = "GOVERNANCE"
      days = 2555 # 7 years — RBI record retention for lending records
    }
  }
}

# ---------------- RDS Postgres ----------------
resource "aws_db_subnet_group" "pg" {
  name       = "creditcrew-${var.environment}-pg-subnets"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "pg" {
  name        = "creditcrew-${var.environment}-pg"
  description = "Postgres accessible from ECS tasks only"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_security_group]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_db_instance" "pg" {
  identifier                          = "creditcrew-${var.environment}"
  engine                              = "postgres"
  engine_version                      = "16.4"
  instance_class                      = var.db_instance_class
  allocated_storage                   = var.db_allocated_storage
  storage_type                        = "gp3"
  storage_encrypted                   = true
  kms_key_id                          = aws_kms_key.primary.arn
  db_name                             = "creditcrew"
  username                            = "creditcrew_app"
  password                            = random_password.db.result
  multi_az                            = true
  publicly_accessible                 = false
  vpc_security_group_ids              = [aws_security_group.pg.id]
  db_subnet_group_name                = aws_db_subnet_group.pg.name
  backup_retention_period             = 14
  copy_tags_to_snapshot               = true
  deletion_protection                 = true
  iam_database_authentication_enabled = true
  performance_insights_enabled        = true
  performance_insights_kms_key_id     = aws_kms_key.primary.arn
  auto_minor_version_upgrade          = true
  skip_final_snapshot                 = false
  final_snapshot_identifier           = "creditcrew-${var.environment}-final"
  apply_immediately                   = false
}

# ---------------- Secrets Manager ----------------
resource "aws_secretsmanager_secret" "db_url" {
  name       = "creditcrew/${var.environment}/db_url"
  kms_key_id = aws_kms_key.primary.arn
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id     = aws_secretsmanager_secret.db_url.id
  secret_string = "postgres://${aws_db_instance.pg.username}:${random_password.db.result}@${aws_db_instance.pg.endpoint}/${aws_db_instance.pg.db_name}?sslmode=require"
}

# Placeholders for IDBI sandbox credentials — populate out-of-band via CLI
# after the bank issues them; the ECS task reads them by ARN at runtime.
resource "aws_secretsmanager_secret" "idbi_gst"  { name = "creditcrew/${var.environment}/idbi/gst_api_key"  kms_key_id = aws_kms_key.primary.arn }
resource "aws_secretsmanager_secret" "idbi_upi"  { name = "creditcrew/${var.environment}/idbi/upi_api_key"  kms_key_id = aws_kms_key.primary.arn }
resource "aws_secretsmanager_secret" "idbi_aa"   { name = "creditcrew/${var.environment}/idbi/aa_api_key"   kms_key_id = aws_kms_key.primary.arn }
resource "aws_secretsmanager_secret" "idbi_epfo" { name = "creditcrew/${var.environment}/idbi/epfo_api_key" kms_key_id = aws_kms_key.primary.arn }
resource "aws_secretsmanager_secret" "idbi_elec" { name = "creditcrew/${var.environment}/idbi/elec_api_key" kms_key_id = aws_kms_key.primary.arn }

output "database_endpoint" { value = aws_db_instance.pg.endpoint }
output "documents_bucket_name" { value = aws_s3_bucket.documents.id }
output "kms_key_arn" { value = aws_kms_key.primary.arn }
output "app_secret_arns" {
  value = {
    db_url    = aws_secretsmanager_secret.db_url.arn
    idbi_gst  = aws_secretsmanager_secret.idbi_gst.arn
    idbi_upi  = aws_secretsmanager_secret.idbi_upi.arn
    idbi_aa   = aws_secretsmanager_secret.idbi_aa.arn
    idbi_epfo = aws_secretsmanager_secret.idbi_epfo.arn
    idbi_elec = aws_secretsmanager_secret.idbi_elec.arn
  }
}
