import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { FHECipherNotes } from "../types";
import { createInstance } from "@fhevmjs/fhevmjs";

describe("FHECipherNotes Encryption Integration", function () {
  // Increase timeout for FHE operations
  this.timeout(120000);

  let instance: any;

  before(async function () {
    // Initialize FHE instance
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

  it("Should perform end-to-end encryption and decryption cycle", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    const testMessage = "This is a test message for encryption!";
    const messageBytes = ethers.toUtf8Bytes(testMessage);

    // Generate a random password address for encryption
    const passwordAddress = ethers.hexlify(ethers.randomBytes(20));

    // 1. Encrypt message using ChaCha20
    const { chacha20Encrypt, chacha20Decrypt } = await import("../ui/src/utils/chacha20");
    const { deriveKeyFromPasswordAddress } = await import("../ui/src/utils/bytes");

    const key = deriveKeyFromPasswordAddress(passwordAddress);
    const nonce = ethers.toBeArray(ethers.randomBytes(12));
    const encryptedMessage = chacha20Encrypt(key, nonce, messageBytes);
    const fullEncryptedContent = ethers.concat([nonce, encryptedMessage]);

    // 2. Encrypt password using FHE
    const input = instance.createEncryptedInput(await contract.getAddress(), signers.deployer.address);
    input.addAddress(passwordAddress);
    const encryptedInput = await input.encrypt();

    // 3. Submit to contract
    await contract.updateDocument(
      fullEncryptedContent,
      encryptedInput.handles[0],
      encryptedInput.inputProof
    );

    // 4. Retrieve from contract
    const [retrievedContent, encryptedPassword] = await Promise.all([
      contract.getDocumentContent(),
      contract.getDocumentPassword()
    ]);

    // 5. Decrypt FHE password
    const { decryptFHE } = await import("../ui/src/utils/fheDecrypt");
    const decryptedPasswordAddress = await decryptFHE(
      instance,
      await contract.getAddress(),
      encryptedPassword,
      signers.deployer.address,
      async (args: any) => await signers.deployer.signTypedData(args.domain, args.types, args.message)
    );

    // 6. Decrypt ChaCha20 content
    const retrievedBytes = ethers.toBeArray(retrievedContent);
    const retrievedNonce = retrievedBytes.slice(0, 12);
    const retrievedCiphertext = retrievedBytes.slice(12);

    const decryptionKey = deriveKeyFromPasswordAddress(decryptedPasswordAddress);
    const decryptedBytes = chacha20Decrypt(decryptionKey, retrievedNonce, retrievedCiphertext);
    const decryptedMessage = ethers.toUtf8String(decryptedBytes);

    // 7. Verify the round-trip worked
    expect(decryptedMessage).to.equal(testMessage);
    expect(decryptedPasswordAddress).to.equal(passwordAddress);
  });

  it("Should handle different message sizes correctly", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    const testMessages = [
      "Short",
      "A".repeat(100),
      "A".repeat(1000),
      "Unicode: 你好世界 🌍 Test with emojis 🚀"
    ];

    for (const testMessage of testMessages) {
      const messageBytes = ethers.toUtf8Bytes(testMessage);
      const passwordAddress = ethers.hexlify(ethers.randomBytes(20));

      // Encrypt
      const { chacha20Encrypt } = await import("../ui/src/utils/chacha20");
      const { deriveKeyFromPasswordAddress } = await import("../ui/src/utils/bytes");

      const key = deriveKeyFromPasswordAddress(passwordAddress);
      const nonce = ethers.toBeArray(ethers.randomBytes(12));
      const encryptedMessage = chacha20Encrypt(key, nonce, messageBytes);
      const fullEncryptedContent = ethers.concat([nonce, encryptedMessage]);

      // FHE encrypt password
      const input = instance.createEncryptedInput(await contract.getAddress(), signers.deployer.address);
      input.addAddress(passwordAddress);
      const encryptedInput = await input.encrypt();

      // Submit
      await contract.updateDocument(
        fullEncryptedContent,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );

      // Retrieve and decrypt
      const [retrievedContent, encryptedPassword] = await Promise.all([
        contract.getDocumentContent(),
        contract.getDocumentPassword()
      ]);

      const { decryptFHE } = await import("../ui/src/utils/fheDecrypt");
      const decryptedPasswordAddress = await decryptFHE(
        instance,
        await contract.getAddress(),
        encryptedPassword,
        signers.deployer.address,
        async (args: any) => await signers.deployer.signTypedData(args.domain, args.types, args.message)
      );

      const { chacha20Decrypt } = await import("../ui/src/utils/chacha20");
      const retrievedBytes = ethers.toBeArray(retrievedContent);
      const retrievedNonce = retrievedBytes.slice(0, 12);
      const retrievedCiphertext = retrievedBytes.slice(12);

      const decryptionKey = deriveKeyFromPasswordAddress(decryptedPasswordAddress);
      const decryptedBytes = chacha20Decrypt(decryptionKey, retrievedNonce, retrievedCiphertext);
      const decryptedMessage = ethers.toUtf8String(decryptedBytes);

      expect(decryptedMessage).to.equal(testMessage);
    }
  });

  it("Should maintain data integrity across multiple updates", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    const messages = ["First message", "Second message", "Third message"];

    for (let i = 0; i < messages.length; i++) {
      const testMessage = messages[i];
      const messageBytes = ethers.toUtf8Bytes(testMessage);
      const passwordAddress = ethers.hexlify(ethers.randomBytes(20));

      // Encrypt
      const { chacha20Encrypt } = await import("../ui/src/utils/chacha20");
      const { deriveKeyFromPasswordAddress } = await import("../ui/src/utils/bytes");

      const key = deriveKeyFromPasswordAddress(passwordAddress);
      const nonce = ethers.toBeArray(ethers.randomBytes(12));
      const encryptedMessage = chacha20Encrypt(key, nonce, messageBytes);
      const fullEncryptedContent = ethers.concat([nonce, encryptedMessage]);

      // FHE
      const input = instance.createEncryptedInput(await contract.getAddress(), signers.deployer.address);
      input.addAddress(passwordAddress);
      const encryptedInput = await input.encrypt();

      // Submit
      await contract.updateDocument(
        fullEncryptedContent,
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );

      // Verify current document
      const [retrievedContent, encryptedPassword] = await Promise.all([
        contract.getDocumentContent(),
        contract.getDocumentPassword()
      ]);

      const { decryptFHE } = await import("../ui/src/utils/fheDecrypt");
      const decryptedPasswordAddress = await decryptFHE(
        instance,
        await contract.getAddress(),
        encryptedPassword,
        signers.deployer.address,
        async (args: any) => await signers.deployer.signTypedData(args.domain, args.types, args.message)
      );

      const { chacha20Decrypt } = await import("../ui/src/utils/chacha20");
      const retrievedBytes = ethers.toBeArray(retrievedContent);
      const retrievedNonce = retrievedBytes.slice(0, 12);
      const retrievedCiphertext = retrievedBytes.slice(12);

      const decryptionKey = deriveKeyFromPasswordAddress(decryptedPasswordAddress);
      const decryptedBytes = chacha20Decrypt(decryptionKey, retrievedNonce, retrievedCiphertext);
      const decryptedMessage = ethers.toUtf8String(decryptedBytes);

      expect(decryptedMessage).to.equal(testMessage);
    }
  });

  it("Should reject invalid encrypted content", async function () {
    const { contract, signers } = await loadFixture(deployFHECipherNotes);

    const input = instance.createEncryptedInput(await contract.getAddress(), signers.deployer.address);
    input.addAddress("0x1234567890123456789012345678901234567890");
    const encryptedInput = await input.encrypt();

    // Test with empty content
    await expect(
      contract.updateDocument(
        "0x",
        encryptedInput.handles[0],
        encryptedInput.inputProof
      )
    ).to.be.revertedWith("Encrypted content must contain nonce and data");

    // Test with content too short
    await expect(
      contract.updateDocument(
        "0x1234567890",
        encryptedInput.handles[0],
        encryptedInput.inputProof
      )
    ).to.be.revertedWith("Encrypted content must contain nonce and data");
  });
});
