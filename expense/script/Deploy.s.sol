// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
// Fix: Use correct relative path
import "../contract/Storage.sol";

contract DeployStorage is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        Storage storageContract = new Storage();
        
        vm.stopBroadcast();
        
        console.log(" Storage contract deployed to:", address(storageContract));
    }
}