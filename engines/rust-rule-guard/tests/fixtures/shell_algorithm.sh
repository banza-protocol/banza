#!/usr/bin/env bash
# Shell that implements crypto inline — must be blocked.
set -euo pipefail
openssl dgst -sha256 -sign key.pem -out sig.bin "$1"
