// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract CINEX is ERC20, Ownable2Step {
    /// ERRORS

    error ZeroAddress();
    error ExceedsMaxTransferAmount();
    error AntibotCooldown();

    /// CONSTANTS

    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * (10 ** 18); // 1 billion tokens
    /// @notice Divisor for computation (1 bps (basis point) precision: 0.001%).
    uint256 public constant PCT_DIV = 100_000;
    uint256 public constant antiBotCooldown = 30; // seconds
    address public immutable liquidityWallet;
    address public immutable developmentWallet;
    uint256 public immutable swapFeeChangeTime;
    uint256 public immutable removeTransferRestrictionTime;

    /// STORAGE

    /// @notice List of addresses of dex pools for which commission is charged
    mapping(address => bool) public isPoolWithFee;
    /// @notice List of addresses of accounts for which commission is not charged
    mapping(address => bool) public isFeeFree;
    mapping(address => uint256) public accountToLastSwapTime;

    event FeeFreeListUpdated(address account, bool add);
    event PoolWithFeeListUpdated(address pool, bool add);

    constructor(
        address liquidityWallet_,
        address debtManagementWallet,
        address acquisitionWallet,
        address developmentWallet_,
        address communityWallet,
        address reserveWallet
    ) ERC20("CineXToken", "CineX") Ownable(_msgSender()) {
        if (liquidityWallet_ == address(0)) revert ZeroAddress();
        if (debtManagementWallet == address(0)) revert ZeroAddress();
        if (acquisitionWallet == address(0)) revert ZeroAddress();
        if (developmentWallet_ == address(0)) revert ZeroAddress();
        if (communityWallet == address(0)) revert ZeroAddress();
        if (reserveWallet == address(0)) revert ZeroAddress();

        _mint(address(this), INITIAL_SUPPLY);

        _transfer(address(this), liquidityWallet_, INITIAL_SUPPLY * 15 / 100);
        _transfer(address(this), debtManagementWallet, INITIAL_SUPPLY * 27 / 100);
        _transfer(address(this), acquisitionWallet, INITIAL_SUPPLY * 23 / 100);
        _transfer(address(this), developmentWallet_, INITIAL_SUPPLY * 10 / 100);
        _transfer(address(this), communityWallet, INITIAL_SUPPLY * 10 / 100);
        _transfer(address(this), reserveWallet, INITIAL_SUPPLY * 5 / 100);
        _burn(address(this), INITIAL_SUPPLY * 10 / 100);

        liquidityWallet = liquidityWallet_;
        developmentWallet = developmentWallet_;
        swapFeeChangeTime = block.timestamp + 60 * 60 * 24 * 365;
        removeTransferRestrictionTime = block.timestamp + 60 * 60 * 24 * 60;
    }

    function getFee() public view returns(uint256) {
        return block.timestamp >= swapFeeChangeTime ? 2000 : 6000;
    }

    /// @notice Configure the pay free list
    /// @param account Account to add/remove from the fee free list
    /// @param add Add=true, Remove=false
    function setFeeFreeList(address account, bool add) onlyOwner external {
        if (account == address(0)) revert ZeroAddress();
        isFeeFree[account] = add;

        emit FeeFreeListUpdated(account, add);
    }

    /// @notice Configure the pool with fee list
    /// @param pool Pool to add/remove from the pool with fee list
    /// @param add Add=true, Remove=false
    function setPoolWithFeeList(address pool, bool add) onlyOwner external {
        if (pool == address(0)) revert ZeroAddress();
        isPoolWithFee[pool] = add;

        emit PoolWithFeeListUpdated(pool, add);
    }

    ///------------------ ERC20 ------------------///

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (block.timestamp < removeTransferRestrictionTime && amount > INITIAL_SUPPLY / 100) revert ExceedsMaxTransferAmount();
        address spender = _msgSender();
        if (spender != from) {
            _spendAllowance(from, spender, amount);
        }
        uint256 feeAmount = 0;
        address swapAccount;
        if (isPoolWithFee[from]) {
            swapAccount = to;
        } else if (isPoolWithFee[to]) {
            swapAccount = from;
        }
        if (swapAccount != address(0)) {
            if (block.timestamp < accountToLastSwapTime[swapAccount] + antiBotCooldown) revert AntibotCooldown();
            accountToLastSwapTime[swapAccount] = block.timestamp;
            if (!isFeeFree[swapAccount]) {
                feeAmount = _getAndDistributeFee(from, amount);
            }
        }
        
        _transfer(from, to, amount - feeAmount);

        return true;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = _msgSender();
        return transferFrom(owner, to, amount);
    }

    function _getAndDistributeFee(address from, uint256 amount) internal returns(uint256 fee) {
        fee = amount * getFee() / PCT_DIV;
        uint256 liquidityAmount = block.timestamp >= swapFeeChangeTime ? fee / 2 : fee * 2 / 3;

        _transfer(from, liquidityWallet, liquidityAmount);
        _transfer(from, developmentWallet, fee - liquidityAmount);
    }
}
