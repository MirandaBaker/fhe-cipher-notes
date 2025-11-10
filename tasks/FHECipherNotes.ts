import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("notes:address", "Get the FHECipherNotes contract address").setAction(
  async (_args: TaskArguments, hre) => {
    const { deployments } = hre as any;
    const d = await deployments.get("FHECipherNotes");
    console.log("FHECipherNotes:", d.address);
  }
);

task("notes:grant", "Grant permissions to a user")
  .addParam("user", "User address")
  .addParam("write", "Can write (true/false)")
  .addParam("delete", "Can delete (true/false)")
  .setAction(async (args: TaskArguments, hre) => {
    const { deployments, ethers } = hre as any;
    const [signer] = await ethers.getSigners();

    const d = await deployments.get("FHECipherNotes");
    const contract = await ethers.getContractAt("FHECipherNotes", d.address);

    const canWrite = args.write === "true";
    const canDelete = args.delete === "true";

    const tx = await contract
      .connect(signer)
      .setPermission(args.user, canWrite, canDelete);
    console.log("tx:", tx.hash);
    await tx.wait();
    console.log(`Permissions updated for ${args.user}: write=${canWrite}, delete=${canDelete}`);
  });

task("notes:count", "Get the total number of edits").setAction(
  async (_args: TaskArguments, hre) => {
    const { deployments, ethers } = hre as any;
    const d = await deployments.get("FHECipherNotes");
    const contract = await ethers.getContractAt("FHECipherNotes", d.address);

    const count = await contract.getEditCount();
    console.log("Total edits:", count.toString());
  }
);

