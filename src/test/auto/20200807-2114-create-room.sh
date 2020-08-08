#!/bin/sh

SERVER=localhost:8080

echo "Logging in as new user..."
ACCESSTOKEN="$(curl -s -X POST "http://$SERVER/api/player/new?name=Andy" | sed -En 's/^.*accessToken":"([^"]*)".*$/\1/p')"
echo "Access token $ACCESSTOKEN"

curl -s -X POST "http://$SERVER/api/selftest"

echo "Creating room..."
ROOMID="$(curl -s -X POST "http://$SERVER/api/room/new" -H "Authorization: Bearer $ACCESSTOKEN" | sed -En 's/^.*id":"([^"]*)".*$/\1/p')"
echo "Room id '$ROOMID'"

curl -s -X POST "http://$SERVER/api/selftest"

echo "Joining room..."
curl -s -X POST "http://$SERVER/api/room/join?id=$ROOMID" -H "Authorization: Bearer $ACCESSTOKEN"

curl -s -X POST "http://$SERVER/api/selftest"
