# ------------------------------------------------------------------------------
# EC2 Instance for Backend (Spring Boot + MySQL)
# ------------------------------------------------------------------------------

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_key_pair" "heritage" {
  key_name   = "heritage-backend-${var.environment}"
  public_key = var.ssh_public_key
}

resource "aws_security_group" "backend" {
  name        = "heritage-backend-${var.environment}"
  description = "Security group for Heritage Platform backend"

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH access"
  }

  # Backend API
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Spring Boot API"
  }

  # Outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "heritage-backend-${var.environment}"
    Environment = var.environment
    Project     = "heritage-platform"
  }
}

resource "aws_instance" "backend" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.ec2_instance_type
  key_name               = aws_key_pair.heritage.key_name
  vpc_security_group_ids = [aws_security_group.backend.id]
  iam_instance_profile   = aws_iam_instance_profile.backend.name

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    db_password        = var.db_password
    cognito_user_pool_id = aws_cognito_user_pool.heritage.id
    cognito_client_id    = aws_cognito_user_pool_client.heritage_client.id
    s3_bucket            = aws_s3_bucket.heritage_resources.id
    aws_region           = var.aws_region
    internal_api_key     = var.lambda_api_key
    frontend_origin      = var.frontend_origin
    spring_profile       = var.environment == "dev" ? "local" : "prod"
  }))

  tags = {
    Name        = "heritage-backend-${var.environment}"
    Environment = var.environment
    Project     = "heritage-platform"
  }
}

# Elastic IP so the address survives reboots
resource "aws_eip" "backend" {
  instance = aws_instance.backend.id

  tags = {
    Name        = "heritage-backend-${var.environment}"
    Environment = var.environment
    Project     = "heritage-platform"
  }
}

# IAM Role for EC2 to access S3
resource "aws_iam_role" "ec2_backend" {
  name = "heritage-ec2-backend-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = {
    Environment = var.environment
    Project     = "heritage-platform"
  }
}

resource "aws_iam_role_policy" "ec2_s3_access" {
  name = "heritage-ec2-s3-access"
  role = aws_iam_role.ec2_backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.heritage_resources.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.heritage_resources.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "ec2_cognito_access" {
  name = "heritage-ec2-cognito-access"
  role = aws_iam_role.ec2_backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminDeleteUser"
        ]
        Resource = aws_cognito_user_pool.heritage.arn
      }
    ]
  })
}

resource "aws_iam_instance_profile" "backend" {
  name = "heritage-backend-${var.environment}"
  role = aws_iam_role.ec2_backend.name
}
