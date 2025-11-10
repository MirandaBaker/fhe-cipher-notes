import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHECipherNotes, FHECipherNotes__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHECipherNotes")) as FHECipherNotes__factory;
  const contract = (await factory.deploy()) as FHECipherNotes;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("FHECipherNotes", function () {
  let signers: Signers;
  let contract: FHECipherNotes;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("should set deployer as admin", async function () {
    const admin = await contract.getAdmin();
    expect(admin).to.eq(signers.deployer.address);
  });

  it("admin should have write and delete permissions", async function () {
    const canWrite = await contract.canUserWrite(signers.deployer.address);
    const canDelete = await contract.canUserDelete(signers.deployer.address);
    expect(canWrite).to.be.true;
    expect(canDelete).to.be.true;
  });

  it("should allow admin to grant permissions", async function () {
    const tx = await contract
      .connect(signers.deployer)
      .setPermission(signers.alice.address, true, false);
    await tx.wait();

    const canWrite = await contract.canUserWrite(signers.alice.address);
    const canDelete = await contract.canUserDelete(signers.alice.address);
    expect(canWrite).to.be.true;
    expect(canDelete).to.be.false;
  });

  it("should allow authorized user to add edit", async function () {
    // Grant write permission to alice
    let tx = await contract
      .connect(signers.deployer)
      .setPermission(signers.alice.address, true, false);
    await tx.wait();

    // Generate a random address-shaped password
    const wallet = ethers.Wallet.createRandom();
    const passwordAddress = wallet.address;

    // Encrypt the password
    const enc = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .addAddress(passwordAddress)
      .encrypt();

    // Simulate encrypted content (in real use, this would be ChaCha20 encrypted)
    const encryptedContent = ethers.toUtf8Bytes("Hello, FHE Cipher Notes!");

    // Update document
    tx = await contract
      .connect(signers.alice)
      .updateDocument(encryptedContent, enc.handles[0], enc.inputProof);
    await tx.wait();

    const [editor, timestamp, exists] = await contract.getDocumentMeta();
    expect(editor).to.eq(signers.alice.address);
    expect(exists).to.be.true;
  });

  it("should not allow unauthorized user to add edit", async function () {
    const wallet = ethers.Wallet.createRandom();
    const passwordAddress = wallet.address;

    const enc = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .addAddress(passwordAddress)
      .encrypt();

    const encryptedContent = ethers.toUtf8Bytes("Unauthorized edit");

    await expect(
      contract.connect(signers.bob).updateDocument(encryptedContent, enc.handles[0], enc.inputProof)
    ).to.be.revertedWith("Not authorized to edit");
  });

  it("should allow admin to revoke permissions", async function () {
    // Grant write permission
    let tx = await contract
      .connect(signers.deployer)
      .setPermission(signers.alice.address, true, false);
    await tx.wait();

    // Revoke write permission
    tx = await contract
      .connect(signers.deployer)
      .setPermission(signers.alice.address, false, false);
    await tx.wait();

    const canWrite = await contract.canUserWrite(signers.alice.address);
    expect(canWrite).to.be.false;
  });
});

