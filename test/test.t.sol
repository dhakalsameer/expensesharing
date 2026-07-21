// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Storage} from "../contract/storage.sol";

contract StorageTest is Test {
    Storage public storageContract;

    // Test addresses 
    address public raju = address(0x111);
    address public hari = address(0x222);
    address public shyam = address(0x333);
    address public ram = address(0x444);

    function setUp() public {
        storageContract = new Storage();
        
        // Fund addresses 
        vm.deal(raju, 10 ether);
        vm.deal(hari, 10 ether);
        vm.deal(shyam, 10 ether);
        vm.deal(ram, 10 ether);
    }

    // Test 1: Add a single expense where Raju pays for Hari
    function test_AddExpense() public {
        address[] memory participants = new address[](1);
        participants[0] = hari;
        
        string[] memory participantNames = new string[](1);
        participantNames[0] = "Hari";

        storageContract.addExpense(
            "Lunch at Restaurant",  
            "Raju",                 
            raju,                  
            participants,           
            participantNames,       
            "Mumbai",            
            2 ether,               
            Storage.Status.pending
        );
        
        uint256 length = storageContract.getLength();
        assertEq(length, 1, "Should have 1 expense");
        
        // Verify expense details
        (string memory expname, string memory paidby, , , uint256 amt, , , , ) = storageContract.getExpense(0);
        assertEq(expname, "Lunch at Restaurant", "Wrong expense name");
        assertEq(paidby, "Raju", "Wrong payer name");
        assertEq(amt, 2 ether, "Wrong amount");
    }

    // Test 2: Add expense with multiple participants (Raju, Hari, Shyam)
    function test_ExpenseWithMultipleParticipants() public {
        address[] memory participants = new address[](2);
        participants[0] = hari;
        participants[1] = shyam;
        
        string[] memory participantNames = new string[](2);
        participantNames[0] = "Hari";
        participantNames[1] = "Shyam";

        storageContract.addExpense(
            "Dinner Party",
            "Raju",
            raju,
            participants,
            participantNames,
            "Delhi",
            3 ether,
            Storage.Status.pending
        );
        
        uint256 length = storageContract.getLength();
        assertEq(length, 1, "Should have 1 expense");
        
        // Share amount should be 3 ether / 3 people = 1 ether each
        uint256 share = storageContract.getShareAmount();
        assertEq(share, 1 ether, "Each person should pay 1 ether");
    }

    // Test 3: Mark participant as paid (Hari pays his share to Raju)
    function test_MarkParticipantPaid() public {
        address[] memory participants = new address[](2);
        participants[0] = hari;
        participants[1] = shyam;
        
        string[] memory participantNames = new string[](2);
        participantNames[0] = "Hari";
        participantNames[1] = "Shyam";

        storageContract.addExpense(
            "Movie Tickets",
            "Raju",
            raju,
            participants,
            participantNames,
            "Pune",
            3 ether,
            Storage.Status.pending
        );
        
        // Hari pays his share (1 ether)
        vm.prank(raju); // Only payer can mark as paid in current implementation
        storageContract.markParticipantPaid(0, hari);
        
        // Check if Hari is marked as paid (we can check by getting bad debtors)
        address[] memory badDebtors = storageContract.getBadDebtors(0);
        assertEq(badDebtors.length, 1, "Should have 1 bad debtor (Shyam)");
        assertEq(badDebtors[0], shyam, "Shyam should be the bad debtor");
    }

    // Test 4: Request payment from participant (Shyam requests Raju for payment)
    function test_RequestPayment() public {
        address[] memory participants = new address[](1);
        participants[0] = shyam;
        
        string[] memory participantNames = new string[](1);
        participantNames[0] = "Shyam";

        storageContract.addExpense(
            "Tea",
            "Raju",
            raju,
            participants,
            participantNames,
            "Jaipur",
            1 ether,
            Storage.Status.pending
        );
        
        // Shyam requests payment from Raju
        vm.prank(shyam);
        storageContract.requestPayment(raju, 0.5 ether, "Need money for tea");
        
        // Check if payment request was created
        uint256 requestCount = storageContract.getPaymentRequestCount();
        assertEq(requestCount, 1, "Should have 1 payment request");
        
        // Verify request details
        Storage.PaymentRequest memory request = storageContract.getPaymentRequest(0);
        assertEq(request.from, shyam, "Request should be from Shyam");
        assertEq(request.to, raju, "Request should be to Raju");
        assertEq(request.amount, 0.5 ether, "Amount should be 0.5 ether");
        assertEq(request.isPaid, false, "Request should not be paid yet");
    }

    // Test 5: Update expense status (Pending to Paid)
    function test_UpdateStatus() public {
        address[] memory participants = new address[](1);
        participants[0] = hari;
        
        string[] memory participantNames = new string[](1);
        participantNames[0] = "Hari";

        storageContract.addExpense(
            "Coffee",
            "Raju",
            raju,
            participants,
            participantNames,
            "Bangalore",
            1 ether,
            Storage.Status.pending
        );
        
        // Update status to paid
        storageContract.updateStatus(Storage.Status.paid);
        
        string memory statusText = storageContract.getStatus();
        assertEq(statusText, "your expense is paid", "Status should be paid");
    }

    // Test 6: Get bad debtors (who hasn't paid yet)
    function test_GetBadDebtors() public {
        address[] memory participants = new address[](3);
        participants[0] = hari;
        participants[1] = shyam;
        participants[2] = ram;
        
        string[] memory participantNames = new string[](3);
        participantNames[0] = "Hari";
        participantNames[1] = "Shyam";
        participantNames[2] = "Ram";

        storageContract.addExpense(
            "Weekend Trip",
            "Raju",
            raju,
            participants,
            participantNames,
            "Goa",
            4 ether,
            Storage.Status.pending
        );
        
        // Mark only Hari as paid (1 ether each)
        vm.prank(raju);
        storageContract.markParticipantPaid(0, hari);
        
        // Get bad debtors (Shyam and Ram haven't paid)
        address[] memory badDebtors = storageContract.getBadDebtors(0);
        assertEq(badDebtors.length, 2, "Should have 2 bad debtors");
        
        // Check if both Shyam and Ram are in the list
        bool foundShyam = false;
        bool foundRam = false;
        for (uint i = 0; i < badDebtors.length; i++) {
            if (badDebtors[i] == shyam) foundShyam = true;
            if (badDebtors[i] == ram) foundRam = true;
        }
        assertTrue(foundShyam, "Shyam should be in bad debtors list");
        assertTrue(foundRam, "Ram should be in bad debtors list");
    }

    // Test 7: Complete flow - Add expense, pay, and mark as completed
    function test_CompleteFlow() public {
        // Step 1: Raju adds expense for dinner
        address[] memory participants = new address[](2);
        participants[0] = hari;
        participants[1] = shyam;
        
        string[] memory participantNames = new string[](2);
        participantNames[0] = "Hari";
        participantNames[1] = "Shyam";

        storageContract.addExpense(
            "Dinner at Hotel",
            "Raju",
            raju,
            participants,
            participantNames,
            "Chennai",
            3 ether,
            Storage.Status.pending
        );
        
        // Step 2: Hari pays his share (1 ether)
        vm.prank(raju);
        storageContract.markParticipantPaid(0, hari);
        
        // Step 3: Shyam pays his share (1 ether)
        vm.prank(raju);
        storageContract.markParticipantPaid(0, shyam);
        
        // Step 4: All participants have paid, so status should automatically become 'paid'
        string memory status = storageContract.getStatus();
        assertEq(status, "your expense is paid", "Expense should be marked as paid");
        
        // Step 5: Check no bad debtors remain
        address[] memory badDebtors = storageContract.getBadDebtors(0);
        assertEq(badDebtors.length, 0, "No bad debtors should remain");
    }
}