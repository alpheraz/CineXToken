

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CineXToken is ERC20, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using EnumerableSet for EnumerableSet.AddressSet;

    // Tokenomics
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * (10 ** 18); // 1 billion tokens

    // Wallets for allocation
    address public acquisitionWallet = 0x1331b032029e0a38BFE56d287B4befE64D04D0c6;
    address public debtManagementWallet = 0x58C498f8eFbC7Cc1c7299FE7C94F0A0836BB1034;
    address public communityRewardsWallet = 0x9aD19B438c19cb3d32C23a4b9010f432d3fC94e3;
    address public developmentWallet = 0x8b8702A4266F80f270B45C8775F0335C042E48BF;
    address public teamWallet = 0xe813B4588c93B0DA5146314C179b67e6c7690894;
    address public marketingWallet = 0x94baA3A22778dfAbeC37Cc379E51B43A255d9c5E;
    address public reserveWallet = 0x80657b98772CB75DDEceF1bB92647FDca3e1a0A1;
    address public freeFloatWallet = 0x2c0e66A4Fe460eA18d0887B7849fe0395c15f9D3;

    // Multi-signature configuration
    mapping(address => bool) public isAuthorizer;
    mapping(bytes32 => mapping(address => bool)) public approvals;
    mapping(bytes32 => uint256) public approvalCount;

    // Governance structure
    Counters.Counter private _proposalIds;

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votingDeadline;
        bool executed;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(uint256)) public hasVoted;

    // Security Features
    mapping(address => bool) public blacklist;
    bool public tradingEnabled = false;
    uint256 public maxTransactionAmount;
    mapping(address => uint256) public lastTransactionTimestamp;
    uint256 public antiBotCooldown = 30; // seconds

    // Events
    event TradingEnabled();
    event TokensBurned(address indexed burner, uint256 amount);
    event ProposalCreated(uint256 id, address proposer, string description, uint256 votingDeadline);
    event VoteCast(address voter, uint256 proposalId, bool support);
    event ProposalExecuted(uint256 id, bool success);

    constructor() ERC20("CineXToken", "CineX") {
        // Initial minting to wallets
        _mint(acquisitionWallet, INITIAL_SUPPLY * 23 / 100);
        _mint(debtManagementWallet, INITIAL_SUPPLY * 27 / 100);
        _mint(communityRewardsWallet, INITIAL_SUPPLY * 5 / 100);
        _mint(developmentWallet, INITIAL_SUPPLY * 5 / 100);
        _mint(teamWallet, INITIAL_SUPPLY * 5 / 100);
        _mint(marketingWallet, INITIAL_SUPPLY * 5 / 100);
        _mint(reserveWallet, INITIAL_SUPPLY * 5 / 100);
        _mint(freeFloatWallet, INITIAL_SUPPLY * 15 / 100);

        // Configure authorizers for multi-signature transactions
        isAuthorizer[developmentWallet] = true;
        isAuthorizer[teamWallet] = true;
        isAuthorizer[marketingWallet] = true;

        // Set initial maximum transaction amount (anti-whale measure)
        maxTransactionAmount = INITIAL_SUPPLY / 100; // 1% of total supply
    }

    // Enable trading
    function enableTrading() external onlyOwner {
        tradingEnabled = true;
        emit TradingEnabled();
    }

    // Override _transfer to implement anti-bot measures
    function _transfer(address sender, address recipient, uint256 amount) internal override {
        require(!blacklist[sender] && !blacklist[recipient], "Address is blacklisted");
        require(tradingEnabled || sender == owner(), "Trading is not enabled");

        if (sender != owner() && recipient != owner()) {
            require(amount <= maxTransactionAmount, "Exceeds max transaction amount");
            require(block.timestamp >= lastTransactionTimestamp[sender] + antiBotCooldown, "Cooldown active");
            lastTransactionTimestamp[sender] = block.timestamp;
        }

        super._transfer(sender, recipient, amount);
    }

    // Governance: Create a proposal
    function createProposal(string memory description) external returns (uint256) {
        require(balanceOf(msg.sender) >= 1000 * (10 ** 18), "Not enough tokens to propose");
        _proposalIds.increment();
        uint256 proposalId = _proposalIds.current();

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            description: description,
            votesFor: 0,
            votesAgainst: 0,
            votingDeadline: block.timestamp + 7 days,
            executed: false
        });

        emit ProposalCreated(proposalId, msg.sender, description, block.timestamp + 7 days);
        return proposalId;
    }

    // Governance: Vote on a proposal
    function vote(uint256 proposalId, bool support) external {
        require(block.timestamp < proposals[proposalId].votingDeadline, "Voting period has ended");
        require(!hasVoted[msg.sender][proposalId], "Already voted");
        require(balanceOf(msg.sender) > 0, "No tokens to vote");

        hasVoted[msg.sender][proposalId] = true;

        if (support) {
            proposals[proposalId].votesFor += balanceOf(msg.sender);
        } else {
            proposals[proposalId].votesAgainst += balanceOf(msg.sender);
        }

        emit VoteCast(msg.sender, proposalId, support);
    }

    // Governance: Execute a proposal
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.votingDeadline, "Voting period has not ended");
        require(!proposal.executed, "Proposal already executed");

        proposal.executed = true;
        bool success = proposal.votesFor > proposal.votesAgainst;

        emit ProposalExecuted(proposalId, success);
    }

    // Blacklist management
    function blacklistAddress(address account, bool status) external onlyOwner {
        blacklist[account] = status;
    }

    // Burn tokens
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }



    // Function to burn tokens and reduce total supply
    function burn(uint256 amount) external nonReentrant {
        require(amount > 0, "Burn amount must be greater than zero");
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    // Function to revoke minting permissions
    function revokeMinting() external onlyOwner {
        require(!mintingRevoked, "Minting already revoked");
        mintingRevoked = true;
        emit MintingRevoked();
    }

    // Overriding the _mint function to enforce mintingRevoked flag
    function _mint(address account, uint256 amount) internal override {
        require(!mintingRevoked, "Minting has been revoked");
        super._mint(account, amount);
    }

    // Function to update wallet addresses
    function updateWalletAddresses(
        address _acquisitionWallet,
        address _debtManagementWallet,
        address _communityRewardsWallet,
        address _developmentWallet,
        address _teamWallet,
        address _marketingWallet,
        address _reserveWallet,
        address _freeFloatWallet
    ) external onlyOwner {
        acquisitionWallet = _acquisitionWallet;
        debtManagementWallet = _debtManagementWallet;
        communityRewardsWallet = _communityRewardsWallet;
        developmentWallet = _developmentWallet;
        teamWallet = _teamWallet;
        marketingWallet = _marketingWallet;
        reserveWallet = _reserveWallet;
        freeFloatWallet = _freeFloatWallet;

        emit WalletAddressesUpdated();
    }

    // Function to exchange tokens for stock
    function exchangeTokensForStock(uint256 tokenAmount) external nonReentrant {
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");
        _burn(msg.sender, tokenAmount);

        uint256 stockAmount = tokenAmount / 1000; // Example conversion logic
        emit TokensExchanged(msg.sender, tokenAmount, stockAmount);
    }

    // Function to withdraw ETH from the contract
    function withdrawETH(uint256 amount) external onlyOwner nonReentrant {
        require(address(this).balance >= amount, "Insufficient balance");
        payable(owner()).transfer(amount);
        emit EthWithdrawn(owner(), amount);
    }

    // Fallback function to accept ETH
    receive() external payable {}

    fallback() external payable {}

    // Anti-bot feature: transfer cooldowns and limits
    mapping(address => uint256) private lastTransferTimestamp;
    uint256 public constant TRANSFER_COOLDOWN = 15; // 15 seconds

    modifier antiBot(address from, address to) {
        require(block.timestamp >= lastTransferTimestamp[from] + TRANSFER_COOLDOWN, "Transfer cooldown in effect");
        require(block.timestamp >= lastTransferTimestamp[to] + TRANSFER_COOLDOWN, "Transfer cooldown in effect");
        _;
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override antiBot(from, to) {
        super._beforeTokenTransfer(from, to, amount);
    }

    // Function to approve and execute multi-sig transactions
    function proposeAndApproveTransaction(address to, uint256 value) external onlyOwner {
        require(address(this).balance >= value, "Insufficient contract balance");
        (bool success, ) = to.call{value: value}("");
        require(success, "Transaction execution failed");
    }



// Function to revoke minting permissions
    function revokeMinting() external onlyOwner {
        mintingRevoked = true;
        emit MintingRevoked();
    }

    // Override the _mint function to respect the mintingRevoked flag
    function _mint(address account, uint256 amount) internal override {
        require(!mintingRevoked, "Minting has been revoked");
        super._mint(account, amount);
    }

}