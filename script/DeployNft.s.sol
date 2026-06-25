// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {ExpenseNFT} from "../src/ExpenseNft.sol";
import {console} from "forge-std/console.sol";

contract DeployNFT is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // REMOVE the argument - constructor takes 0 arguments
        ExpenseNFT nft = new ExpenseNFT();
        
        console.log("NFT Contract Address:", address(nft));
        
        vm.stopBroadcast();
    }
}