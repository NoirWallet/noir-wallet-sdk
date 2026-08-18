// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title NoirTestBench
/// @notice Minimal contract-call test bench for wallet dApp integration testing.
///         Exercises the four request shapes a wallet must review distinctly:
///         a state-changing call, a payable call, a value withdrawal, and a
///         guaranteed revert for error-path testing. Deployed on testnets only.
contract NoirTestBench {
    event ValueSet(address indexed sender, uint256 value);
    event Deposited(address indexed sender, uint256 amount);
    event Withdrawn(address indexed sender, uint256 amount);

    mapping(address => uint256) public storedValue;
    mapping(address => uint256) public deposits;

    function setValue(uint256 value) external {
        storedValue[msg.sender] = value;
        emit ValueSet(msg.sender, value);
    }

    function deposit() external payable {
        require(msg.value > 0, "NoirTestBench: deposit must send value");
        deposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw() external {
        uint256 amount = deposits[msg.sender];
        require(amount > 0, "NoirTestBench: nothing to withdraw");
        deposits[msg.sender] = 0;
        emit Withdrawn(msg.sender, amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "NoirTestBench: withdraw transfer failed");
    }

    function alwaysRevert() external pure {
        revert("NoirTestBench: intentional revert");
    }
}
