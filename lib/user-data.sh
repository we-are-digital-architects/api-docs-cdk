#!/bin/bash
mkdir /home/ec2-user/app
aws s3 sync s3://api-docs-app-data/ /home/ec2-user/app/
yum update -y
yum install -y git
amazon-linux-extras install docker -y
service docker start
usermod -a -G docker ec2-user
chkconfig docker on
curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
yum install -y make
BINARY=yq_linux_amd64
yum install wget -y
wget $(wget -qO- https://api.github.com/repos/mikefarah/yq/releases/latest 2>/dev/null | grep browser_download_url | grep $BINARY\"\$ | awk '{print $NF}' | tr -d '"') -O /usr/bin/yq
chmod +x /usr/bin/yq
chmod +x -R /home/ec2-user/app/{.,}*
sed -i -e s/0.0.0.0/"$(curl -s ifconfig.me)"/g /home/ec2-user/app/.env
cd /home/ec2-user/app/ && make init
docker-compose up --build
# wget -O /home/ec2-user/app/archive.zip _REPO_.zip
