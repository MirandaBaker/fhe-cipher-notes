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

  it("Should properly validate admin permissions", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    // Admin should have all permissions
    expect(await contract.canUserWrite(signers.deployer.address)).to.be.true;
    expect(await contract.canUserDelete(signers.deployer.address)).to.be.true;

    // Non-admin should have no permissions by default
    expect(await contract.canUserWrite(signers.alice.address)).to.be.false;
    expect(await contract.canUserDelete(signers.alice.address)).to.be.false;
  });

  it("Should enforce permission checks for document updates", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    // Remove all permissions from alice
    const tx = await contract
      .connect(signers.deployer)
      .setPermission(signers.alice.address, false, false);
    await tx.wait();

    // Alice should not be able to update document
    const encryptedContent = ethers.hexlify(ethers.randomBytes(50));
    const input = instance.createEncryptedInput(contract.target, signers.alice.address);
    input.addAddress("0x1234567890123456789012345678901234567890");
    const encrypted = await input.encrypt();

    await expect(
      contract.connect(signers.alice).updateDocument(
        encryptedContent,
        encrypted.handles[0],
        encrypted.inputProof
      )
    ).to.be.revertedWith("Not authorized to edit");
  });

  it("Should allow authorized users to update documents", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    // Grant write permission to alice
    const tx = await contract
      .connect(signers.deployer)
      .setPermission(signers.alice.address, true, false);
    await tx.wait();

    // Alice should now be able to update document
    const encryptedContent = ethers.hexlify(ethers.randomBytes(50));
    const input = instance.createEncryptedInput(contract.target, signers.alice.address);
    input.addAddress("0x1234567890123456789012345678901234567890");
    const encrypted = await input.encrypt();

    await expect(
      contract.connect(signers.alice).updateDocument(
        encryptedContent,
        encrypted.handles[0],
        encrypted.inputProof
      )
    ).to.not.be.reverted;
  });

  it("Should enforce delete permissions for clearDocument", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    // First create a document as admin
    const encryptedContent = ethers.hexlify(ethers.randomBytes(50));
    const input = instance.createEncryptedInput(contract.target, signers.deployer.address);
    input.addAddress("0x1234567890123456789012345678901234567890");
    const encrypted = await input.encrypt();

    await contract.updateDocument(
      encryptedContent,
      encrypted.handles[0],
      encrypted.inputProof
    );

    // Alice should not be able to clear without delete permission
    await expect(
      contract.connect(signers.alice).clearDocument()
    ).to.be.revertedWith("Not authorized to delete");
  });

  it("Should allow users with delete permission to clear documents", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    // First create a document as admin
    const encryptedContent = ethers.hexlify(ethers.randomBytes(50));
    const input = instance.createEncryptedInput(contract.target, signers.deployer.address);
    input.addAddress("0x1234567890123456789012345678901234567890");
    const encrypted = await input.encrypt();

    await contract.updateDocument(
      encryptedContent,
      encrypted.handles[0],
      encrypted.inputProof
    );

    // Grant delete permission to alice
    const tx = await contract
      .connect(signers.deployer)
      .setPermission(signers.alice.address, false, true);
    await tx.wait();

    // Alice should now be able to clear the document
    await expect(
      contract.connect(signers.alice).clearDocument()
    ).to.not.be.reverted;
  });

  it("Should validate encrypted content length requirements", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    const input = instance.createEncryptedInput(contract.target, signers.deployer.address);
    input.addAddress("0x1234567890123456789012345678901234567890");
    const encrypted = await input.encrypt();

    // Test with content too short (less than nonce + data)
    const shortContent = ethers.hexlify(ethers.randomBytes(10));
    await expect(
      contract.updateDocument(
        shortContent,
        encrypted.handles[0],
        encrypted.inputProof
      )
    ).to.be.revertedWith("Encrypted content must contain nonce and data");

    // Test with content too long
    const longContent = ethers.hexlify(ethers.randomBytes(10001));
    await expect(
      contract.updateDocument(
        longContent,
        encrypted.handles[0],
        encrypted.inputProof
      )
    ).to.be.revertedWith("Encrypted content too large");
  });
});

