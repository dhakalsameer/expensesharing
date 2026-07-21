// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/ExpenseNft.sol";

contract DeployExpenseNFT is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ExpenseNFT nft = new ExpenseNFT();

        vm.stopBroadcast();
        console.log("ExpenseNFT deployed to:", address(nft));
    }
}
