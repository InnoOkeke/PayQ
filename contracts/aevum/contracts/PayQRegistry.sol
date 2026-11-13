// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PayQRegistry
 * @notice On-chain Confirmation of Payee (CoP), tUSD8 Invoice Settlement, and
 *         Treasury Guardrails for PayQ on QDay Aevum Testnet (Chain ID 44005).
 */
contract PayQRegistry is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum VerificationTier {
        UNVERIFIED,
        VERIFIED,
        WARNING
    }

    struct PayeeRecord {
        address wallet;
        string legalName;
        string paymentId;
        VerificationTier tier;
        uint256 registeredAt;
        uint256 updatedAt;
        bool exists;
    }

    IERC20 public immutable tusd8;

    // Treasury Guardrails (in tUSD8 base units, 6 decimals)
    uint256 public maxSingleTxAmount = 500 * 1e6; // 500 tUSD8
    uint256 public dailyVelocityCap = 2500 * 1e6; // 2,500 tUSD8
    uint256 public warningCooldown = 24 hours;
    bool public paused;

    // Rolling 24h window tracking per sender
    mapping(address => uint256) public windowStart;
    mapping(address => uint256) public windowSpent;

    // Payee registry
    mapping(address => PayeeRecord) private payees;
    mapping(string => address) public paymentIdToAddress;
    address[] private registeredAddresses;

    event PayeeRegistered(
        address indexed payee,
        string legalName,
        string paymentId,
        uint256 timestamp
    );
    event PayeeUpdated(
        address indexed payee,
        string legalName,
        VerificationTier tier,
        uint256 timestamp
    );
    event InvoiceSettled(
        address indexed payer,
        address indexed payee,
        uint256 amount,
        string invoiceRef,
        uint256 timestamp
    );
    event GuardrailsUpdated(
        uint256 maxSingleTxAmount,
        uint256 dailyVelocityCap,
        bool paused
    );

    error ContractPaused();
    error InvalidAddress();
    error EmptyName();
    error PaymentIdTaken();
    error PayeeMismatch(string expectedName, string registeredName);
    error ExceedsSingleTxLimit(uint256 amount, uint256 limit);
    error ExceedsDailyVelocityCap(uint256 projected, uint256 cap);

    constructor(address _tusd8, address _initialOwner) Ownable(_initialOwner) {
        if (_tusd8 == address(0)) revert InvalidAddress();
        tusd8 = IERC20(_tusd8);
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    /**
     * @notice Register a verified payee in the Confirmation of Payee directory.
     */
    function registerPayee(
        address payee,
        string calldata legalName,
        string calldata paymentId
    ) external {
        if (payee == address(0)) revert InvalidAddress();
        if (bytes(legalName).length == 0) revert EmptyName();
        if (bytes(paymentId).length > 0) {
            address existingOwner = paymentIdToAddress[paymentId];
            if (existingOwner != address(0) && existingOwner != payee) {
                revert PaymentIdTaken();
            }
            paymentIdToAddress[paymentId] = payee;
        }

        bool isNew = !payees[payee].exists;
        payees[payee] = PayeeRecord({
            wallet: payee,
            legalName: legalName,
            paymentId: paymentId,
            tier: VerificationTier.VERIFIED,
            registeredAt: isNew ? block.timestamp : payees[payee].registeredAt,
            updatedAt: block.timestamp,
            exists: true
        });

        if (isNew) {
            registeredAddresses.push(payee);
            emit PayeeRegistered(payee, legalName, paymentId, block.timestamp);
        } else {
            // Mark as WARNING on recent profile rotation
            payees[payee].tier = VerificationTier.WARNING;
            emit PayeeUpdated(payee, legalName, VerificationTier.WARNING, block.timestamp);
        }
    }

    /**
     * @notice Verify a payee's identity before sending tUSD8.
     * @return status "VERIFIED", "WARNING", "MISMATCH", or "UNVERIFIED"
     * @return registeredName The registered legal name (if any)
     * @return trustScore 0-100 score
     */
    function verifyPayee(
        address payee,
        string calldata expectedName
    )
        external
        view
        returns (
            string memory status,
            string memory registeredName,
            uint8 trustScore
        )
    {
        PayeeRecord memory rec = payees[payee];
        if (!rec.exists) {
            return ("UNVERIFIED", "", 40);
        }

        if (bytes(expectedName).length > 0) {
            if (!_equalsIgnoreCase(rec.legalName, expectedName)) {
                return ("MISMATCH", rec.legalName, 10);
            }
        }

        if (
            rec.tier == VerificationTier.WARNING &&
            block.timestamp < rec.updatedAt + warningCooldown
        ) {
            return ("WARNING", rec.legalName, 65);
        }

        return ("VERIFIED", rec.legalName, 95);
    }

    /**
     * @notice Settle an invoice in tUSD8 with on-chain CoP and Treasury Guardrail enforcement.
     */
    function payInvoice(
        address payee,
        uint256 amount,
        string calldata invoiceRef,
        string calldata expectedName
    ) external nonReentrant whenNotPaused {
        if (payee == address(0)) revert InvalidAddress();
        if (amount > maxSingleTxAmount) {
            revert ExceedsSingleTxLimit(amount, maxSingleTxAmount);
        }

        // Enforce rolling 24h velocity cap
        if (block.timestamp >= windowStart[msg.sender] + 24 hours) {
            windowStart[msg.sender] = block.timestamp;
            windowSpent[msg.sender] = 0;
        }
        uint256 projected = windowSpent[msg.sender] + amount;
        if (projected > dailyVelocityCap) {
            revert ExceedsDailyVelocityCap(projected, dailyVelocityCap);
        }

        // Enforce Confirmation of Payee if expectedName is supplied and payee is registered
        PayeeRecord memory rec = payees[payee];
        if (rec.exists && bytes(expectedName).length > 0) {
            if (!_equalsIgnoreCase(rec.legalName, expectedName)) {
                revert PayeeMismatch(expectedName, rec.legalName);
            }
        }

        windowSpent[msg.sender] = projected;
        tusd8.safeTransferFrom(msg.sender, payee, amount);

        emit InvoiceSettled(msg.sender, payee, amount, invoiceRef, block.timestamp);
    }

    function updateGuardrails(
        uint256 _maxSingleTxAmount,
        uint256 _dailyVelocityCap,
        bool _paused
    ) external onlyOwner {
        maxSingleTxAmount = _maxSingleTxAmount;
        dailyVelocityCap = _dailyVelocityCap;
        paused = _paused;
        emit GuardrailsUpdated(_maxSingleTxAmount, _dailyVelocityCap, _paused);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit GuardrailsUpdated(maxSingleTxAmount, dailyVelocityCap, _paused);
    }

    function getPayee(address payee) external view returns (PayeeRecord memory) {
        return payees[payee];
    }

    function getRegisteredCount() external view returns (uint256) {
        return registeredAddresses.length;
    }

    function _equalsIgnoreCase(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        bytes memory ba = bytes(a);
        bytes memory bb = bytes(b);
        if (ba.length != bb.length) return false;
        for (uint256 i = 0; i < ba.length; i++) {
            bytes1 ca = ba[i];
            bytes1 cb = bb[i];
            if (ca >= 0x41 && ca <= 0x5A) ca = bytes1(uint8(ca) + 32);
            if (cb >= 0x41 && cb <= 0x5A) cb = bytes1(uint8(cb) + 32);
            if (ca != cb) return false;
        }
        return true;
    }
}
