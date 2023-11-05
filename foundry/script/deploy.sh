#!/bin/bash

source ../../.env

forge create --rpc-url $RPC --chain $CHAINID \
    --constructor-args $DEPLOYER_ADDRESS $(cat ./v1Addresses.txt) \
    --private-key $DEPLOYER_PRIVATE_KEY \
	ChatChampion

#	--verify \
#    --gas-limit 1000000 \
#	--etherscan-api-key $ETHERSCAN_API_KEY \
