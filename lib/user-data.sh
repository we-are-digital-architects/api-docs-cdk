#!/bin/bash

# Set up application directory
APP_DIR="/home/ec2-user/app"
mkdir -p $APP_DIR

# Sync application data from S3 bucket
aws s3 sync s3://api-docs-app-data/ $APP_DIR/

# Update the system packages
yum update -y

# Install Git
yum install -y git

# Install and start Docker
amazon-linux-extras install docker -y
service docker start

# Add 'ec2-user' to the Docker group to avoid using 'sudo' for Docker commands
usermod -aG docker ec2-user

# Ensure Docker starts on boot
chkconfig docker on

# Install Docker Compose
DOCKER_COMPOSE_URL="https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)"
curl -L $DOCKER_COMPOSE_URL -o /usr/local/bin/docker-compose

# Make Docker Compose executable and create a symlink for easier access
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install Make utility
yum install -y make

# Install 'yq' (YAML processor) from latest release
YQ_BINARY="yq_linux_amd64"
yum install -y wget
YQ_DOWNLOAD_URL=$(wget -qO- https://api.github.com/repos/mikefarah/yq/releases/latest | grep browser_download_url | grep "$YQ_BINARY" | awk '{print $NF}' | tr -d '"')
wget $YQ_DOWNLOAD_URL -O /usr/bin/yq

# Make 'yq' executable
chmod +x /usr/bin/yq

# Grant executable permissions to all files in the app directory (including hidden ones)
chmod +x -R ${APP_DIR}/{.,}*

# Update .env file with the public IP of the EC2 instance (replace '0.0.0.0' with the public IP)
sed -i -e "s/0.0.0.0/$(curl -s ifconfig.me)/g" ${APP_DIR}/.env

# Navigate to the app directory and run 'make init' to initialize the app
cd $APP_DIR && make init

# Build and start Docker containers with Docker Compose
docker-compose up --build
