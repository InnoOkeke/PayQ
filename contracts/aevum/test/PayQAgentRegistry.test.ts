import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("PayQAgentRegistry (ERC-8004)", function () {
  it("registers an agent identity NFT and records client reputation feedback", async function () {
    const [owner, client1, client2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PayQAgentRegistry");
    const registry = await Factory.deploy();

    const uri = "https://payq-virid.vercel.app/api/agent";
    await expect(registry.connect(owner).register(uri))
      .to.emit(registry, "Registered")
      .withArgs(1, uri, owner.address);

    expect(await registry.ownerOf(1)).to.equal(owner.address);
    expect(await registry.tokenURI(1)).to.equal(uri);
    expect(await registry.getAgentWallet(1)).to.equal(owner.address);

    // Owner cannot rate own agent
    await expect(
      registry.connect(owner).giveFeedback(1, 100, 0, "cop", "aevum", "", ethers.ZeroHash)
    ).to.be.revertedWithCustomError(registry, "SelfFeedbackNotAllowed");

    // Clients submit ERC-8004 feedback
    await registry.connect(client1).giveFeedback(1, 95, 0, "cop", "tusd8", "", ethers.ZeroHash);
    await registry.connect(client2).giveFeedback(1, 85, 0, "settlement", "tusd8", "", ethers.ZeroHash);

    const [count, avg, decimals] = await registry.getSummary(1);
    expect(count).to.equal(2);
    expect(avg).to.equal(90);
    expect(decimals).to.equal(0);
  });
});
