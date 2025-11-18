import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { FHECipherNotes } from "../types";
import { createInstance } from "@fhevmjs/fhevmjs";

describe("FHECipherNotes End-to-End Integration", function () {
  this.timeout(300000); // 5 minutes for complex integration tests

  let instance: any;
  let contract: FHECipherNotes;
  let signers: any;

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

  beforeEach(async function () {
    const fixture = await loadFixture(deployFHECipherNotes);
    contract = fixture.contract;
    signers = fixture.signers;
  });

  it("Should complete full user workflow from registration to collaboration", async function () {
    // Phase 1: Admin setup
    expect(await contract.getAdmin()).to.equal(signers.deployer.address);

    // Phase 2: Grant permissions to collaborators
    await contract.connect(signers.deployer).setPermission(signers.alice.address, true, true);
    await contract.connect(signers.deployer).setPermission(signers.bob.address, true, false);

    // Verify permissions
    expect(await contract.canUserWrite(signers.alice.address)).to.be.true;
    expect(await contract.canUserDelete(signers.alice.address)).to.be.true;
    expect(await contract.canUserWrite(signers.bob.address)).to.be.true;
    expect(await contract.canUserDelete(signers.bob.address)).to.be.false;

    // Phase 3: Alice creates initial document
    const initialContent = "Initial collaborative document for testing.";
    const { encryptedContent: aliceEncrypted, passwordAddress: alicePassword } =
      await encryptContent(initialContent, signers.alice);

    await contract.connect(signers.alice).updateDocument(
      aliceEncrypted,
      aliceEncrypted.handles[0],
      aliceEncrypted.inputProof
    );

    // Verify document creation
    const meta = await contract.getDocumentMeta();
    expect(meta.exists).to.be.true;
    expect(meta.editor).to.equal(signers.alice.address);

    // Phase 4: Bob reads and contributes
    const { decryptedContent: aliceContent } = await decryptContent(signers.deployer);
    expect(aliceContent).to.equal(initialContent);

    const bobContribution = " Bob's contribution to the document.";
    const { encryptedContent: bobEncrypted } = await encryptContent(bobContribution, signers.bob);

    await contract.connect(signers.bob).updateDocument(
      bobEncrypted,
      bobEncrypted.handles[0],
      bobEncrypted.inputProof
    );

    // Phase 5: Verify collaboration result
    const { decryptedContent: finalContent } = await decryptContent(signers.deployer);
    expect(finalContent).to.equal(bobContribution);

    // Phase 6: Alice deletes document (has delete permission)
    await contract.connect(signers.alice).clearDocument();
    const finalMeta = await contract.getDocumentMeta();
    expect(finalMeta.exists).to.be.false;
  });

  it("Should handle production-like load with multiple rapid edits", async function () {
    // Setup permissions
    await contract.connect(signers.deployer).setPermission(signers.alice.address, true, false);
    await contract.connect(signers.deployer).setPermission(signers.bob.address, true, false);

    const edits = [
      "First edit in rapid succession.",
      "Second edit with different content.",
      "Third edit to test consistency.",
      "Fourth edit for comprehensive testing.",
      "Fifth and final edit in this sequence."
    ];

    // Simulate rapid collaborative editing
    for (let i = 0; i < edits.length; i++) {
      const editor = i % 2 === 0 ? signers.alice : signers.bob;
      const content = edits[i];

      const { encryptedContent } = await encryptContent(content, editor);

      await contract.connect(editor).updateDocument(
        encryptedContent,
        encryptedContent.handles[0],
        encryptedContent.inputProof
      );

      // Verify each edit
      const { decryptedContent } = await decryptContent(signers.deployer);
      expect(decryptedContent).to.equal(content);

      const meta = await contract.getDocumentMeta();
      expect(meta.editor).to.equal(editor.address);
      expect(meta.exists).to.be.true;
    }
  });

  it("Should maintain security boundaries and access controls", async function () {
    // Setup: only Alice has write permissions
    await contract.connect(signers.deployer).setPermission(signers.alice.address, true, false);

    // Unauthorized write attempt should fail
    const content = "Unauthorized edit attempt.";
    const { encryptedContent } = await encryptContent(content, signers.bob);

    await expect(
      contract.connect(signers.bob).updateDocument(
        encryptedContent,
        encryptedContent.handles[0],
        encryptedContent.inputProof
      )
    ).to.be.revertedWith("Not authorized to edit");

    // Unauthorized delete attempt should fail
    await expect(
      contract.connect(signers.bob).clearDocument()
    ).to.be.revertedWith("Not authorized to delete");

    // Authorized operations should succeed
    await contract.connect(signers.alice).updateDocument(
      encryptedContent,
      encryptedContent.handles[0],
      encryptedContent.inputProof
    );

    const { decryptedContent } = await decryptContent(signers.deployer);
    expect(decryptedContent).to.equal(content);
  });

  it("Should handle edge cases and error conditions gracefully", async function () {
    // Setup permissions
    await contract.connect(signers.deployer).setPermission(signers.alice.address, true, true);

    // Test clearing non-existent document
    await expect(
      contract.connect(signers.alice).clearDocument()
    ).to.be.revertedWith("Document does not exist");

    // Test content validation
    const input = instance.createEncryptedInput(await contract.getAddress(), signers.alice.address);
    input.addAddress("0x1234567890123456789012345678901234567890");
    const encryptedInput = await input.encrypt();

    // Content too short
    await expect(
      contract.connect(signers.alice).updateDocument(
        "0x1234567890", // Less than 12 bytes + data
        encryptedInput.handles[0],
        encryptedInput.inputProof
      )
    ).to.be.revertedWith("Encrypted content must contain nonce and data");

    // Content too long
    const longContent = ethers.hexlify(ethers.randomBytes(10001));
    await expect(
      contract.connect(signers.alice).updateDocument(
        longContent,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      )
    ).to.be.revertedWith("Encrypted content too large");
  });

  it("Should maintain data integrity across network conditions", async function () {
    // Setup
    await contract.connect(signers.deployer).setPermission(signers.alice.address, true, false);

    const testContent = "Data integrity test content with special characters: 🚀 αβγδε";

    // Encrypt and submit
    const { encryptedContent } = await encryptContent(testContent, signers.alice);
    await contract.connect(signers.alice).updateDocument(
      encryptedContent,
      encryptedContent.handles[0],
      encryptedContent.inputProof
    );

    // Decrypt and verify multiple times (simulating network retries)
    for (let i = 0; i < 3; i++) {
      const { decryptedContent } = await decryptContent(signers.deployer);
      expect(decryptedContent).to.equal(testContent);
    }

    // Verify blockchain state consistency
    const meta1 = await contract.getDocumentMeta();
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    const meta2 = await contract.getDocumentMeta();

    expect(meta1.editor).to.equal(meta2.editor);
    expect(meta1.timestamp).to.equal(meta2.timestamp);
    expect(meta1.exists).to.equal(meta2.exists);
  });

  it("Should support admin role transitions and permission management", async function () {
    // Initial state: deployer is admin
    expect(await contract.getAdmin()).to.equal(signers.deployer.address);

    // Admin grants permissions
    await contract.connect(signers.deployer).setPermission(signers.alice.address, true, true);
    await contract.connect(signers.deployer).setPermission(signers.bob.address, false, true);

    // Alice (with full permissions) can perform all operations
    const content = "Admin-authorized content.";
    const { encryptedContent } = await encryptContent(content, signers.alice);

    await contract.connect(signers.alice).updateDocument(
      encryptedContent,
      encryptedContent.handles[0],
      encryptedContent.inputProof
    );

    // Alice can delete
    await contract.connect(signers.alice).clearDocument();

    // Bob (with only delete permission) can delete but not write
    await contract.connect(signers.alice).updateDocument(
      encryptedContent,
      encryptedContent.handles[0],
      encryptedContent.inputProof
    );

    await contract.connect(signers.bob).clearDocument();

    // Verify final state
    const finalMeta = await contract.getDocumentMeta();
    expect(finalMeta.exists).to.be.false;
  });

  // Helper functions
  async function encryptContent(content: string, signer: any) {
    const contentBytes = ethers.toUtf8Bytes(content);
    const passwordAddress = ethers.hexlify(ethers.randomBytes(20));

    const { chacha20Encrypt, deriveKeyFromPasswordAddress } = await import("../ui/src/utils/chacha20");
    const key = deriveKeyFromPasswordAddress(passwordAddress);
    const nonce = ethers.toBeArray(ethers.randomBytes(12));
    const encryptedMessage = chacha20Encrypt(key, nonce, contentBytes);
    const fullEncryptedContent = ethers.concat([nonce, encryptedMessage]);

    const input = instance.createEncryptedInput(await contract.getAddress(), signer.address);
    input.addAddress(passwordAddress);
    const encryptedInput = await input.encrypt();

    return {
      encryptedContent: fullEncryptedContent,
      passwordAddress,
      handles: encryptedInput.handles,
      inputProof: encryptedInput.inputProof
    };
  }

  async function decryptContent(signer: any) {
    const [retrievedContent, encryptedPassword] = await Promise.all([
      contract.getDocumentContent(),
      contract.getDocumentPassword()
    ]);

    const { decryptFHE } = await import("../ui/src/utils/fheDecrypt");
    const decryptedPasswordAddress = await decryptFHE(
      instance,
      await contract.getAddress(),
      encryptedPassword,
      signer.address,
      async (args: any) => await signer.signTypedData(args.domain, args.types, args.message)
    );

    const { chacha20Decrypt, deriveKeyFromPasswordAddress } = await import("../ui/src/utils/chacha20");
    const retrievedBytes = ethers.toBeArray(retrievedContent);
    const retrievedNonce = retrievedBytes.slice(0, 12);
    const retrievedCiphertext = retrievedBytes.slice(12);
    const decryptionKey = deriveKeyFromPasswordAddress(decryptedPasswordAddress);
    const decryptedBytes = chacha20Decrypt(decryptionKey, retrievedNonce, retrievedCiphertext);
    const decryptedContent = ethers.toUtf8String(decryptedBytes);

    return { decryptedContent, decryptedPasswordAddress };
  }
});
