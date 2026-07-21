// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Storage {
    enum Status {
        pending,
        paid,
        rejected,
        badDebt
    }

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
        uint256 expenseId;
    }

    Expense[] public expenses;
    PaymentRequest[] public paymentRequests;
    mapping(address => uint256[]) public pendingRequests;

    event ExpenseAdded(uint256 indexed id, string expname, uint256 amt, uint8 participantCount);
    event StatusUpdated(uint256 indexed id, Status newStatus);
    event ParticipantPaid(uint256 indexed expenseId, address indexed participant, uint256 amount);
    event PaymentRequested(uint256 indexed requestId, address indexed from, address indexed to, uint256 amount);
    event PaymentCompleted(uint256 indexed requestId, address indexed from, address indexed to, uint256 amount);
    event PaymentRefunded(uint256 indexed requestId, address indexed debtor, uint256 refundAmount);
    event ExpensesReset();

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
        uint256 pLen = _participants.length;
        require(pLen > 0, "Need at least one participant");
        require(pLen == _participantNames.length, "Arrays length mismatch");
        require(_payerAddress != address(0), "Invalid payer address");
        for (uint256 i; i < pLen; i++) {
            require(_participants[i] != address(0), "Invalid participant address");
        }

        uint256 shareAmount = _amt / (pLen + 1);

        Expense storage newExpense = expenses.push();
        newExpense.expname = _expname;
        newExpense.paidby = _paidby;
        newExpense.payerAddress = _payerAddress;
        newExpense.paddress = _paddress;
        newExpense.amt = _amt;
        newExpense.shareamount = shareAmount;
        newExpense.status = _status;

        for (uint256 i; i < pLen; i++) {
            newExpense.participants.push(_participants[i]);
            newExpense.participantNames.push(_participantNames[i]);
        }

        emit ExpenseAdded(expenses.length - 1, _expname, _amt, uint8(pLen));
    }

    function getExpense(uint256 _id)
        public
        view
        returns (
            string memory expname,
            string memory paidby,
            address payerAddress,
            string memory paddress,
            uint256 amt,
            uint256 shareamount,
            Status status,
            address[] memory participants,
            string[] memory participantNames
        )
    {
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

    function _isParticipant(Expense storage exp, address who) private view returns (bool) {
        uint256 len = exp.participants.length;
        for (uint256 i; i < len; i++) {
            if (exp.participants[i] == who) return true;
        }
        return false;
    }

    function markParticipantPaid(uint256 _id, address _participant) public {
        require(_id < expenses.length, "Expense not found");
        Expense storage exp = expenses[_id];
        require(exp.status == Status.pending || exp.status == Status.badDebt, "Expense not pending");
        require(_isParticipant(exp, _participant), "Participant not in this expense");
        require(!exp.hasPaid[_participant], "Already paid");

        exp.hasPaid[_participant] = true;
        emit ParticipantPaid(_id, _participant, exp.shareamount);

        if (exp.status == Status.pending && _allParticipantsPaid(exp)) {
            exp.status = Status.paid;
            emit StatusUpdated(_id, Status.paid);
        }
    }

    function _allParticipantsPaid(Expense storage exp) private view returns (bool) {
        uint256 len = exp.participants.length;
        for (uint256 i; i < len; i++) {
            if (!exp.hasPaid[exp.participants[i]]) return false;
        }
        return true;
    }

    function getBadDebtors(uint256 _id) public view returns (address[] memory) {
        require(_id < expenses.length, "Expense not found");
        Expense storage exp = expenses[_id];
        address[] memory badDebtors = new address[](exp.participants.length);
        uint256 count;
        uint256 len = exp.participants.length;
        for (uint256 i; i < len; i++) {
            if (!exp.hasPaid[exp.participants[i]]) {
                badDebtors[count++] = exp.participants[i];
            }
        }
        assembly { mstore(badDebtors, count) }
        return badDebtors;
    }

    function requestPaymentFromPayer(uint256 _expenseId) public {
        require(_expenseId < expenses.length, "Expense not found");
        Expense storage exp = expenses[_expenseId];

        require(_isParticipant(exp, msg.sender), "Not a participant");
        require(!exp.hasPaid[msg.sender], "Already paid");
        require(exp.status != Status.paid, "Expense already paid");

        paymentRequests.push(
            PaymentRequest({
                from: msg.sender,
                to: exp.payerAddress,
                amount: exp.shareamount,
                reason: string(abi.encodePacked("Payment for: ", exp.expname)),
                isPaid: false,
                timestamp: block.timestamp,
                expenseId: _expenseId
            })
        );

        uint256 requestId = paymentRequests.length - 1;
        pendingRequests[exp.payerAddress].push(requestId);
        emit PaymentRequested(requestId, msg.sender, exp.payerAddress, exp.shareamount);
    }

    function getLength() public view returns (uint256) {
        return expenses.length;
    }

    function getStatus(uint256 _id) public view returns (string memory) {
        require(_id < expenses.length, "Expense not found");
        Status s = expenses[_id].status;
        if (s == Status.pending) return "your expense is pending";
        if (s == Status.paid) return "your expense is paid";
        if (s == Status.rejected) return "your expense is rejected";
        if (s == Status.badDebt) return "your expense is bad debt";
        return "Unknown status";
    }

    function getShareAmount(uint256 _id) public view returns (uint256) {
        require(_id < expenses.length, "Expense not found");
        return expenses[_id].shareamount;
    }

    function updateStatus(uint256 _id, Status _newStatus) public {
        require(_id < expenses.length, "Expense not found");
        expenses[_id].status = _newStatus;
        emit StatusUpdated(_id, _newStatus);
    }

    function resetexp() public {
        delete expenses;
        emit ExpensesReset();
    }

    function requestPayment(address to, uint256 amount, string memory reason) public returns (uint256) {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount must be > 0");
        require(to != msg.sender, "Cannot request from yourself");

        paymentRequests.push(
            PaymentRequest({
                from: msg.sender,
                to: to,
                amount: amount,
                reason: reason,
                isPaid: false,
                timestamp: block.timestamp,
                expenseId: type(uint256).max
            })
        );

        uint256 requestId = paymentRequests.length - 1;
        pendingRequests[to].push(requestId);

        emit PaymentRequested(requestId, msg.sender, to, amount);
        return requestId;
    }

    function _linkPaymentToExpense(PaymentRequest storage request) private {
        Expense storage exp = expenses[request.expenseId];
        exp.hasPaid[request.from] = true;
        emit ParticipantPaid(request.expenseId, request.from, request.amount);
        if (exp.status == Status.pending && _allParticipantsPaid(exp)) {
            exp.status = Status.paid;
            emit StatusUpdated(request.expenseId, Status.paid);
        }
    }

    function _removePending(address debtor, uint256 requestId) private {
        uint256[] storage pending = pendingRequests[debtor];
        uint256 len = pending.length;
        for (uint256 i; i < len; i++) {
            if (pending[i] == requestId) {
                pending[i] = pending[len - 1];
                pending.pop();
                break;
            }
        }
    }

    function payRequest(uint256 requestId) public payable {
        require(requestId < paymentRequests.length, "Request does not exist");
        PaymentRequest storage request = paymentRequests[requestId];
        require(!request.isPaid, "Already paid");
        require(request.to == msg.sender, "Not the debtor");
        require(msg.value >= request.amount, "Insufficient payment");

        request.isPaid = true;

        (bool sent,) = request.from.call{value: request.amount}("");
        require(sent, "Failed to send ETH");

        if (msg.value > request.amount) {
            uint256 refund;
            unchecked {
                refund = msg.value - request.amount;
            }
            (bool refunded,) = msg.sender.call{value: refund}("");
            require(refunded, "Refund failed");
            emit PaymentRefunded(requestId, msg.sender, refund);
        }

        if (request.expenseId != type(uint256).max) {
            _linkPaymentToExpense(request);
        }

        _removePending(msg.sender, requestId);
        emit PaymentCompleted(requestId, request.from, request.to, request.amount);
    }

    function getPendingRequests(address debtor) public view returns (PaymentRequest[] memory) {
        uint256[] storage requestIds = pendingRequests[debtor];
        PaymentRequest[] memory result = new PaymentRequest[](requestIds.length);
        for (uint256 i; i < requestIds.length; i++) {
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
