#!/bin/bash
set -e

source .env

echo "=== Deploying Storage ==="
forge script script/DeployStorage.s.sol \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify

echo ""
echo "=== Deploying ExpenseNFT ==="
forge script script/DeployExpenseNFT.s.sol \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify

echo ""
echo "=== Deployment complete ==="
