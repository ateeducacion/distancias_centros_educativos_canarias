.DEFAULT_GOAL := help
PYTHON ?= python3
UV ?= uv
NPM ?= npm
COMPOSER ?= composer

.PHONY: help bootstrap install lint format format-check test test-python test-php test-js test-shell test-conformance coverage validate-config download-centers validate-centers download-osm prepare-osrm validate-snapping build-matrix build-data verify-artifacts query api-serve demo-serve docs-serve docs-build site-build site-preview docker-build docker-test ci release-check clean distclean
help:
	@awk 'BEGIN{FS=":.*## "} /^[a-zA-Z0-9_-]+:.*## /{printf "%-22s %s\n",$$1,$$2}' $(MAKEFILE_LIST)
bootstrap: ## Prepare local dependencies
	./scripts/bootstrap.sh
install: bootstrap ## Alias for bootstrap
lint: format-check validate-config ## Run available static checks
	$(UV) run ruff check .
	$(UV) run mypy
	cd packages/javascript && $(NPM) run lint
	cd packages/php && $(COMPOSER) run lint
format: ## Format Python and JavaScript
	$(UV) run ruff format .
	cd packages/javascript && npx prettier --write .
format-check: ## Check formatting
	$(UV) run ruff format --check .
	cd packages/javascript && npx prettier --check .
test: test-python test-js test-php ## Run all language tests
test-python: ## Run Python tests
	$(UV) run pytest
test-js: ## Run JavaScript tests
	cd packages/javascript && $(NPM) test
test-php: ## Run PHP tests
	cd packages/php && $(COMPOSER) test
test-shell: ## Lint POSIX shell scripts
	shellcheck scripts/*.sh bin/route-matrix
	shfmt -d scripts/*.sh bin/route-matrix
test-conformance: ## Query the same fixture in Python, PHP and JavaScript
	./tests/conformance/run.sh
coverage: ## Generate Python coverage
	$(UV) run pytest --cov --cov-report=term-missing
validate-config: ## Validate JSON syntax
	$(PYTHON) -m json.tool config/sources.json >/dev/null
	$(PYTHON) -m json.tool config/routing.json >/dev/null
	$(PYTHON) -m json.tool config/transport-nodes.json >/dev/null
download-centers: ## Resolve and download official center CSV
	bin/route-matrix download-centers
validate-centers: ## Validate downloaded center CSV
	bin/route-matrix validate-centers
download-osm: ## Download configured OSM extract
	bin/route-matrix download-osm
prepare-osrm: ## Prepare OSRM MLD graph
	docker compose --profile generation run --rm generator bin/route-matrix prepare-osrm
validate-snapping: ## Audit center coordinate snapping
	docker compose --profile generation run --rm generator bin/route-matrix validate-snapping
build-matrix build-data: ## Build production data artifacts
	docker compose --profile generation run --rm generator bin/route-matrix build
verify-artifacts: ## Verify distribution checksums
	./scripts/verify-artifacts.sh
query: ## Query fixture; set ORIGIN and DESTINATION
	bin/route-matrix query $(ORIGIN) $(DESTINATION)
api-serve: ## Serve PHP API
	php -S 127.0.0.1:8080 -t api/public
demo-serve: site-preview ## Serve the full static site (landing + docs) locally
docs-serve: ## Serve Zensical documentation (docs only, live reload)
	zensical serve
docs-build: ## Build Zensical documentation
	zensical build --clean
site-build: docs-build ## Assemble the Pages artifact (landing + docs) into public/
	WWW_DIR=www SITE_DIR=site DATA_DIR="$(DATA_DIR)" OUT_DIR=public sh scripts/assemble-site.sh
site-preview: ## Build and serve the full site locally with sample data
	rm -rf .preview-data && mkdir -p .preview-data
	cp data/samples/sample.dat .preview-data/canarias-distances.dat
	gzip -9 -c data/samples/sample.dat > .preview-data/canarias-distances.dat.gz
	cp data/samples/sample-centers.json .preview-data/centers.min.json
	cp data/samples/sample-manifest.json .preview-data/manifest.json
	$(MAKE) site-build DATA_DIR=.preview-data
	@echo 'Sirviendo http://localhost:8000/ (Ctrl+C para parar)'
	cd public && $(PYTHON) -m http.server 8000
docker-build: ## Build container images
	docker compose build
docker-test: ## Run tests in containers
	docker compose --profile generation run --rm generator make test-python
ci: lint test test-shell test-conformance docs-build ## Run local CI suite
release-check: ci docker-build ## Validate a local release candidate
clean: ## Remove inexpensive generated files, preserving downloads
	rm -rf site public .preview-data .coverage coverage
distclean: clean ## Remove caches and dependencies (expensive downloads too)
	@echo 'WARNING: removing caches and downloaded sources'
	rm -rf .cache .venv packages/javascript/node_modules packages/php/vendor
