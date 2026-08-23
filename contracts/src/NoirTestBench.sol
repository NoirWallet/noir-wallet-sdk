// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract NoirTestBench {
    address public immutable owner;
    uint256 public value;
    uint256 public depositCount;

    event ValueChanged(address indexed caller, uint256 previousValue, uint256 nextValue);
    event DepositReceived(address indexed sender, uint256 amount, uint256 depositCount);

    constructor() {
        owner = msg.sender;
    }

    function setValue(uint256 nextValue) external {
        uint256 previousValue = value;
        value = nextValue;
        emit ValueChanged(msg.sender, previousValue, nextValue);
    }

    function increment() external {
        uint256 previousValue = value;
        value = previousValue + 1;
        emit ValueChanged(msg.sender, previousValue, value);
    }

    function deposit() external payable {
        require(msg.value > 0, "NoirTestBench: zero deposit");
        depositCount += 1;
        emit DepositReceived(msg.sender, msg.value, depositCount);
    }

    function withdraw(uint256 amount) external {
        require(msg.sender == owner, "NoirTestBench: owner only");
        require(amount <= address(this).balance, "NoirTestBench: balance");
        (bool sent, ) = payable(owner).call{value: amount}("");
        require(sent, "NoirTestBench: withdraw failed");
    }

    function alwaysRevert() external pure {
        revert("NoirTestBench: expected revert");
    }
}
