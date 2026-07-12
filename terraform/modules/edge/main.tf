variable "environment" { type = string }
variable "alb_dns_name" { type = string }
variable "alb_zone_id" { type = string }
variable "public_domain" { type = string }
variable "acm_certificate_arn" { type = string }

# ---------------- WAFv2 (regional, attached to ALB) ----------------
resource "aws_wafv2_web_acl" "app" {
  name        = "creditcrew-${var.environment}"
  scope       = "CLOUDFRONT"
  description = "OWASP + rate-limit for CreditCrew ${var.environment}"
  default_action { allow {} }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config { cloudwatch_metrics_enabled = true, metric_name = "common", sampled_requests_enabled = true }
  }

  rule {
    name     = "KnownBadInputs"
    priority = 2
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config { cloudwatch_metrics_enabled = true, metric_name = "bad-inputs", sampled_requests_enabled = true }
  }

  rule {
    name     = "RateLimit"
    priority = 3
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    visibility_config { cloudwatch_metrics_enabled = true, metric_name = "rate-limit", sampled_requests_enabled = true }
  }

  visibility_config { cloudwatch_metrics_enabled = true, metric_name = "creditcrew-waf", sampled_requests_enabled = true }
}

# ---------------- CloudFront ----------------
locals {
  use_custom_cert = length(var.acm_certificate_arn) > 0 && length(var.public_domain) > 0
}

resource "aws_cloudfront_distribution" "app" {
  enabled             = true
  comment             = "CreditCrew ${var.environment}"
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  web_acl_id          = aws_wafv2_web_acl.app.arn
  price_class         = "PriceClass_100"
  aliases             = local.use_custom_cert ? [var.public_domain] : []

  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb-origin"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "alb-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    # AWS managed CachingDisabled / AllOriginHeaders for SSR app
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"
  }

  viewer_certificate {
    acm_certificate_arn            = local.use_custom_cert ? var.acm_certificate_arn : null
    cloudfront_default_certificate = local.use_custom_cert ? false : true
    ssl_support_method             = local.use_custom_cert ? "sni-only" : null
    minimum_protocol_version       = local.use_custom_cert ? "TLSv1.2_2021" : null
  }

  restrictions { geo_restriction { restriction_type = "whitelist", locations = ["IN"] } }
}

output "cloudfront_domain" { value = aws_cloudfront_distribution.app.domain_name }
