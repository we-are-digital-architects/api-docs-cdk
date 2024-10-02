#! /bin/sh

# Get all YAML files in oas directory
OAS_DOCUMENTS=$(find ./app/oas -type f -name \*.yaml)
# OAS_CONFIG for the SwaggerUi to be able to identify all OAS documents
OAS_CONFIG=''

# For every document
for OAS in ${OAS_DOCUMENTS}; do
  # oas title
  INFO_TITLE=$(cat "$OAS" | yq .info.title)
  # oas filename
  FILE_NAME=${OAS##*/}
  OAS_CONFIG+="{url:'oas/$FILE_NAME', name:'$INFO_TITLE'},"
  # Check if the service is already in the depends_on array for the proxy
  if ! yq e '.services.proxy.depends_on[]' docker-compose.yml | grep -q "$INFO_TITLE"; then
    # If not in the proxy depends_on array, add new mock service to docker-compose
    yq e '.services += {"'"${INFO_TITLE}"'": {"image":"stoplight/prism:4", "container_name": "'"$INFO_TITLE"'", "volumes": ["'"${OAS}"':/usr/src/prism/packages/cli/'"${FILE_NAME}"'"], "command": "mock -p 4010 -d --host 0.0.0.0 '"$FILE_NAME"'"}}' docker-compose.yml --inplace
    # Append dependency to .services.proxy.depends_on array
    yq e '.services.proxy.depends_on += ["'"$INFO_TITLE"'"]' docker-compose.yml --inplace
    echo "[init add]: ${FILE_NAME} service to docker-compose"
    # create route in Caddyfile (reverse_proxy)
    ROUTE="/$INFO_TITLE/*"
    STRIP_PREFIX="/$INFO_TITLE"
    REVERSE_PROXY="$INFO_TITLE:4010"
    printf "\nroute %s {\nuri strip_prefix %s\nreverse_proxy %s\n}" "$ROUTE" "$STRIP_PREFIX" "$REVERSE_PROXY" >>Caddyfile
    echo "[init add]: ${FILE_NAME} route to Caddyfile"
  fi
done

# Write configuration for SwaggerUI
echo "URLS=\"[${OAS_CONFIG}]\"" >./.config
