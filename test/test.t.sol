// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Storage} from "../contract/storage.sol";

contract StorageTest is Test {
    Storage public storageContract;

    address alice = address(0x1);
    address bob = address(0x2);

    function setUp() public {
        storageContract = new Storage();
    }

    function test_AddExpense() public {
        address[] memory participants = new address[](2);
        participants[0] = alice;
        participants[1] = bob;

        string[] memory names = new string[](2);
        names[0] = "Alice";
        names[1] = "Bob";

        storageContract.addExpense(
            "Dinner",
            "John",
            address(this),
            participants,
            names,
            "Restaurant",
            1 ether,
            Storage.Status.pending
        );

        uint256 length = storageContract.getLength();
        assertEq(length, 1);
    }

    function _addExpense() internal {
        address[] memory participants = new address[](2);
        participants[0] = alice;
        participants[1] = bob;

        string[] memory names = new string[](2);
        names[0] = "Alice";
        names[1] = "Bob";

        storageContract.addExpense(
            "Dinner",
            "John",
            address(this),
            participants,
            names,
            "Place",
            1 ether,
            Storage.Status.pending
        );
    }

    function test_UpdateStatus() public {
        _addExpense();

        storageContract.updateStatus(0, Storage.Status.paid);

        string memory statusText = storageContract.getStatus(0);
        assertEq(statusText, "your expense is paid");
    }

    function test_GetStatusMessages() public {
        storageContract = new Storage();
        _addExpense();

        string memory status = storageContract.getStatus(0);
        assertEq(status, "your expense is pending", "Should be pending");

        storageContract.updateStatus(0, Storage.Status.paid);
        status = storageContract.getStatus(0);
        assertEq(status, "your expense is paid", "Should be paid");

        storageContract.updateStatus(0, Storage.Status.rejected);
        status = storageContract.getStatus(0);
        assertEq(status, "your expense is rejected", "Should be rejected");
    }

    function test_GetShareAmount() public {
        storageContract = new Storage();

        address[] memory participants = new address[](2);
        participants[0] = alice;
        participants[1] = bob;

        string[] memory names = new string[](2);
        names[0] = "Alice";
        names[1] = "Bob";

        storageContract.addExpense(
            "Dinner",
            "John",
            address(this),
            participants,
            names,
            "Place",
            3 ether,
            Storage.Status.pending
        );

        uint256 shareAmount = storageContract.getShareAmount(0);
        assertEq(shareAmount, 1 ether, "Share should be 1 ether (3 ether / 3 people)");
    }
}