import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHECipherNotes = await deploy("FHECipherNotes", {
    from: deployer,
    log: true,
  });

  console.log(`FHECipherNotes contract: `, deployedFHECipherNotes.address);
};
export default func;
func.id = "deploy_fheciphernotes"; // id required to prevent reexecution
func.tags = ["FHECipherNotes"];

