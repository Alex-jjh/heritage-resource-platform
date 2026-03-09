variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "frontend_origin" {
  description = "Frontend origin URL for S3 CORS configuration"
  type        = string
  default     = "http://localhost:3000"
}

variable "backend_api_url" {
  description = "Backend API base URL for Lambda thumbnail callback"
  type        = string
  default     = "http://localhost:8080"
}

variable "lambda_api_key" {
  description = "API key used by Lambda to authenticate with the internal backend endpoint"
  type        = string
  sensitive   = true
  default     = "change-me-in-production"
}
