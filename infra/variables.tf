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

variable "ssh_public_key" {
  description = "SSH public key for EC2 access"
  type        = string
}

variable "ec2_instance_type" {
  description = "EC2 instance type for backend"
  type        = string
  default     = "t3.small"
}

variable "db_password" {
  description = "MySQL root password"
  type        = string
  sensitive   = true
}
