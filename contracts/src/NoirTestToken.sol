// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract NoirTestToken {
    string public constant name = "Noir Test Token";
    string public constant symbol = "NTEST";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address recipient, uint256 amount) external {
        require(recipient != address(0), "NoirTestToken: zero recipient");
        totalSupply += amount;
        balanceOf[recipient] += amount;
        emit Transfer(address(0), recipient, amount);
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[sender][msg.sender];
        require(currentAllowance >= amount, "NoirTestToken: allowance");
        allowance[sender][msg.sender] = currentAllowance - amount;
        emit Approval(sender, msg.sender, allowance[sender][msg.sender]);
        _transfer(sender, recipient, amount);
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) private {
        require(recipient != address(0), "NoirTestToken: zero recipient");
        require(balanceOf[sender] >= amount, "NoirTestToken: balance");
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }
}
