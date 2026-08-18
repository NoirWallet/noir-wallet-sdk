// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title NoirTestToken
/// @notice Freely mintable ERC-20 used to test wallet approval flows
///         (mint, approve, transferFrom) on testnets. The per-call mint cap
///         only bounds nuisance supply growth; the token has no value.
contract NoirTestToken {
    string public constant name = "Noir Test Token";
    string public constant symbol = "NTT";
    uint8 public constant decimals = 18;

    uint256 public constant MAX_MINT_PER_CALL = 1_000_000 ether;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        require(to != address(0), "NTT: mint to zero address");
        require(amount > 0 && amount <= MAX_MINT_PER_CALL, "NTT: invalid mint amount");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "NTT: insufficient allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "NTT: transfer to zero address");
        uint256 balance = balanceOf[from];
        require(balance >= amount, "NTT: insufficient balance");
        unchecked {
            balanceOf[from] = balance - amount;
        }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
