#!/bin/bash
set -e

# Ensure keyfile has correct permissions
chmod 400 /data/configdb/mongo-keyfile
chown mongodb:mongodb /data/configdb/mongo-keyfile

# Wait for MongoDB to start
sleep 15

# Connect and initiate replica set
mongosh -u unnimaya -p 1234 --authenticationDatabase admin <<EOF
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-minbar:27017", priority: 1 }
  ]
})

// Create additional user for application
use admin
db.createUser({
  user: "appuser",
  pwd: "apppassword",
  roles: [
    { role: "readWriteAnyDatabase", db: "minbar" }
  ]
})
EOF