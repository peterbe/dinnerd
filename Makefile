.PHONY: build appcache release

help:
	@echo "Dinnerd Make Tools"
	@echo "  build           Builds the final static files"
	@echo "  appcache        Builds the ./build/index.appcache file"
	@echo "  release         Makes a Firefbase deployment to prod."


build:
	@bin/build.sh

appcache:
	@bin/appcache.sh

release: build appcache
	@bin/deploy.sh
