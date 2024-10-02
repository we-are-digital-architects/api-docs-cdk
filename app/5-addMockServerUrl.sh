#! /bin/sh

# this script will run first in the swaggerui container
# it prepends server url matching HOST variable
# number 5 in the name defines when this script execute (5,10,15...)

# source .env file
. .env

# install yq
apk add yq

# get all OAS files
OAS_PATH=/usr/share/nginx/html/oas/
OAS_DOCUMENTS=$(find $OAS_PATH -type f -name \*.yaml)

# loop ovr every OAS file
for OAS in ${OAS_DOCUMENTS}; do
  INFO_TITLE=$(cat "$OAS" | yq .info.title)
  # if server url is not existing in the file
  if ! yq e '.servers' "$OAS" | grep -q "http://${HOST}:8080/${INFO_TITLE}"; then
    # prepend it to the servers list
    yq e '.servers |= [{"url": "http://'"${HOST}":8080/"${INFO_TITLE}"'"}] + (. // [])' "$OAS" --inplace
  fi
done
