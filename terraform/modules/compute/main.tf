variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "public_subnet_ids" { type = list(string) }
variable "app_image_tag" { type = string }
variable "app_container_port" { type = number }
variable "app_desired_count" { type = number }
variable "app_cpu" { type = number }
variable "app_memory" { type = number }
variable "app_secrets_arns" { type = map(string) }
variable "log_group_name" { type = string }
variable "documents_bucket_name" { type = string }
variable "kms_key_arn" { type = string }

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ---------------- ECR ----------------
resource "aws_ecr_repository" "app" {
  name                 = "creditcrew-${var.environment}"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }
}

# ---------------- Security groups ----------------
resource "aws_security_group" "alb" {
  name        = "creditcrew-${var.environment}-alb"
  description = "ALB from CloudFront only"
  vpc_id      = var.vpc_id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    # Restrict to CloudFront managed prefix list in production.
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "app" {
  name        = "creditcrew-${var.environment}-app"
  description = "Fargate tasks; ingress only from ALB"
  vpc_id      = var.vpc_id
  ingress {
    from_port       = var.app_container_port
    to_port         = var.app_container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ---------------- ALB ----------------
resource "aws_lb" "app" {
  name               = "creditcrew-${var.environment}"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
  drop_invalid_header_fields = true
}

resource "aws_lb_target_group" "app" {
  name        = "creditcrew-${var.environment}"
  port        = var.app_container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  health_check {
    path                = "/"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect { port = "443", protocol = "HTTPS", status_code = "HTTP_301" }
  }
}

# HTTPS listener is added by module.edge via CloudFront-terminated TLS;
# for direct-ALB dev environments, terminate TLS here with an ACM cert instead.

# ---------------- ECS ----------------
resource "aws_ecs_cluster" "app" {
  name = "creditcrew-${var.environment}"
  setting { name = "containerInsights", value = "enabled" }
}

resource "aws_iam_role" "task_execution" {
  name = "creditcrew-${var.environment}-task-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy_attachment" "task_exec_managed" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "task_exec_secrets" {
  role = aws_iam_role.task_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "kms:Decrypt"]
      Resource = concat(values(var.app_secrets_arns), [var.kms_key_arn])
    }]
  })
}

resource "aws_iam_role" "task" {
  name = "creditcrew-${var.environment}-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "task_s3" {
  role = aws_iam_role.task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = ["arn:aws:s3:::${var.documents_bucket_name}", "arn:aws:s3:::${var.documents_bucket_name}/*"]
      },
      { Effect = "Allow", Action = ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey"], Resource = [var.kms_key_arn] },
    ]
  })
}

resource "aws_ecs_task_definition" "app" {
  family                   = "creditcrew-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.app_cpu
  memory                   = var.app_memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = "app"
    image     = "${aws_ecr_repository.app.repository_url}:${var.app_image_tag}"
    essential = true
    portMappings = [{ containerPort = var.app_container_port, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV",         value = "production" },
      { name = "DATA_SOURCE_MODE", value = "sandbox" },
      { name = "AWS_REGION",       value = data.aws_region.current.name },
      { name = "DOCUMENTS_BUCKET", value = var.documents_bucket_name },
    ]
    secrets = [
      { name = "DATABASE_URL",       valueFrom = var.app_secrets_arns["db_url"] },
      { name = "IDBI_GST_API_KEY",   valueFrom = var.app_secrets_arns["idbi_gst"] },
      { name = "IDBI_UPI_API_KEY",   valueFrom = var.app_secrets_arns["idbi_upi"] },
      { name = "IDBI_AA_API_KEY",    valueFrom = var.app_secrets_arns["idbi_aa"] },
      { name = "IDBI_EPFO_API_KEY",  valueFrom = var.app_secrets_arns["idbi_epfo"] },
      { name = "IDBI_ELEC_API_KEY",  valueFrom = var.app_secrets_arns["idbi_elec"] },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.log_group_name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "app"
      }
    }
    readonlyRootFilesystem = true
  }])
}

resource "aws_ecs_service" "app" {
  name            = "creditcrew-${var.environment}"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = var.app_container_port
  }

  deployment_circuit_breaker { enable = true, rollback = true }
  depends_on = [aws_lb_listener.http]
}

resource "aws_appautoscaling_target" "app" {
  max_capacity       = 10
  min_capacity       = var.app_desired_count
  resource_id        = "service/${aws_ecs_cluster.app.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "creditcrew-${var.environment}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.app.resource_id
  scalable_dimension = aws_appautoscaling_target.app.scalable_dimension
  service_namespace  = aws_appautoscaling_target.app.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification { predefined_metric_type = "ECSServiceAverageCPUUtilization" }
    target_value = 60
  }
}

output "app_security_group_id" { value = aws_security_group.app.id }
output "alb_dns_name" { value = aws_lb.app.dns_name }
output "alb_zone_id" { value = aws_lb.app.zone_id }
output "alb_arn_suffix" { value = aws_lb.app.arn_suffix }
output "cluster_name" { value = aws_ecs_cluster.app.name }
output "service_name" { value = aws_ecs_service.app.name }
output "ecr_repository_url" { value = aws_ecr_repository.app.repository_url }
