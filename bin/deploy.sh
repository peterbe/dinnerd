#!/bin/bash
set -eo pipefail


#firebase deploy
firebase deploy --only database
firebase deploy --only hosting
