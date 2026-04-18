.PHONY: all push pull

all:
	@echo "Usage:"
	@echo "  make push ... push n8n_tools to synology"
	@echo "  make pull ... pull definition changes from synology"

push:
	ssh synology "cd /volume1/docker/n8n/local-files/n8n_tools/ && /var/packages/Git/target/bin/git pull"

pull:
	rm -f workflows/*.json
	scp -O synology:/volume1/docker/n8n/compose.yaml .
	scp -O synology:/volume1/docker/n8n/local-files/n8n_tools/workflows/\*.json workflows
