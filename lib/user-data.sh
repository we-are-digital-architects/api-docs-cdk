#!/bin/bash
yum update -y
amazon-linux-extras install docker -y
service docker start
usermod -a -G docker ec2-user
chkconfig docker on
yum install -y git
curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
yum install -y make
BINARY=yq_linux_amd64
yum install wget -y
wget $(wget -qO- https://api.github.com/repos/mikefarah/yq/releases/latest 2>/dev/null | grep browser_download_url | grep $BINARY\"\$ | awk '{print $NF}' | tr -d '"') -O /usr/bin/yq
chmod +x /usr/bin/yq
mkdir /home/ec2-user/app
chmod +x -R /home/ec2-user/app/
chown ec2-user /home/ec2-user/app/{.,}*
wget -O /home/ec2-user/app/archive.zip _REPO_.zip
