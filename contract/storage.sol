// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Storage {
    // Enum for expense status
    enum Status {
        pending,
        paid,
        rejected
    }

    // Struct for expense
    struct Expense {
        string description;
        string payer;
        string payee;
        string participant;
        string place;
        uint256 amount;
        Status status;
    }

    Expense[] public expenses;
    uint256 public expenseId;

    // Events
    event ExpenseAdded(uint256 indexed id, string description, uint256 amount);
    event StatusUpdated(uint256 indexed id, Status newStatus);

    // Add expense function
    function addExpense(
        string memory _description,
        string memory _payer,
        string memory _payee,
        string memory _participant,
        string memory _place,
        uint256 _amount,
        Status _status
    ) public {
        Expense memory newExpense = Expense({
            description: _description,
            payer: _payer,
            payee: _payee,
            participant: _participant,
            place: _place,
            amount: _amount,
            status: _status
        });
        
        expenses.push(newExpense);
        expenseId++;
        
        emit ExpenseAdded(expenseId, _description, _amount);
    }

    // Update expense function
    function updateexpense(
        string memory _description,
        string memory _payer,
        string memory _payee,
        string memory _participant,
        string memory _place,
        uint256 _amount,
        Status _status
    ) public {
        expenses.push(Expense({
            description: _description,
            payer: _payer,
            payee: _payee,
            participant: _participant,
            place: _place,
            amount: _amount,
            status: _status
        }));
    }

    // Update status function
    function updateStatus(Status _newStatus) public {
        require(expenses.length > 0, "No expenses found");
        expenses[expenses.length - 1].status = _newStatus;
        emit StatusUpdated(expenses.length - 1, _newStatus);
    }

    // Get status message
    function getStatus() public view returns (string memory) {
        require(expenses.length > 0, "No expenses found");
        Status currentStatus = expenses[expenses.length - 1].status;
        
        if (currentStatus == Status.pending) {
            return "your expense is pending";
        } else if (currentStatus == Status.paid) {
            return "your expense is paid";
        } else if (currentStatus == Status.rejected) {
            return "your expense is rejected";
        }
        return "Unknown status";
    }

    // Get share amount
    function getShareAmount() public view returns (uint256) {
        require(expenses.length > 0, "No expenses found");
        return expenses[expenses.length - 1].amount;
    }

    // Get length of expenses
    function getLength() public view returns (uint256) {
        return expenses.length;
    }

    // Get expense by ID
    function getExpense(uint256 _id) public view returns (Expense memory) {
        require(_id < expenses.length, "Expense not found");
        return expenses[_id];
    }
}