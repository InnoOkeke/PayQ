// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PayQAgentRegistry
 * @notice ERC-8004 (Trustless Agents) Identity & Reputation Registry for PayQ
 *         on QDay Aevum Testnet (Chain ID 44005).
 *         Self-contained ERC-721 + ERC-8004 implementation compatible with Paris EVM.
 */
contract PayQAgentRegistry {
    string public constant name = "PayQ ERC-8004 Agent";
    string public constant symbol = "PAYQ8004";

    uint256 private _nextAgentId = 1;

    struct FeedbackEntry {
        address clientAddress;
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        string feedbackURI;
        bytes32 feedbackHash;
        uint256 timestamp;
    }

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => address) private _agentWallets;
    mapping(uint256 => FeedbackEntry[]) private _feedbacks;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    event Registered(
        uint256 indexed agentId,
        string agentURI,
        address indexed owner
    );
    event URIUpdated(
        uint256 indexed agentId,
        string newURI,
        address indexed updatedBy
    );
    event AgentWalletSet(
        uint256 indexed agentId,
        address indexed newWallet
    );
    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string tag1,
        string tag2
    );

    error NonexistentAgent();
    error NotAgentOwner();
    error InvalidWallet();
    error SelfFeedbackNotAllowed();
    error InvalidScoreRange();

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC-165
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x5b5e139f;   // ERC-721Metadata
    }

    function balanceOf(address owner) external view returns (uint256) {
        if (owner == address(0)) revert InvalidWallet();
        return _balances[owner];
    }

    function ownerOf(uint256 agentId) public view returns (address) {
        address owner = _owners[agentId];
        if (owner == address(0)) revert NonexistentAgent();
        return owner;
    }

    function tokenURI(uint256 agentId) external view returns (string memory) {
        ownerOf(agentId);
        return _tokenURIs[agentId];
    }

    function approve(address to, uint256 agentId) external {
        address owner = ownerOf(agentId);
        if (msg.sender != owner && !_operatorApprovals[owner][msg.sender]) {
            revert NotAgentOwner();
        }
        _tokenApprovals[agentId] = to;
        emit Approval(owner, to, agentId);
    }

    function getApproved(uint256 agentId) external view returns (address) {
        ownerOf(agentId);
        return _tokenApprovals[agentId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 agentId) public {
        address owner = ownerOf(agentId);
        if (owner != from || to == address(0)) revert InvalidWallet();
        if (
            msg.sender != owner &&
            _tokenApprovals[agentId] != msg.sender &&
            !_operatorApprovals[owner][msg.sender]
        ) {
            revert NotAgentOwner();
        }
        delete _tokenApprovals[agentId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[agentId] = to;
        emit Transfer(from, to, agentId);
    }

    /**
     * @notice Register an AI agent with an ERC-8004 registration URI.
     */
    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _owners[agentId] = msg.sender;
        _balances[msg.sender] += 1;
        _tokenURIs[agentId] = agentURI;
        _agentWallets[agentId] = msg.sender;

        emit Transfer(address(0), msg.sender, agentId);
        emit Registered(agentId, agentURI, msg.sender);
    }

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        _tokenURIs[agentId] = newURI;
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    function setAgentWallet(uint256 agentId, address newWallet) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        if (newWallet == address(0)) revert InvalidWallet();
        _agentWallets[agentId] = newWallet;
        emit AgentWalletSet(agentId, newWallet);
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        address owner = ownerOf(agentId);
        address wallet = _agentWallets[agentId];
        return wallet != address(0) ? wallet : owner;
    }

    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    /**
     * @notice Submit ERC-8004 reputation feedback for an agent (0-100 score).
     */
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        address agentOwner = ownerOf(agentId);
        if (msg.sender == agentOwner) revert SelfFeedbackNotAllowed();
        if (value < 0 || value > 100) revert InvalidScoreRange();

        _feedbacks[agentId].push(
            FeedbackEntry({
                clientAddress: msg.sender,
                value: value,
                valueDecimals: valueDecimals,
                tag1: tag1,
                tag2: tag2,
                feedbackURI: feedbackURI,
                feedbackHash: feedbackHash,
                timestamp: block.timestamp
            })
        );

        uint64 index = uint64(_feedbacks[agentId].length - 1);
        emit NewFeedback(
            agentId,
            msg.sender,
            index,
            value,
            valueDecimals,
            tag1,
            tag2
        );
    }

    function getSummary(
        uint256 agentId
    )
        external
        view
        returns (uint64 count, int128 averageValue, uint8 decimals)
    {
        FeedbackEntry[] storage list = _feedbacks[agentId];
        uint256 len = list.length;
        if (len == 0) {
            return (0, 0, 0);
        }
        int256 sum = 0;
        for (uint256 i = 0; i < len; i++) {
            sum += int256(list[i].value);
        }
        return (uint64(len), int128(sum / int256(len)), 0);
    }
}
