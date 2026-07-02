// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Storage} from "../contract/storage.sol";

contract StorageTest is Test {
    Storage public storageContract;

    function setUp() public {
        storageContract = new Storage();
    }

    function test_AddExpense() public {
        storageContract.addExpense(
            "Dinner",
            "John",
            "Alice",
            "Bob",
            "Restaurant",
            1 ether,
            Storage.Status.pending
        );
        
        uint256 length = storageContract.getLength();
        assertEq(length, 1);
    }

    function test_UpdateStatus() public {
        storageContract.updateexpense("Dinner", "John", "Alice", "Bob", "Place", 1 ether, Storage.Status.pending);
        
        storageContract.updateStatus(Storage.Status.paid);
        
        string memory statusText = storageContract.getStatus();
        assertEq(statusText, "your expense is paid");
    }

    function test_GetStatusMessages() public {
    // Clear previous expenses
    storageContract = new Storage();
    
    storageContract.updateexpense(
        "Dinner",
        "John",
        "Alice",
        "Bob",
        "Place",
        1 ether,
        Storage.Status.pending
    );
    
    string memory status = storageContract.getStatus();
    assertEq(status, "your expense is pending", "Should be pending"); // Fixed typo
    
    storageContract.updateStatus(Storage.Status.paid);
    status = storageContract.getStatus();
    assertEq(status, "your expense is paid", "Should be paid");
    
    storageContract.updateStatus(Storage.Status.rejected);
    status = storageContract.getStatus();
    assertEq(status, "your expense is rejected", "Should be rejected");
}

  function test_GetShareAmount() public {
    storageContract = new Storage();
    
    storageContract.updateexpense(
        "Dinner",
        "John",
        "Alice",
        "Bob",
        "Place",
        3 ether,
        Storage.Status.pending
    );
    
    uint256 shareAmount = storageContract.getShareAmount();
    assertEq(shareAmount, 3 ether, "Share should be 3 ether");
}
}