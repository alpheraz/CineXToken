// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract CINEX is Initializable, ERC20Upgradeable, Ownable2StepUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    /// ERRORS

    error ZeroAddress();
    error ExceedsMaxTransferAmount();
    error AntibotCooldown();
    error MintDisabled();

    /// CONSTANTS

    address public constant liquidityWallet = 0x2c0e66A4Fe460eA18d0887B7849fe0395c15f9D3;
    address public constant debtManagementWallet = 0x58C498f8eFbC7Cc1c7299FE7C94F0A0836BB1034;
    address public constant acquisitionWallet = 0x1331b032029e0a38BFE56d287B4befE64D04D0c6;
    address public constant developmentWallet = 0x8b8702A4266F80f270B45C8775F0335C042E48BF;
    address public constant communityWallet = 0x9aD19B438c19cb3d32C23a4b9010f432d3fC94e3;
    address public constant reserveWallet = 0x80657b98772CB75DDEceF1bB92647FDca3e1a0A1;
    address public constant marketingWallet = 0x94baA3A22778dfAbeC37Cc379E51B43A255d9c5E;
    address public constant teamWallet = 0xe813B4588c93B0DA5146314C179b67e6c7690894;

    /// @dev 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * (10 ** 18);
    /// @notice Divisor for computation (1 bps (basis point) precision: 0.001%).
    uint256 public constant PCT_DIV = 100_000;
    /// @dev in seconds
    uint256 public constant antiBotCooldown = 30;

    /// STORAGE

    /// @notice Timestamp at which the size of the commission and the ratio of the distribution of the collected commission will change
    uint256 public swapFeeChangeTime;
    /// @notice Timestamp at which the restriction on the maximum transfer amount and the antibot cooldown from swaps will be removed
    uint256 public removeTransferRestrictionTime;
    /// @dev If the value is true, then minting is not available
    bool public isMintDisabled;

    /// @notice List of addresses of dex pools for which commission is charged
    mapping(address => bool) public isPoolWithFee;
    /// @notice List of addresses of accounts for which commission is not charged
    mapping(address => bool) public isFeeFree;
    /// @dev Account address => account last swap timestamp
    mapping(address => uint256) private _accountToLastSwapTime;

    /// EVENTS

    /**
     * @notice Indicates that the FeeFreeList was updated
     * @param account Account added/removed to/from the list
     * @param add Add=true, Remove=false
     */
    event FeeFreeListUpdated(address account, bool add);
    /**
     * @notice Indicates that the PoolWithFeeList was updated
     * @param pool Pool added/removed to/from the list
     * @param add Add=true, Remove=false
     */
    event PoolWithFeeListUpdated(address pool, bool add);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() external initializer {
        __ERC20_init("CineXToken", "CineX");
        __Ownable_init(_msgSender());
        __Ownable2Step_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _mint(address(this), INITIAL_SUPPLY);
        isMintDisabled = true;

        _transfer(address(this), liquidityWallet, INITIAL_SUPPLY * 15 / 100);
        _transfer(address(this), debtManagementWallet, INITIAL_SUPPLY * 27 / 100);
        _transfer(address(this), acquisitionWallet, INITIAL_SUPPLY * 23 / 100);
        _transfer(address(this), developmentWallet, INITIAL_SUPPLY * 5 / 100);
        _transfer(address(this), communityWallet, INITIAL_SUPPLY * 5 / 100);
        _transfer(address(this), reserveWallet, INITIAL_SUPPLY * 5 / 100);
        _transfer(address(this), marketingWallet, INITIAL_SUPPLY * 5 / 100);
        _transfer(address(this), teamWallet, INITIAL_SUPPLY * 5 / 100);
        _burn(address(this), INITIAL_SUPPLY * 10 / 100);

        swapFeeChangeTime = block.timestamp + 60 * 60 * 24 * 365;
        removeTransferRestrictionTime = block.timestamp + 60 * 60 * 24 * 60;
    }

    /// @notice Return current swap fee in bps
    function getFee() public view returns(uint256) {
        return block.timestamp >= swapFeeChangeTime ? 2000 : 6000;
    }

    /**
     * @notice Configure the pay free list. Admin function
     * @param account Account to add/remove from the fee free list
     * @param add Add=true, Remove=false
     */
    function setFeeFreeList(address account, bool add) onlyOwner external {
        if (account == address(0)) revert ZeroAddress();
        isFeeFree[account] = add;

        emit FeeFreeListUpdated(account, add);
    }

    /**
     * @notice Configure the pool with fee list. Admin function
     * @param pool Pool to add/remove from the pool with fee list
     * @param add Add=true, Remove=false
     */
    function setPoolWithFeeList(address pool, bool add) onlyOwner external {
        if (pool == address(0)) revert ZeroAddress();
        isPoolWithFee[pool] = add;

        emit PoolWithFeeListUpdated(pool, add);
    }

    ///@notice The function blocks the possibility of transfer tokens. Admin function
    function pause() external onlyOwner {
        _pause();
    }

    ///@notice The function unblocks the possibility of transfer tokens. Admin function
    function unpause() external onlyOwner {
        _unpause();
    }

    ///------------------ ERC20 ------------------///

    /// @dev Override ERC20 transferFrom function
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
            if (block.timestamp < removeTransferRestrictionTime) {
                if (block.timestamp < _accountToLastSwapTime[swapAccount] + antiBotCooldown) revert AntibotCooldown();
                _accountToLastSwapTime[swapAccount] = block.timestamp;
            }
            if (!isFeeFree[swapAccount]) {
                feeAmount = _getAndDistributeFee(from, amount);
            }
        }
        
        _transfer(from, to, amount - feeAmount);

        return true;
    }

    /// @dev Override ERC20 transfer function
    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = _msgSender();
        return transferFrom(owner, to, amount);
    }

    /// @dev The function calculates, collects and distributes the commission between certain addresses
    function _getAndDistributeFee(address from, uint256 amount) internal returns(uint256 fee) {
        fee = amount * getFee() / PCT_DIV;
        uint256 liquidityAmount = block.timestamp >= swapFeeChangeTime ? fee / 2 : fee * 2 / 3;

        _transfer(from, liquidityWallet, liquidityAmount);
        _transfer(from, developmentWallet, fee - liquidityAmount);
    }

    /// @dev Override ERC20 _update function to block the possibility of blocking mint and transfers
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        if (from == address(0) && isMintDisabled) revert MintDisabled();
        super._update(from, to, value);
    }

    ///------------------ UUPS ------------------///
    /**
     * @dev Override the function as stated in the documentation for the UUPSUpgradeable contract
     *   to include access restriction to the upgrade mechanism.
    */
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
