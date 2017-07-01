.PHONY: build appcache deploy release

help:
	@echo "The list of commands for local development:\n"
	@echo "  build        Build the static files"
	@echo "  appcache     Generate the appcache manifest"
	@echo "  deploy       Send build to Firebase"
	@echo "  release      All of the above\n"

build:
	./bin/build.sh

appcache:
	./bin/appcache.sh

deploy:
	./bin/deploy.sh


release: build appcache deploy
