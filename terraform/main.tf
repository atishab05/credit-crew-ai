module "network" {
  source      = "./modules/network"
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  azs         = var.azs
}

module "data" {
  source               = "./modules/data"
  environment          = var.environment
  vpc_id               = module.network.vpc_id
  private_subnet_ids   = module.network.private_subnet_ids
  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  app_security_group   = module.compute.app_security_group_id
}

module "compute" {
  source                = "./modules/compute"
  environment           = var.environment
  vpc_id                = module.network.vpc_id
  private_subnet_ids    = module.network.private_subnet_ids
  public_subnet_ids     = module.network.public_subnet_ids
  app_image_tag         = var.app_image_tag
  app_container_port    = var.app_container_port
  app_desired_count     = var.app_desired_count
  app_cpu               = var.app_cpu
  app_memory            = var.app_memory
  app_secrets_arns      = module.data.app_secret_arns
  log_group_name        = module.observability.app_log_group_name
  documents_bucket_name = module.data.documents_bucket_name
  kms_key_arn           = module.data.kms_key_arn
}

module "edge" {
  source              = "./modules/edge"
  environment         = var.environment
  alb_dns_name        = module.compute.alb_dns_name
  alb_zone_id         = module.compute.alb_zone_id
  public_domain       = var.public_domain
  acm_certificate_arn = var.acm_certificate_arn
}

module "observability" {
  source             = "./modules/observability"
  environment        = var.environment
  log_retention_days = var.log_retention_days
  ecs_service_name   = module.compute.service_name
  ecs_cluster_name   = module.compute.cluster_name
  alb_arn_suffix     = module.compute.alb_arn_suffix
}

module "iam" {
  source      = "./modules/iam"
  environment = var.environment
  github_repo = "your-org/creditcrew-ai"
}
