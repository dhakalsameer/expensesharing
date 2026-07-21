// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Storage} from "../contract/storage.sol";

contract StorageTest is Test {
    Storage public store;

    address payer = address(0x100);
    address alice = address(0x1);
    address bob = address(0x2);
    address carol = address(0x3);

    function setUp() public {
        store = new Storage();
        vm.deal(payer, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    // ─── Helpers ───────────────────────────────────────────────

    function _addExpense(uint256 amt, uint8 count) internal returns (uint256) {
        address[] memory participants = new address[](count);
        string[] memory names = new string[](count);
        for (uint256 i; i < count; i++) {
            if (i == 0) {
                participants[i] = alice;
                names[i] = "Alice";
            } else if (i == 1) {
                participants[i] = bob;
                names[i] = "Bob";
            } else {
                participants[i] = carol;
                names[i] = "Carol";
            }
        }
        store.addExpense("Dinner", "Payer", payer, participants, names, "Place", amt, Storage.Status.pending);
        return store.getLength() - 1;
    }

    function _addDefaultExpense() internal returns (uint256) {
        return _addExpense(4 ether, 3);
    }

    // ─── Add Expense ───────────────────────────────────────────

    function test_AddExpense() public {
        uint256 id = _addDefaultExpense();
        assertEq(store.getLength(), 1);

        (
            string memory n,
            string memory pb,
            address pa,
            string memory addr,
            uint256 amt,
            uint256 share,
            Storage.Status st,
            address[] memory parts,
            string[] memory pn
        ) = store.getExpense(id);
        assertEq(n, "Dinner");
        assertEq(pb, "Payer");
        assertEq(pa, payer);
        assertEq(amt, 4 ether);
        assertEq(share, 1 ether);
        assertEq(uint8(st), 0);
        assertEq(parts.length, 3);
        assertEq(parts[0], alice);
        assertEq(pn[0], "Alice");
    }

    function test_RevertWhen_AddExpenseNoParticipants() public {
        address[] memory p;
        string[] memory n;
        vm.expectRevert("Need at least one participant");
        store.addExpense("X", "P", payer, p, n, "Addr", 1 ether, Storage.Status.pending);
    }

    function test_RevertWhen_AddExpenseArraysMismatch() public {
        address[] memory p = new address[](2);
        p[0] = alice;
        p[1] = bob;
        string[] memory n = new string[](1);
        n[0] = "Alice";
        vm.expectRevert("Arrays length mismatch");
        store.addExpense("X", "P", payer, p, n, "Addr", 1 ether, Storage.Status.pending);
    }

    function test_RevertWhen_AddExpenseZeroPayer() public {
        address[] memory p = new address[](1);
        string[] memory n = new string[](1);
        vm.expectRevert("Invalid payer address");
        store.addExpense("X", "P", address(0), p, n, "Addr", 1 ether, Storage.Status.pending);
    }

    function test_RevertWhen_AddExpenseZeroParticipant() public {
        address[] memory p = new address[](1);
        p[0] = address(0);
        string[] memory n = new string[](1);
        n[0] = "Zero";
        vm.expectRevert("Invalid participant address");
        store.addExpense("X", "P", payer, p, n, "Addr", 1 ether, Storage.Status.pending);
    }

    // ─── GetExpense ────────────────────────────────────────────

    function test_RevertWhen_GetExpenseOutOfBounds() public {
        vm.expectRevert("Expense not found");
        store.getExpense(0);
    }

    // ─── GetStatus / GetShareAmount / UpdateStatus ─────────────

    function test_AllStatusMessages() public {
        _addDefaultExpense();

        assertEq(store.getStatus(0), "your expense is pending");

        store.updateStatus(0, Storage.Status.paid);
        assertEq(store.getStatus(0), "your expense is paid");

        store.updateStatus(0, Storage.Status.rejected);
        assertEq(store.getStatus(0), "your expense is rejected");

        store.updateStatus(0, Storage.Status.badDebt);
        assertEq(store.getStatus(0), "your expense is bad debt");
    }

    function test_GetShareAmount() public {
        _addExpense(6 ether, 2); // 3 people total → 2 ether each
        assertEq(store.getShareAmount(0), 2 ether);
    }

    function test_UpdateStatusEmitsEvent() public {
        _addDefaultExpense();
        vm.expectEmit(true, true, true, true);
        emit Storage.StatusUpdated(0, Storage.Status.paid);
        store.updateStatus(0, Storage.Status.paid);
    }

    function test_RevertWhen_UpdateStatusOutOfBounds() public {
        vm.expectRevert("Expense not found");
        store.updateStatus(99, Storage.Status.paid);
    }

    // ─── MarkParticipantPaid ───────────────────────────────────

    function test_MarkParticipantPaid() public {
        _addDefaultExpense();

        vm.prank(payer);
        store.markParticipantPaid(0, alice);

        address[] memory debtors = store.getBadDebtors(0);
        assertEq(debtors.length, 2);
        assertEq(debtors[0], bob);
    }

    function test_MarkAllParticipants_AutoTransitionToPaid() public {
        _addDefaultExpense();

        vm.prank(payer);
        store.markParticipantPaid(0, alice);
        vm.prank(payer);
        store.markParticipantPaid(0, bob);
        vm.prank(payer);
        store.markParticipantPaid(0, carol);

        (,,,,,, Storage.Status st,,) = store.getExpense(0);
        assertEq(uint8(st), 1); // paid
    }

    function test_MarkParticipantPaid_NoTransitionFromBadDebt() public {
        _addDefaultExpense();
        store.updateStatus(0, Storage.Status.badDebt);

        vm.prank(payer);
        store.markParticipantPaid(0, alice);
        vm.prank(payer);
        store.markParticipantPaid(0, bob);
        vm.prank(payer);
        store.markParticipantPaid(0, carol);

        // status stays badDebt (3), contract only auto-transitions from pending
        (,,,,,, Storage.Status st,,) = store.getExpense(0);
        assertEq(uint8(st), 3);
    }

    function test_RevertWhen_MarkNonParticipant() public {
        _addDefaultExpense();
        vm.expectRevert("Participant not in this expense");
        vm.prank(payer);
        store.markParticipantPaid(0, address(0x999));
    }

    function test_RevertWhen_MarkAlreadyPaid() public {
        _addDefaultExpense();
        vm.prank(payer);
        store.markParticipantPaid(0, alice);

        vm.expectRevert("Already paid");
        vm.prank(payer);
        store.markParticipantPaid(0, alice);
    }

    function test_RevertWhen_MarkOnPaidExpense() public {
        _addDefaultExpense();
        store.updateStatus(0, Storage.Status.paid);

        vm.expectRevert("Expense not pending");
        vm.prank(payer);
        store.markParticipantPaid(0, alice);
    }

    // ─── GetBadDebtors ─────────────────────────────────────────

    function test_GetBadDebtors_None() public {
        _addDefaultExpense();
        vm.prank(payer);
        store.markParticipantPaid(0, alice);
        vm.prank(payer);
        store.markParticipantPaid(0, bob);
        vm.prank(payer);
        store.markParticipantPaid(0, carol);

        assertEq(store.getBadDebtors(0).length, 0);
    }

    function test_GetBadDebtors_All() public {
        _addDefaultExpense();
        address[] memory debtors = store.getBadDebtors(0);
        assertEq(debtors.length, 3);
    }

    function test_RevertWhen_GetBadDebtorsOutOfBounds() public {
        vm.expectRevert("Expense not found");
        store.getBadDebtors(99);
    }

    // ─── RequestPaymentFromPayer ───────────────────────────────

    function test_RequestPaymentFromPayer() public {
        _addDefaultExpense();

        vm.prank(alice);
        store.requestPaymentFromPayer(0);

        assertEq(store.getPaymentRequestCount(), 1);
        Storage.PaymentRequest memory req = store.getPaymentRequest(0);
        assertEq(req.from, alice);
        assertEq(req.to, payer);
        assertEq(req.amount, 1 ether);
        assertFalse(req.isPaid);
        assertEq(req.expenseId, 0);
    }

    function test_RequestPayment_MultipleParticipants() public {
        _addDefaultExpense();

        vm.prank(alice);
        store.requestPaymentFromPayer(0);
        vm.prank(bob);
        store.requestPaymentFromPayer(0);

        assertEq(store.getPaymentRequestCount(), 2);
    }

    function test_RevertWhen_RequestPaymentNotParticipant() public {
        _addDefaultExpense();
        vm.expectRevert("Not a participant");
        vm.prank(address(0x999));
        store.requestPaymentFromPayer(0);
    }

    function test_RevertWhen_RequestPaymentAlreadyPaid() public {
        _addDefaultExpense();
        vm.prank(payer);
        store.markParticipantPaid(0, alice);

        vm.expectRevert("Already paid");
        vm.prank(alice);
        store.requestPaymentFromPayer(0);
    }

    function test_RevertWhen_RequestPaymentExpenseAlreadyPaid() public {
        _addDefaultExpense();
        store.updateStatus(0, Storage.Status.paid);

        vm.expectRevert("Expense already paid");
        vm.prank(alice);
        store.requestPaymentFromPayer(0);
    }

    // ─── Generic RequestPayment ────────────────────────────────

    function test_GenericRequestPayment() public {
        vm.prank(alice);
        uint256 id = store.requestPayment(bob, 0.5 ether, "Lunch");

        Storage.PaymentRequest memory req = store.getPaymentRequest(id);
        assertEq(req.from, alice);
        assertEq(req.to, bob);
        assertEq(req.amount, 0.5 ether);
        assertEq(req.expenseId, type(uint256).max);
        assertEq(store.getPaymentRequestCount(), 1);

        // also shows in pending requests for bob
        Storage.PaymentRequest[] memory pending = store.getPendingRequests(bob);
        assertEq(pending.length, 1);
        assertEq(pending[0].from, alice);
    }

    function test_RevertWhen_GenericRequestZeroAddress() public {
        vm.expectRevert("Invalid address");
        store.requestPayment(address(0), 1 ether, "test");
    }

    function test_RevertWhen_GenericRequestZeroAmount() public {
        vm.expectRevert("Amount must be > 0");
        store.requestPayment(alice, 0, "test");
    }

    function test_RevertWhen_GenericRequestSelf() public {
        vm.expectRevert("Cannot request from yourself");
        vm.prank(alice);
        store.requestPayment(alice, 1 ether, "test");
    }

    // ─── PayRequest ────────────────────────────────────────────

    function test_PayRequest() public {
        _addDefaultExpense();

        vm.prank(alice);
        store.requestPaymentFromPayer(0);

        vm.prank(payer);
        store.payRequest{value: 1 ether}(0);

        Storage.PaymentRequest memory req = store.getPaymentRequest(0);
        assertTrue(req.isPaid);

        // Alice auto-marked as paid in the expense
        address[] memory debtors = store.getBadDebtors(0);
        assertEq(debtors.length, 2);
        assertFalse(debtors[0] == alice && debtors[1] == alice);
    }

    function test_PayRequest_RefundOverpayment() public {
        vm.prank(alice);
        store.requestPayment(bob, 1 ether, "test");

        uint256 balanceBefore = address(bob).balance;
        vm.prank(bob);
        store.payRequest{value: 1.5 ether}(0);
        uint256 balanceAfter = address(bob).balance;

        // bob sent 1.5, got 0.5 back → net -1 ETH
        assertEq(balanceBefore - balanceAfter, 1 ether);
    }

    function test_PayRequest_AutoTransitionsToPaid() public {
        _addDefaultExpense();

        vm.prank(alice);
        store.requestPaymentFromPayer(0);
        vm.prank(bob);
        store.requestPaymentFromPayer(0);
        vm.prank(carol);
        store.requestPaymentFromPayer(0);

        vm.prank(payer);
        store.payRequest{value: 1 ether}(0);
        vm.prank(payer);
        store.payRequest{value: 1 ether}(1);
        vm.prank(payer);
        store.payRequest{value: 1 ether}(2);

        // all paid → status should be paid
        (,,,,,, Storage.Status st,,) = store.getExpense(0);
        assertEq(uint8(st), 1);
    }

    function test_RevertWhen_PayRequestInsufficient() public {
        vm.prank(alice);
        store.requestPayment(bob, 1 ether, "test");

        vm.expectRevert("Insufficient payment");
        vm.prank(bob);
        store.payRequest{value: 0.5 ether}(0);
    }

    function test_RevertWhen_PayRequestAlreadyPaid() public {
        vm.prank(alice);
        store.requestPayment(bob, 1 ether, "test");

        vm.prank(bob);
        store.payRequest{value: 1 ether}(0);

        vm.expectRevert("Already paid");
        vm.prank(bob);
        store.payRequest{value: 1 ether}(0);
    }

    function test_RevertWhen_PayRequestWrongCaller() public {
        vm.prank(alice);
        store.requestPayment(bob, 1 ether, "test");

        vm.expectRevert("Not the debtor");
        vm.prank(alice);
        store.payRequest{value: 1 ether}(0);
    }

    function test_RevertWhen_PayRequestNonexistent() public {
        vm.expectRevert("Request does not exist");
        store.payRequest{value: 1 ether}(0);
    }

    // ─── Pending Requests ──────────────────────────────────────

    function test_GetPendingRequests() public {
        vm.prank(alice);
        store.requestPayment(bob, 1 ether, "Req1");
        vm.prank(alice);
        store.requestPayment(bob, 2 ether, "Req2");

        Storage.PaymentRequest[] memory pending = store.getPendingRequests(bob);
        assertEq(pending.length, 2);
        assertEq(pending[0].amount, 1 ether);
        assertEq(pending[1].amount, 2 ether);
    }

    function test_PendingClearedAfterPayment() public {
        vm.prank(alice);
        store.requestPayment(bob, 1 ether, "test");

        Storage.PaymentRequest[] memory before = store.getPendingRequests(bob);
        assertEq(before.length, 1);

        vm.prank(bob);
        store.payRequest{value: 1 ether}(0);

        Storage.PaymentRequest[] memory after_ = store.getPendingRequests(bob);
        assertEq(after_.length, 0);
    }

    // ─── GetAllPaymentRequests ─────────────────────────────────

    function test_GetAllPaymentRequests() public {
        vm.prank(alice);
        store.requestPayment(bob, 0.5 ether, "Req1");
        vm.prank(alice);
        store.requestPayment(carol, 1 ether, "Req2");

        Storage.PaymentRequest[] memory all = store.getAllPaymentRequests();
        assertEq(all.length, 2);
    }

    // ─── ResetExp ──────────────────────────────────────────────

    function test_ResetExpenses() public {
        _addDefaultExpense();
        assertEq(store.getLength(), 1);
        assertEq(store.getPaymentRequestCount(), 0);

        store.resetexp();
        assertEq(store.getLength(), 0);
        vm.expectRevert("Expense not found");
        store.getExpense(0);
    }

    // ─── Participants ──────────────────────────────────────────

    function test_GetParticipants() public {
        _addDefaultExpense();
        (address[] memory addrs, string[] memory names) = store.getParticipants(0);
        assertEq(addrs.length, 3);
        assertEq(addrs[0], alice);
        assertEq(names[1], "Bob");
    }

    function test_RevertWhen_GetParticipantsOutOfBounds() public {
        vm.expectRevert("Expense not found");
        store.getParticipants(99);
    }

    // ─── Multiple Expenses ─────────────────────────────────────

    function test_MultipleExpenses() public {
        _addExpense(4 ether, 3); // id 0
        _addExpense(2 ether, 1); // id 1

        assertEq(store.getLength(), 2);
        assertEq(store.getShareAmount(0), 1 ether);
        assertEq(store.getShareAmount(1), 1 ether); // 2 / (1+1) = 1
    }

    // ─── Status transitions ────────────────────────────────────

    function test_StatusTransition_PendingToRejected() public {
        _addDefaultExpense();
        store.updateStatus(0, Storage.Status.rejected);
        (,,,,,, Storage.Status st1,,) = store.getExpense(0);
        assertEq(uint8(st1), 2);
    }

    function test_StatusTransition_PendingToBadDebt() public {
        _addDefaultExpense();
        store.updateStatus(0, Storage.Status.badDebt);
        (,,,,,, Storage.Status st2,,) = store.getExpense(0);
        assertEq(uint8(st2), 3);
    }
}
