output "cognito_user_pool_id" {
  description = "Cognito User Pool ID for application-dev.yml"
  value       = aws_cognito_user_pool.heritage.id
}

output "cognito_client_id" {
  description = "Cognito App Client ID for application-dev.yml"
  value       = aws_cognito_user_pool_client.heritage_client.id
}

output "s3_bucket_name" {
  description = "S3 bucket name for application-dev.yml"
  value       = aws_s3_bucket.heritage_resources.id
}

output "lambda_thumbnail_function_name" {
  description = "Lambda thumbnail generator function name"
  value       = aws_lambda_function.thumbnail_generator.function_name
}

output "lambda_thumbnail_function_arn" {
  description = "Lambda thumbnail generator function ARN"
  value       = aws_lambda_function.thumbnail_generator.arn
}

output "ec2_public_ip" {
  description = "Elastic IP of the backend EC2 instance"
  value       = aws_eip.backend.public_ip
}

output "ec2_ssh_command" {
  description = "SSH command to connect to the backend"
  value       = "ssh -i your-key.pem ubuntu@${aws_eip.backend.public_ip}"
}

output "backend_api_url" {
  description = "Backend API URL"
  value       = "http://${aws_eip.backend.public_ip}:8080"
}
