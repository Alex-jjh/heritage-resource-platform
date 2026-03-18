# ------------------------------------------------------------------------------
# CloudFront Distribution — HTTPS termination for backend API
# Provides https://xxx.cloudfront.net → http://EC2:8080
# ------------------------------------------------------------------------------

# AWS managed policy IDs (avoid needing List* permissions to look up by name)
# Managed-CachingDisabled
# Managed-AllViewer

resource "aws_cloudfront_distribution" "backend_api" {
  enabled         = true
  comment         = "HTTPS proxy for Heritage Platform backend API"
  price_class     = "PriceClass_100" # US, Canada, Europe only — cheapest

  origin {
    domain_name = aws_eip.backend.public_ip
    origin_id   = "ec2-backend"

    custom_origin_config {
      http_port              = 8080
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "ec2-backend"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]

    # AWS managed policy IDs — hardcoded to avoid needing List* permissions
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3" # AllViewer

    compress = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "heritage-backend-api-${var.environment}"
    Environment = var.environment
    Project     = "heritage-platform"
  }
}
