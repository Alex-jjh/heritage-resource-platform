terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ------------------------------------------------------------------------------
# Cognito User Pool
# ------------------------------------------------------------------------------
resource "aws_cognito_user_pool" "heritage" {
  name = "heritage-platform-${var.environment}"

  # Email as primary sign-in attribute
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  # Custom attribute for platform role
  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 32
    }
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = {
    Environment = var.environment
    Project     = "heritage-platform"
  }
}

# ------------------------------------------------------------------------------
# Cognito User Pool App Client
# ------------------------------------------------------------------------------
resource "aws_cognito_user_pool_client" "heritage_client" {
  name         = "heritage-app-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.heritage.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  # Token validity
  access_token_validity  = 1  # 1 hour
  refresh_token_validity = 30 # 30 days

  token_validity_units {
    access_token  = "hours"
    refresh_token = "days"
  }

  # No client secret for public API-based auth
  generate_secret = false

  prevent_user_existence_errors = "ENABLED"
}

# ------------------------------------------------------------------------------
# S3 Bucket for heritage resources
# ------------------------------------------------------------------------------
resource "aws_s3_bucket" "heritage_resources" {
  bucket = "heritage-resources-${var.environment}"

  tags = {
    Environment = var.environment
    Project     = "heritage-platform"
  }
}

# Block all public access — files served via pre-signed URLs only
resource "aws_s3_bucket_public_access_block" "heritage_resources" {
  bucket = aws_s3_bucket.heritage_resources.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS configuration allowing frontend uploads via pre-signed URLs
resource "aws_s3_bucket_cors_configuration" "heritage_resources" {
  bucket = aws_s3_bucket.heritage_resources.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "GET"]
    allowed_origins = [var.frontend_origin]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# Lifecycle rule: clean up orphaned uploads after 30 days
resource "aws_s3_bucket_lifecycle_configuration" "heritage_resources" {
  bucket = aws_s3_bucket.heritage_resources.id

  rule {
    id     = "cleanup-orphaned-uploads"
    status = "Enabled"

    filter {
      prefix = "uploads/"
    }

    expiration {
      days = 30
    }
  }
}

# ------------------------------------------------------------------------------
# S3 Event Notification for Lambda trigger
# ------------------------------------------------------------------------------
resource "aws_s3_bucket_notification" "heritage_uploads" {
  bucket = aws_s3_bucket.heritage_resources.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.thumbnail_generator.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
  }

  depends_on = [aws_lambda_permission.allow_s3_invoke]
}

# ------------------------------------------------------------------------------
# IAM Role for Lambda execution
# ------------------------------------------------------------------------------
resource "aws_iam_role" "lambda_thumbnail_role" {
  name = "heritage-thumbnail-lambda-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "heritage-platform"
  }
}

# CloudWatch Logs policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_thumbnail_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# S3 read/write policy for the heritage bucket
resource "aws_iam_role_policy" "lambda_s3_access" {
  name = "heritage-thumbnail-s3-access"
  role = aws_iam_role.lambda_thumbnail_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.heritage_resources.arn}/uploads/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.heritage_resources.arn}/thumbnails/*"
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# Lambda Function — Thumbnail Generator
# ------------------------------------------------------------------------------
data "archive_file" "thumbnail_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/thumbnail-generator"
  output_path = "${path.module}/.build/thumbnail-generator.zip"
}

resource "aws_lambda_function" "thumbnail_generator" {
  function_name    = "heritage-thumbnail-generator-${var.environment}"
  role             = aws_iam_role.lambda_thumbnail_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 512
  filename         = data.archive_file.thumbnail_lambda_zip.output_path
  source_code_hash = data.archive_file.thumbnail_lambda_zip.output_base64sha256

  environment {
    variables = {
      THUMBNAIL_PREFIX = "thumbnails/"
      BACKEND_API_URL  = var.backend_api_url
      API_KEY          = var.lambda_api_key
    }
  }

  tags = {
    Environment = var.environment
    Project     = "heritage-platform"
  }
}

# Allow S3 to invoke the Lambda function
resource "aws_lambda_permission" "allow_s3_invoke" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.thumbnail_generator.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.heritage_resources.arn
}
