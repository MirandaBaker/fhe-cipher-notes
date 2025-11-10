import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { FHECipherNotes } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

describe("FHECipherNotesSepolia", function () {
  let signers: Signers;
  let contract: FHECipherNotes;
  let contractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const FHECipherNotesDeployment = await deployments.get("FHECipherNotes");
      contractAddress = FHECipherNotesDeployment.address;
      contract = await ethers.getContractAt("FHECipherNotes", FHECipherNotesDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("complete workflow: grant permission -> edit document -> decrypt document", async function () {
    steps = 15;
    this.timeout(4 * 60000);

    // Step 1: Admin grants write permission to alice
    progress("Admin granting write permission to alice...");
    let tx = await contract
      .connect(signers.deployer)
      .setPermission(signers.alice.address, true, false);
    await tx.wait();
    progress("Permission granted");

    // Step 2: Check permission
    progress("Checking alice's write permission...");
    const canWrite = await contract.canUserWrite(signers.alice.address);
    expect(canWrite).to.be.true;
    progress("Alice has write permission");

    // Step 3: Generate password and encrypt content
    progress("Generating password and encrypting content...");
    const wallet = ethers.Wallet.createRandom();
    const passwordAddress = wallet.address;
    progress(`Password address: ${passwordAddress}`);

    const enc = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .addAddress(passwordAddress)
      .encrypt();

    const encryptedContent = ethers.toUtf8Bytes("Test edit content from Sepolia");
    progress("Content encrypted");

    // Step 4: Alice adds edit
    progress("Alice adding edit to document...");
    tx = await contract
      .connect(signers.alice)
      .addEdit(encryptedContent, enc.handles[0], enc.inputProof);
    await tx.wait();
    progress("Edit added");

    // Step 5: Verify edit was added
    progress("Verifying edit was added...");
    const editCount = await contract.getEditCount();
    expect(editCount).to.eq(1);
    progress(`Edit count: ${editCount}`);

    const [editor, timestamp, exists] = await contract.getEditMeta(0);
    expect(editor).to.eq(signers.alice.address);
    expect(exists).to.be.true;
    progress("Edit metadata verified");

    // Step 6: Get encrypted password for decryption
    progress("Getting encrypted password from contract...");
    const encPasswordHandle = await contract.getEditPassword(0);
    progress("Encrypted password retrieved");

    // Step 7: Decrypt password (simulated - in real app this is done client-side)
    progress("Decrypting password...");
    const decryptedPassword = await fhevm.userDecryptEaddress(
      encPasswordHandle,
      contractAddress,
      signers.alice,
    );
    expect(decryptedPassword.toLowerCase()).to.eq(passwordAddress.toLowerCase());
    progress(`Password decrypted: ${decryptedPassword}`);

    // Step 8: Get encrypted content
    progress("Getting encrypted content...");
    const content = await contract.getEditContent(0);
    expect(content.length).to.be.gt(0);
    progress("Encrypted content retrieved");

    progress("Test completed successfully!");
  });
});

