import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("PayQRegistry", function () {
  async function deployFixture() {
    const [owner, payer, payee, attacker] = await ethers.getSigners();
    const MockTUSD8 = await ethers.getContractFactory("MockTUSD8");
    const tusd8 = await MockTUSD8.deploy();

    const PayQRegistry = await ethers.getContractFactory("PayQRegistry");
    const registry = await PayQRegistry.deploy(await tusd8.getAddress(), owner.address);

    // Mint 10,000 tUSD8 (6 decimals) to payer
    await tusd8.mint(payer.address, ethers.parseUnits("10000", 6));
    await tusd8.connect(payer).approve(await registry.getAddress(), ethers.MaxUint256);

    return { owner, payer, payee, attacker, tusd8, registry };
  }

  it("registers and verifies a payee (case-insensitive match)", async function () {
    const { payee, registry } = await deployFixture();
    await registry.registerPayee(payee.address, "Acme Web3 Design", "acme-design");

    const [status, name, score] = await registry.verifyPayee(payee.address, "acme web3 design");
    expect(status).to.equal("VERIFIED");
    expect(name).to.equal("Acme Web3 Design");
    expect(score).to.equal(95);
  });

  it("detects MISMATCH when expectedName differs from registered name", async function () {
    const { payee, registry } = await deployFixture();
    await registry.registerPayee(payee.address, "Acme Web3 Design", "acme-design");

    const [status, name, score] = await registry.verifyPayee(payee.address, "Spoofed Corp");
    expect(status).to.equal("MISMATCH");
    expect(name).to.equal("Acme Web3 Design");
    expect(score).to.equal(10);
  });

  it("settles tUSD8 invoice when CoP and guardrails pass", async function () {
    const { payer, payee, tusd8, registry } = await deployFixture();
    await registry.registerPayee(payee.address, "Acme Web3 Design", "acme-design");

    const amount = ethers.parseUnits("150", 6);
    await expect(
      registry.connect(payer).payInvoice(payee.address, amount, "INV-2026-001", "Acme Web3 Design")
    )
      .to.emit(registry, "InvoiceSettled")
      .withArgs(payer.address, payee.address, amount, "INV-2026-001", (v: any) => v > 0);

    expect(await tusd8.balanceOf(payee.address)).to.equal(amount);
  });

  it("blocks invoice payment on CoP mismatch and guardrail breaches", async function () {
    const { owner, payer, payee, registry } = await deployFixture();
    await registry.registerPayee(payee.address, "Acme Web3 Design", "acme-design");

    // CoP mismatch
    await expect(
      registry
        .connect(payer)
        .payInvoice(payee.address, ethers.parseUnits("50", 6), "INV-1", "Evil Corp")
    ).to.be.revertedWithCustomError(registry, "PayeeMismatch");

    // Exceeds single tx limit (500 tUSD8)
    await expect(
      registry
        .connect(payer)
        .payInvoice(payee.address, ethers.parseUnits("600", 6), "INV-2", "Acme Web3 Design")
    ).to.be.revertedWithCustomError(registry, "ExceedsSingleTxLimit");

    // Emergency killswitch
    await registry.connect(owner).setPaused(true);
    await expect(
      registry
        .connect(payer)
        .payInvoice(payee.address, ethers.parseUnits("10", 6), "INV-3", "Acme Web3 Design")
    ).to.be.revertedWithCustomError(registry, "ContractPaused");
  });

  it("allows any connected wallet to configure and enforce its own guardrails", async function () {
    const { payer, payee, attacker, registry } = await deployFixture();
    await registry.registerPayee(payee.address, "Acme Web3 Design", "acme-design");

    // Non-owner wallet sets its own custom guardrails (maxSingle = 50 tUSD8, dailyCap = 100 tUSD8)
    await registry
      .connect(payer)
      .updateMyGuardrails(ethers.parseUnits("50", 6), ethers.parseUnits("100", 6), false);

    const [maxSingle, dailyCap, isPaused, configured] = await registry.getGuardrails(payer.address);
    expect(maxSingle).to.equal(ethers.parseUnits("50", 6));
    expect(dailyCap).to.equal(ethers.parseUnits("100", 6));
    expect(isPaused).to.equal(false);
    expect(configured).to.equal(true);

    // Other wallets still use global defaults (500 tUSD8 / 2500 tUSD8)
    const [otherMax, otherCap, otherPaused, otherConfigured] = await registry.getGuardrails(attacker.address);
    expect(otherMax).to.equal(ethers.parseUnits("500", 6));
    expect(otherCap).to.equal(ethers.parseUnits("2500", 6));
    expect(otherPaused).to.equal(false);
    expect(otherConfigured).to.equal(false);

    // Payer's 60 tUSD8 payment is blocked by payer's custom 50 tUSD8 limit
    await expect(
      registry
        .connect(payer)
        .payInvoice(payee.address, ethers.parseUnits("60", 6), "INV-CUSTOM-1", "Acme Web3 Design")
    ).to.be.revertedWithCustomError(registry, "ExceedsSingleTxLimit");

    // Payer toggles its own killswitch
    await registry.connect(payer).setMyPaused(true);
    await expect(
      registry
        .connect(payer)
        .payInvoice(payee.address, ethers.parseUnits("10", 6), "INV-CUSTOM-2", "Acme Web3 Design")
    ).to.be.revertedWithCustomError(registry, "ContractPaused");
  });
});
