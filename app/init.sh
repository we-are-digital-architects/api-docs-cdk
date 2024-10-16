#! /bin/sh

# This script processes all YAML files in the OAS directory and updates the
# docker-compose and Caddyfile configuration based on the OAS files.

# Find all YAML files in the ./app/oas directory
OAS_DOCUMENTS=$(find ./app/oas -type f -name "*.yaml")

# Initialize OAS_CONFIG, which will be used by SwaggerUI to identify all OAS documents
OAS_CONFIG=''

# Loop through each OAS document found
for OAS in ${OAS_DOCUMENTS}; do
  # Extract the OAS title from the 'info.title' field
  INFO_TITLE=$(yq e .info.title "$OAS")

  # Extract the file name from the OAS path
  FILE_NAME=${OAS##*/}

  # Append the OAS document to the SwaggerUI configuration
  OAS_CONFIG+="{url:'oas/$FILE_NAME', name:'$INFO_TITLE'},"

  # Check if the service is already listed in the 'depends_on' array for the proxy in docker-compose
  if ! yq e '.services.proxy.depends_on[]' docker-compose.yml | grep -q "$INFO_TITLE"; then
    # If not present, add the mock service to docker-compose.yml
    yq e '.services += {"'"${INFO_TITLE}"'": {"image": "stoplight/prism:4", "container_name": "'"$INFO_TITLE"'", "volumes": ["'"${OAS}"':/usr/src/prism/packages/cli/'"${FILE_NAME}"'"], "command": "mock -p 4010 -d --host 0.0.0.0 '"$FILE_NAME"'"}}' docker-compose.yml --inplace

    # Append the service to the 'depends_on' array for the proxy
    yq e '.services.proxy.depends_on += ["'"$INFO_TITLE"'"]' docker-compose.yml --inplace

    echo "[init add]: Added ${FILE_NAME} service to docker-compose"

    # Create a reverse proxy route in Caddyfile
    ROUTE="/$INFO_TITLE/*"
    STRIP_PREFIX="/$INFO_TITLE"
    REVERSE_PROXY="$INFO_TITLE:4010"

    # Append the route to the Caddyfile for reverse proxy
    printf "\nroute %s {\nuri strip_prefix %s\nreverse_proxy %s\n}" "$ROUTE" "$STRIP_PREFIX" "$REVERSE_PROXY" >>Caddyfile

    echo "[init add]: Added ${FILE_NAME} route to Caddyfile"
  fi
done

# Write the configuration for SwaggerUI to the .config file
echo "URLS=\"[${OAS_CONFIG}]\"" >./.config
