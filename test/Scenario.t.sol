// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Storage} from "../contract/storage.sol";

contract ScenarioTest is Test {
    Storage public store;

    address payer = address(0x100);
    address alice = address(0x101);
    address bob = address(0x102);
    address carol = address(0x103);

    function setUp() public {
        store = new Storage();
        vm.deal(payer, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    // ──────────────────────────────────────────────
    //  SCENARIO: Full expense lifecycle
    // ──────────────────────────────────────────────
    function test_FullExpenseLifecycle() public {
        // ---------- Step 1: Add expense ----------
        address[] memory participants = new address[](3);
        participants[0] = alice;
        participants[1] = bob;
        participants[2] = carol;

        string[] memory names = new string[](3);
        names[0] = "Alice";
        names[1] = "Bob";
        names[2] = "Carol";

        vm.startPrank(payer);
        store.addExpense(
            "Team Dinner", "Payer", payer, participants, names, "Pizza Place", 12 ether, Storage.Status.pending
        );
        vm.stopPrank();

        assertEq(store.getLength(), 1);

        // ---------- Step 2: Verify expense details ----------
        (
            string memory expname,
            string memory paidby,
            address payerAddr,
            string memory paddress,
            uint256 amt,
            uint256 shareamount,
            Storage.Status status,
            address[] memory parts,
            string[] memory partNames
        ) = store.getExpense(0);
        assertEq(expname, "Team Dinner");
        assertEq(paidby, "Payer");
        assertEq(payerAddr, payer);
        assertEq(amt, 12 ether);
        assertEq(shareamount, 3 ether); // 12 / (3 participants + 1 payer) = 3
        assertEq(uint8(status), 0); // pending
        assertEq(parts.length, 3);

        // ---------- Step 3: Alice marks herself as paid ----------
        vm.prank(payer);
        store.markParticipantPaid(0, alice);

        // Verify partial payment
        address[] memory debtors = store.getBadDebtors(0);
        assertEq(debtors.length, 2); // Bob and Carol still owe
        assertEq(debtors[0], bob);
        assertEq(debtors[1], carol);

        // ---------- Step 4: Bob requests payment from payer ----------
        vm.prank(bob);
        store.requestPaymentFromPayer(0);

        assertEq(store.getPaymentRequestCount(), 1);
        Storage.PaymentRequest memory req = store.getPaymentRequest(0);
        assertEq(req.from, bob);
        assertEq(req.to, payer);
        assertEq(req.amount, 3 ether);
        assertTrue(!req.isPaid);
        assertTrue(bytes(req.reason).length > 0);

        // ---------- Step 5: Payer pays Bob's request ----------
        vm.prank(payer);
        store.payRequest{value: 3 ether}(0);

        // Verify request is marked paid and Bob auto-marked in expense
        req = store.getPaymentRequest(0);
        assertTrue(req.isPaid);

        // Verify Bob no longer shows as bad debtor (payRequest now auto-updates hasPaid)
        address[] memory debtorsAfter = store.getBadDebtors(0);
        assertEq(debtorsAfter.length, 1);
        assertEq(debtorsAfter[0], carol);

        // ---------- Step 6: Mark Carol as bad debt ----------
        vm.prank(payer);
        store.updateStatus(0, Storage.Status.badDebt);

        (,,,,,, status,,) = store.getExpense(0);
        assertEq(uint8(status), 3); // badDebt

        // ---------- Step 8: Carol pays payer directly (not via request) ----------
        uint256 payerBalanceBefore = address(payer).balance;
        vm.prank(carol);
        payable(payer).transfer(3 ether);
        uint256 payerBalanceAfter = address(payer).balance;
        assertEq(payerBalanceAfter - payerBalanceBefore, 3 ether);

        // ---------- Step 9: Payer marks Carol as paid ----------
        vm.prank(payer);
        store.markParticipantPaid(0, carol);

        // Verify all bad debts are cleared
        address[] memory finalDebtors = store.getBadDebtors(0);
        assertEq(finalDebtors.length, 0);

        // Status stays badDebt (contract doesn't auto-transition from badDebt → paid)
        (,,,,,, status,,) = store.getExpense(0);
        assertEq(uint8(status), 3); // badDebt (contract only auto-marks paid when status is pending)
    }
}
