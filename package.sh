#!/bin/bash

NAME=`jq -r '.name' dist/info.json`
VERSION=`jq -r '.version' dist/info.json`
MOD_NAME=${NAME}_${VERSION}

echo $MOD_NAME

cp -r dist $MOD_NAME
zip -r ${MOD_NAME}.zip $MOD_NAME
rm -r $MOD_NAME