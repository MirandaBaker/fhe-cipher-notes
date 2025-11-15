import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { FHECipherNotes } from "../types";
import { createInstance } from "@fhevmjs/fhevmjs";

describe("FHECipherNotes Document Collaboration", function () {
  this.timeout(180000);

  let instance: any;

  before(async function () {
    instance = await createInstance();
  });

  async function deployFHECipherNotes(): Promise<{
    contract: FHECipherNotes;
    signers: any;
  }> {
    const signers = await ethers.getSigners();

    const fheCipherNotes = await ethers.getContractFactory("FHECipherNotes");
    const contract = await fheCipherNotes.connect(signers.deployer).deploy();
    await contract.waitForDeployment();

    return { contract, signers };
  }

  it("Should support collaborative editing workflow", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    // Admin creates initial document
    const initialContent = "Initial collaborative document content.";
    const contentBytes = ethers.toUtf8Bytes(initialContent);
    const passwordAddress = ethers.hexlify(ethers.randomBytes(20));

    const { chacha20Encrypt } = await import("../ui/src/utils/chacha20");
    const { deriveKeyFromPasswordAddress } = await import("../ui/src/utils/bytes");

    const key = deriveKeyFromPasswordAddress(passwordAddress);
    const nonce = ethers.toBeArray(ethers.randomBytes(12));
    const encryptedContent = chacha20Encrypt(key, nonce, contentBytes);
    const fullEncryptedContent = ethers.concat([nonce, encryptedContent]);

    const input = instance.createEncryptedInput(await contract.getAddress(), signers.deployer.address);
    input.addAddress(passwordAddress);
    const encryptedInput = await input.encrypt();

    await contract.updateDocument(
      fullEncryptedContent,
      encryptedInput.handles[0],
      encryptedInput.inputProof
    );

    // Grant Alice write permissions
    await contract.connect(signers.deployer).setPermission(signers.alice.address, true, false);

    // Alice adds to the document
    const aliceContent = " Alice's contribution to the document.";
    const aliceBytes = ethers.toUtf8Bytes(aliceContent);
    const alicePassword = ethers.hexlify(ethers.randomBytes(20));
    const aliceKey = deriveKeyFromPasswordAddress(alicePassword);
    const aliceNonce = ethers.toBeArray(ethers.randomBytes(12));
    const aliceEncrypted = chacha20Encrypt(aliceKey, aliceNonce, aliceBytes);
    const aliceFullContent = ethers.concat([aliceNonce, aliceEncrypted]);

    const aliceInput = instance.createEncryptedInput(await contract.getAddress(), signers.alice.address);
    aliceInput.addAddress(alicePassword);
    const aliceEncryptedInput = await aliceInput.encrypt();

    await contract.connect(signers.alice).updateDocument(
      aliceFullContent,
      aliceEncryptedInput.handles[0],
      aliceEncryptedInput.inputProof
    );

    // Verify the document was updated by Alice
    const meta = await contract.getDocumentMeta();
    expect(meta.editor).to.equal(signers.alice.address);

    // Bob should be able to read the document
    const [finalContent, finalPassword] = await Promise.all([
      contract.getDocumentContent(),
      contract.getDocumentPassword()
    ]);

    const { decryptFHE } = await import("../ui/src/utils/fheDecrypt");
    const decryptedPassword = await decryptFHE(
      instance,
      await contract.getAddress(),
      finalPassword,
      signers.deployer.address,
      async (args: any) => await signers.deployer.signTypedData(args.domain, args.types, args.message)
    );

    const { chacha20Decrypt } = await import("../ui/src/utils/chacha20");
    const finalBytes = ethers.toBeArray(finalContent);
    const finalNonce = finalBytes.slice(0, 12);
    const finalCiphertext = finalBytes.slice(12);
    const finalKey = deriveKeyFromPasswordAddress(decryptedPassword);
    const finalDecrypted = chacha20Decrypt(finalKey, finalNonce, finalCiphertext);
    const finalMessage = ethers.toUtf8String(finalDecrypted);

    expect(finalMessage).to.equal(aliceContent);
  });

  it("Should enforce permission-based access control", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    // Create initial document
    const content = "Protected document content.";
    const contentBytes = ethers.toUtf8Bytes(content);
    const passwordAddress = ethers.hexlify(ethers.randomBytes(20));

    const { chacha20Encrypt } = await import("../ui/src/utils/chacha20");
    const { deriveKeyFromPasswordAddress } = await import("../ui/src/utils/bytes");

    const key = deriveKeyFromPasswordAddress(passwordAddress);
    const nonce = ethers.toBeArray(ethers.randomBytes(12));
    const encryptedContent = chacha20Encrypt(key, nonce, contentBytes);
    const fullEncryptedContent = ethers.concat([nonce, encryptedContent]);

    const input = instance.createEncryptedInput(await contract.getAddress(), signers.deployer.address);
    input.addAddress(passwordAddress);
    const encryptedInput = await input.encrypt();

    await contract.updateDocument(
      fullEncryptedContent,
      encryptedInput.handles[0],
      encryptedInput.inputProof
    );

    // Alice has no permissions by default
    expect(await contract.canUserWrite(signers.alice.address)).to.be.false;
    expect(await contract.canUserDelete(signers.alice.address)).to.be.false;

    // Alice cannot edit
    const aliceContent = "Unauthorized edit attempt.";
    const aliceBytes = ethers.toUtf8Bytes(aliceContent);
    const alicePassword = ethers.hexlify(ethers.randomBytes(20));
    const aliceKey = deriveKeyFromPasswordAddress(alicePassword);
    const aliceNonce = ethers.toBeArray(ethers.randomBytes(12));
    const aliceEncrypted = chacha20Encrypt(aliceKey, aliceNonce, aliceBytes);
    const aliceFullContent = ethers.concat([aliceNonce, aliceEncrypted]);

    const aliceInput = instance.createEncryptedInput(await contract.getAddress(), signers.alice.address);
    aliceInput.addAddress(alicePassword);
    const aliceEncryptedInput = await aliceInput.encrypt();

    await expect(
      contract.connect(signers.alice).updateDocument(
        aliceFullContent,
        aliceEncryptedInput.handles[0],
        aliceEncryptedInput.inputProof
      )
    ).to.be.revertedWith("Not authorized to edit");

    // Grant Alice write permission
    await contract.connect(signers.deployer).setPermission(signers.alice.address, true, false);

    // Now Alice can edit
    await expect(
      contract.connect(signers.alice).updateDocument(
        aliceFullContent,
        aliceEncryptedInput.handles[0],
        aliceEncryptedInput.inputProof
      )
    ).to.not.be.reverted;
  });

  it("Should handle document deletion with proper permissions", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    // Create document
    const content = "Document to be deleted.";
    const contentBytes = ethers.toUtf8Bytes(content);
    const passwordAddress = ethers.hexlify(ethers.randomBytes(20));

    const { chacha20Encrypt } = await import("../ui/src/utils/chacha20");
    const { deriveKeyFromPasswordAddress } = await import("../ui/src/utils/bytes");

    const key = deriveKeyFromPasswordAddress(passwordAddress);
    const nonce = ethers.toBeArray(ethers.randomBytes(12));
    const encryptedContent = chacha20Encrypt(key, nonce, contentBytes);
    const fullEncryptedContent = ethers.concat([nonce, encryptedContent]);

    const input = instance.createEncryptedInput(await contract.getAddress(), signers.deployer.address);
    input.addAddress(passwordAddress);
    const encryptedInput = await input.encrypt();

    await contract.updateDocument(
      fullEncryptedContent,
      encryptedInput.handles[0],
      encryptedInput.inputProof
    );

    // Verify document exists
    let meta = await contract.getDocumentMeta();
    expect(meta.exists).to.be.true;

    // Alice cannot delete without permission
    await expect(
      contract.connect(signers.alice).clearDocument()
    ).to.be.revertedWith("Not authorized to delete");

    // Grant Alice delete permission
    await contract.connect(signers.deployer).setPermission(signers.alice.address, false, true);

    // Now Alice can delete
    await contract.connect(signers.alice).clearDocument();

    // Verify document is deleted
    meta = await contract.getDocumentMeta();
    expect(meta.exists).to.be.false;
  });

  it("Should maintain audit trail through events", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    // Grant Alice permissions
    await contract.connect(signers.deployer).setPermission(signers.alice.address, true, true);

    // Alice creates document
    const content = "Auditable document.";
    const contentBytes = ethers.toUtf8Bytes(content);
    const passwordAddress = ethers.hexlify(ethers.randomBytes(20));

    const { chacha20Encrypt } = await import("../ui/src/utils/chacha20");
    const { deriveKeyFromPasswordAddress } = await import("../ui/src/utils/bytes");

    const key = deriveKeyFromPasswordAddress(passwordAddress);
    const nonce = ethers.toBeArray(ethers.randomBytes(12));
    const encryptedContent = chacha20Encrypt(key, nonce, contentBytes);
    const fullEncryptedContent = ethers.concat([nonce, encryptedContent]);

    const input = instance.createEncryptedInput(await contract.getAddress(), signers.alice.address);
    input.addAddress(passwordAddress);
    const encryptedInput = await input.encrypt();

    const tx = await contract.connect(signers.alice).updateDocument(
      fullEncryptedContent,
      encryptedInput.handles[0],
      encryptedInput.inputProof
    );

    // Check DocumentUpdated event
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed.name === 'DocumentUpdated';
      } catch {
        return false;
      }
    });

    expect(event).to.not.be.undefined;
    const parsedEvent = contract.interface.parseLog(event);
    expect(parsedEvent.args.editor).to.equal(signers.alice.address);
    expect(parsedEvent.args.timestamp).to.be.gt(0);
  });

  it("Should support admin override permissions", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    // Alice has no permissions
    expect(await contract.canUserWrite(signers.alice.address)).to.be.false;

    // But admin (deployer) can always perform actions
    const content = "Admin override document.";
    const contentBytes = ethers.toUtf8Bytes(content);
    const passwordAddress = ethers.hexlify(ethers.randomBytes(20));

    const { chacha20Encrypt } = await import("../ui/src/utils/chacha20");
    const { deriveKeyFromPasswordAddress } = await import("../ui/src/utils/bytes");

    const key = deriveKeyFromPasswordAddress(passwordAddress);
    const nonce = ethers.toBeArray(ethers.randomBytes(12));
    const encryptedContent = chacha20Encrypt(key, nonce, contentBytes);
    const fullEncryptedContent = ethers.concat([nonce, encryptedContent]);

    const input = instance.createEncryptedInput(await contract.getAddress(), signers.deployer.address);
    input.addAddress(passwordAddress);
    const encryptedInput = await input.encrypt();

    // Admin can update despite no explicit permissions
    await expect(
      contract.connect(signers.deployer).updateDocument(
        fullEncryptedContent,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      )
    ).to.not.be.reverted;

    // Admin can also delete
    await contract.connect(signers.deployer).clearDocument();
  });
});
