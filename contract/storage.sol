// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Storage {
    // ========== ENUMS ==========
    enum Status {
        pending,   // 0
        paid,      // 1
        rejected,  // 2
        badDebt    // 3
    }

    // ========== STRUCTS ==========
    struct Expense {
        string expname;
        string paidby;
        string person1;
        string person2;
        string paddress;
        uint256 amt;
        uint256 shareamount;
        Status status;
    }

    struct PaymentRequest {
        address from;
        address to;
        uint256 amount;
        string reason;
        bool isPaid;
        uint256 timestamp;
    }

    // ========== STATE VARIABLES ==========
    Expense[] public expenses;
    uint256 public expenseId;
    
    PaymentRequest[] public paymentRequests;
    mapping(address => uint256[]) public pendingRequests;

    // ========== EVENTS ==========
    event ExpenseAdded(uint256 indexed id, string expname, uint256 amt);
    event StatusUpdated(uint256 indexed id, Status newStatus);
    event PaymentRequested(uint256 indexed requestId, address indexed from, address indexed to, uint256 amount);
    event PaymentCompleted(uint256 indexed requestId, address indexed from, address indexed to, uint256 amount);

    // ========== EXPENSE FUNCTIONS ==========
    function addExpense(
        string memory _expname,
        string memory _paidby,
        string memory _person1,
        string memory _person2,
        string memory _paddress,
        uint256 _amt,
        Status _status
    ) public {
        uint256 shareAmount = _amt / 3;
        
        expenses.push(Expense({
            expname: _expname,
            paidby: _paidby,
            person1: _person1,
            person2: _person2,
            paddress: _paddress,
            amt: _amt,
            shareamount: shareAmount,
            status: _status
        }));
        expenseId++;
        emit ExpenseAdded(expenseId, _expname, _amt);
    }

    function getExpense(uint256 _id) public view returns (Expense memory) {
        require(_id < expenses.length, "Expense not found");
        return expenses[_id];
    }

    function getLength() public view returns (uint256) {
        return expenses.length;
    }

    function getStatus() public view returns (string memory) {
        require(expenses.length > 0, "No expenses found");
        Status currentStatus = expenses[expenses.length - 1].status;
        if (currentStatus == Status.pending) return "your expense is pending";
        else if (currentStatus == Status.paid) return "your expense is paid";
        else if (currentStatus == Status.rejected) return "your expense is rejected";
        else if (currentStatus == Status.badDebt) return "your expense is bad debt";
        return "Unknown status";
    }

    function getShareAmount() public view returns (uint256) {
        require(expenses.length > 0, "No expenses found");
        return expenses[expenses.length - 1].shareamount;
    }

    function updateStatus(Status _newStatus) public {
        require(expenses.length > 0, "No expenses found");
        expenses[expenses.length - 1].status = _newStatus;
        emit StatusUpdated(expenses.length - 1, _newStatus);
    }

    function updateexpense(
        string memory _expname,
        string memory _paidby,
        string memory _person1,
        string memory _person2,
        string memory _paddress,
        uint256 _amt,
        Status _status
    ) public {
        uint256 shareAmount = _amt / 3;
        expenses.push(Expense({
            expname: _expname,
            paidby: _paidby,
            person1: _person1,
            person2: _person2,
            paddress: _paddress,
            amt: _amt,
            shareamount: shareAmount,
            status: _status
        }));
    }

    function resetexp() public {
        delete expenses;
        expenseId = 0;
    }

    // ========== PAYMENT REQUEST FUNCTIONS ==========
    function requestPayment(address to, uint256 amount, string memory reason) public returns (uint256) {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount must be > 0");
        require(to != msg.sender, "Cannot request from yourself");

        paymentRequests.push(PaymentRequest({
            from: msg.sender,
            to: to,
            amount: amount,
            reason: reason,
            isPaid: false,
            timestamp: block.timestamp
        }));
        
        uint256 requestId = paymentRequests.length - 1;
        pendingRequests[to].push(requestId);
        
        emit PaymentRequested(requestId, msg.sender, to, amount);
        return requestId;
    }

    function payRequest(uint256 requestId) public payable {
        require(requestId < paymentRequests.length, "Request does not exist");
        PaymentRequest storage request = paymentRequests[requestId];
        require(!request.isPaid, "Already paid");
        require(request.to == msg.sender, "Not the debtor");
        require(msg.value >= request.amount, "Insufficient payment");

        request.isPaid = true;
        (bool sent, ) = payable(request.from).call{value: request.amount}("");
        require(sent, "Failed to send ETH");

        uint256[] storage pending = pendingRequests[msg.sender];
        for (uint256 i = 0; i < pending.length; i++) {
            if (pending[i] == requestId) {
                pending[i] = pending[pending.length - 1];
                pending.pop();
                break;
            }
        }
        emit PaymentCompleted(requestId, request.from, request.to, request.amount);
    }

    function getPendingRequests(address debtor) public view returns (PaymentRequest[] memory) {
        uint256[] storage requestIds = pendingRequests[debtor];
        PaymentRequest[] memory result = new PaymentRequest[](requestIds.length);
        for (uint256 i = 0; i < requestIds.length; i++) {
            result[i] = paymentRequests[requestIds[i]];
        }
        return result;
    }

    function getAllPaymentRequests() public view returns (PaymentRequest[] memory) {
        return paymentRequests;
    }

    function getPaymentRequest(uint256 requestId) public view returns (PaymentRequest memory) {
        require(requestId < paymentRequests.length, "Request does not exist");
        return paymentRequests[requestId];
    }

    function getPaymentRequestCount() public view returns (uint256) {
        return paymentRequests.length;
    }
}