OUT=$(pwd)
include .env

local-amazonlinux:
	@docker run --rm -it -v "$(PWD):/opt/workspace" -p 4010:4010 amazonlinux:2
local-dev:
	@docker compose up --build --remove-orphans
deploy-cloudformation:
	@aws cloudformation deploy --template-file cf_ec2.yaml --stack-name api-docs --capabilities CAPABILITY_NAMED_IAM
ec2-deploy-code:
	@scp -i api-docs.pem -r app Caddyfile docker-compose.yml .env 5-addMockServerUrl.sh ec2-user@${HOST}:/home/ec2-user/app
init:
	@./init.sh
clean:
	@: > .config
	@echo 'http://{$$HOST}' > Caddyfile
	@yq eval 'del(.services[] | select(.image == "stoplight/prism:4"))' -i ./docker-compose.yml
	@yq eval 'del(.services.proxy.depends_on)' -i ./docker-compose.yml