# Variables
OUT=$(pwd)

# Include the .env file for environment variables
include .env

# Run Amazon Linux 2 container with Docker
local-amazonlinux:
	@docker run --rm -it \
		-v "$(PWD):/opt/workspace" \
		-p 4010:4010 \
		amazonlinux:2

# Start the local development environment with Docker Compose
local-dev:
	@docker compose up --build --remove-orphans

# Deploy CloudFormation stack to AWS
deploy-cloudformation:
	@aws cloudformation deploy \
		--template-file cf_ec2.yaml \
		--stack-name api-docs \
		--capabilities CAPABILITY_NAMED_IAM

# Deploy code and configuration files to EC2 instance
ec2-deploy-code:
	@scp -i api-docs.pem -r \
		app Caddyfile docker-compose.yml .env 5-addMockServerUrl.sh \
		ec2-user@${HOST}:/home/ec2-user/app

# Initialize the environment by running the init script
init:
	@./init.sh

# Clean up configuration files
clean:
	@: > .config  # Clear the .config file
	@echo 'http://{$$HOST}' > Caddyfile  # Reset Caddyfile with a basic route
	@yq eval 'del(.services[] | select(.image == "stoplight/prism:4"))' -i ./docker-compose.yml  # Remove mock services
	@yq eval 'del(.services.proxy.depends_on)' -i ./docker-compose.yml  # Remove proxy dependencies

# Watch EC2 instance logs (Cloud-init output)
watch-ec2-logs:
	@watch -n 0.2 -t tail -n 40 /var/log/cloud-init-output.log
