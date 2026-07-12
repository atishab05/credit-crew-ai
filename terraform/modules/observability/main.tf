variable "environment" { type = string }
variable "log_retention_days" { type = number }
variable "ecs_service_name" { type = string }
variable "ecs_cluster_name" { type = string }
variable "alb_arn_suffix" { type = string }

resource "aws_cloudwatch_log_group" "app" {
  name              = "/creditcrew/${var.environment}/app"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "creditcrew-${var.environment}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  dimensions          = { ClusterName = var.ecs_cluster_name, ServiceName = var.ecs_service_name }
  alarm_description   = "Fargate CPU sustained above 80%"
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "creditcrew-${var.environment}-alb-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 20
  dimensions          = { LoadBalancer = var.alb_arn_suffix }
  alarm_description   = "App returning 5xx to the ALB"
}

output "app_log_group_name" { value = aws_cloudwatch_log_group.app.name }
