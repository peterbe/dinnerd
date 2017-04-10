#!/bin/bash
set -eo pipefail

export REACT_APP_DEV=false

export REACT_APP_FIREBASE_LOGGING=false

# export REACT_APP_FIREBASE_API_KEY="AIzaSyAG0xEHwP1TrGSe6Jw0JmVWkSyhEDp-svw"
# export REACT_APP_FIREBASE_AUTH_DOMAIN="dinnerd-dev.firebaseapp.com"
# export REACT_APP_FIREBASE_DATABASE_URL="https://dinnerd-dev.firebaseio.com"
# export REACT_APP_FIREBASE_STORAGE_BUCKET="dinnerd-dev.appspot.com"
# export REACT_APP_FIREBASE_MESSAGING_SENDER_ID="378499526474"

export REACT_APP_FIREBASE_API_KEY="AIzaSyAOs63MOvdKYRg7wJ6pTFxO6v96SrYHhhs"
export REACT_APP_FIREBASE_AUTH_DOMAIN="dinnerd-45b97.firebaseapp.com"
export REACT_APP_FIREBASE_DATABASE_URL="https://dinnerd-45b97.firebaseio.com"
export REACT_APP_FIREBASE_STORAGE_BUCKET="dinnerd-45b97.appspot.com"
export REACT_APP_FIREBASE_MESSAGING_SENDER_ID="501356720142"

yarn run build
