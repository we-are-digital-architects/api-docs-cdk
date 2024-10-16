#! /bin/sh

# This script runs in the Swagger UI container and prepends the server URL
# to all OAS (OpenAPI Specification) files based on the HOST environment variable.
# The number 5 in the filename indicates the execution order (e.g., 5, 10, 15...).

# Source the environment variables from the .env file
. .env

# Install yq (YAML processor)
apk add --no-cache yq

# Define the path where the OAS files are stored
OAS_PATH="/usr/share/nginx/html/oas/"
# Find all .yaml files in the OAS path
OAS_DOCUMENTS=$(find $OAS_PATH -type f -name "*.yaml")

# Loop over every OAS file found
for OAS in ${OAS_DOCUMENTS}; do
  # Extract the title of the OAS document (from the 'info.title' field)
  INFO_TITLE=$(yq e .info.title "$OAS")

  # Check if the server URL is already present in the OAS file
  if ! yq e '.servers' "$OAS" | grep -q "http://${HOST}:8080/${INFO_TITLE}"; then
    # If not, prepend the server URL to the 'servers' list
    yq e '.servers |= [{"url": "http://'"${HOST}":8080/"${INFO_TITLE}"'"}] + (. // [])' \
      --inplace "$OAS"
  fi
done
