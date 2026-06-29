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
        address payerAddress;
        string paddress;
        uint256 amt;
        uint256 shareamount;
        Status status;
        address[] participants;
        string[] participantNames;
        mapping(address => bool) hasPaid;
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
    event ExpenseAdded(uint256 indexed id, string expname, uint256 amt, uint8 participantCount);
    event StatusUpdated(uint256 indexed id, Status newStatus);
    event PaymentRequested(uint256 indexed requestId, address indexed from, address indexed to, uint256 amount);
    event PaymentCompleted(uint256 indexed requestId, address indexed from, address indexed to, uint256 amount);
    event ParticipantPaid(uint256 indexed expenseId, address indexed participant, uint256 amount);

    // ========== EXPENSE FUNCTIONS ==========

    function addExpense(
        string memory _expname,
        string memory _paidby,
        address _payerAddress,
        address[] memory _participants,
        string[] memory _participantNames,
        string memory _paddress,
        uint256 _amt,
        Status _status
    ) public {
        require(_participants.length > 0, "Need at least one participant");
        require(_participants.length == _participantNames.length, "Arrays length mismatch");
        require(_payerAddress != address(0), "Invalid payer address");
        
        for (uint i = 0; i < _participants.length; i++) {
            require(_participants[i] != address(0), "Invalid participant address");
        }
        
        uint256 shareAmount = _amt / (_participants.length + 1);
        
        Expense storage newExpense = expenses.push();
        newExpense.expname = _expname;
        newExpense.paidby = _paidby;
        newExpense.payerAddress = _payerAddress;
        newExpense.paddress = _paddress;
        newExpense.amt = _amt;
        newExpense.shareamount = shareAmount;
        newExpense.status = _status;
        
        for (uint i = 0; i < _participants.length; i++) {
            newExpense.participants.push(_participants[i]);
            newExpense.participantNames.push(_participantNames[i]);
        }
        
        expenseId++;
        emit ExpenseAdded(expenseId, _expname, _amt, uint8(_participants.length));
    }

    function getExpense(uint256 _id) public view returns (
        string memory expname,
        string memory paidby,
        address payerAddress,
        string memory paddress,
        uint256 amt,
        uint256 shareamount,
        Status status,
        address[] memory participants,
        string[] memory participantNames
    ) {
        require(_id < expenses.length, "Expense not found");
        Expense storage exp = expenses[_id];
        return (
            exp.expname,
            exp.paidby,
            exp.payerAddress,
            exp.paddress,
            exp.amt,
            exp.shareamount,
            exp.status,
            exp.participants,
            exp.participantNames
        );
    }

    function getParticipants(uint256 _id) public view returns (address[] memory, string[] memory) {
        require(_id < expenses.length, "Expense not found");
        return (expenses[_id].participants, expenses[_id].participantNames);
    }

    function markParticipantPaid(uint256 _id, address _participant) public {
        require(_id < expenses.length, "Expense not found");
        Expense storage exp = expenses[_id];
        require(exp.status == Status.pending || exp.status == Status.badDebt, "Expense not pending");
        
        bool found = false;
        for (uint i = 0; i < exp.participants.length; i++) {
            if (exp.participants[i] == _participant) {
                found = true;
                break;
            }
        }
        require(found, "Participant not in this expense");
        require(!exp.hasPaid[_participant], "Already paid");
        
        exp.hasPaid[_participant] = true;
        emit ParticipantPaid(_id, _participant, exp.shareamount);
        
        bool allPaid = true;
        for (uint i = 0; i < exp.participants.length; i++) {
            if (!exp.hasPaid[exp.participants[i]]) {
                allPaid = false;
                break;
            }
        }
        
        if (allPaid && exp.status == Status.pending) {
            exp.status = Status.paid;
            emit StatusUpdated(_id, Status.paid);
        }
    }

    function getBadDebtors(uint256 _id) public view returns (address[] memory) {
        require(_id < expenses.length, "Expense not found");
        Expense storage exp = expenses[_id];
        uint count = 0;
        
        for (uint i = 0; i < exp.participants.length; i++) {
            if (!exp.hasPaid[exp.participants[i]]) {
                count++;
            }
        }
        
        address[] memory badDebtors = new address[](count);
        uint index = 0;
        for (uint i = 0; i < exp.participants.length; i++) {
            if (!exp.hasPaid[exp.participants[i]]) {
                badDebtors[index] = exp.participants[i];
                index++;
            }
        }
        return badDebtors;
    }

    function requestPaymentFromPayer(uint256 _expenseId) public {
        require(_expenseId < expenses.length, "Expense not found");
        Expense storage exp = expenses[_expenseId];
        
        bool isParticipant = false;
        for (uint i = 0; i < exp.participants.length; i++) {
            if (exp.participants[i] == msg.sender) {
                isParticipant = true;
                break;
            }
        }
        require(isParticipant, "Not a participant");
        require(!exp.hasPaid[msg.sender], "Already paid");
        require(exp.status != Status.paid, "Expense already paid");
        
        paymentRequests.push(PaymentRequest({
            from: msg.sender,
            to: exp.payerAddress,
            amount: exp.shareamount,
            reason: string(abi.encodePacked("Payment for: ", exp.expname)),
            isPaid: false,
            timestamp: block.timestamp
        }));
        
        uint256 requestId = paymentRequests.length - 1;
        pendingRequests[exp.payerAddress].push(requestId);
        emit PaymentRequested(requestId, msg.sender, exp.payerAddress, exp.shareamount);
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