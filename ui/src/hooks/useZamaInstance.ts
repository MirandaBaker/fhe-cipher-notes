import { useState, useEffect } from 'react';
import { createInstance, initSDK, SepoliaConfig } from '@zama-fhe/relayer-sdk/bundle';
import { useChainId } from 'wagmi';
import { JsonRpcProvider } from 'ethers';

// Detect if it's a FHEVM Hardhat Node
async function getWeb3Client(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    const version = await rpc.send("web3_clientVersion", []);
    return version;
  } catch (e) {
    throw new Error(`The URL ${rpcUrl} is not a Web3 node or is not reachable.`);
  } finally {
    rpc.destroy();
  }
}

async function getFHEVMRelayerMetadata(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    const metadata = await rpc.send("fhevm_relayer_metadata", []);
    return metadata;
  } catch (e) {
    throw new Error(`The URL ${rpcUrl} is not a FHEVM Hardhat node or is not reachable.`);
  } finally {
    rpc.destroy();
  }
}

async function tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl: string): Promise<
  | {
      ACLAddress: `0x${string}`;
      InputVerifierAddress: `0x${string}`;
      KMSVerifierAddress: `0x${string}`;
    }
  | undefined
> {
  try {
    const version = await getWeb3Client(rpcUrl);
    if (
      typeof version !== "string" ||
      !version.toLowerCase().includes("hardhat")
    ) {
      // Not a Hardhat Node
      return undefined;
    }
    
    const metadata = await getFHEVMRelayerMetadata(rpcUrl);
    if (!metadata || typeof metadata !== "object") {
      return undefined;
    }
    
    if (
      !(
        "ACLAddress" in metadata &&
        typeof metadata.ACLAddress === "string" &&
        metadata.ACLAddress.startsWith("0x")
      )
    ) {
      return undefined;
    }
    if (
      !(
        "InputVerifierAddress" in metadata &&
        typeof metadata.InputVerifierAddress === "string" &&
        metadata.InputVerifierAddress.startsWith("0x")
      )
    ) {
      return undefined;
    }
    if (
      !(
        "KMSVerifierAddress" in metadata &&
        typeof metadata.KMSVerifierAddress === "string" &&
        metadata.KMSVerifierAddress.startsWith("0x")
      )
    ) {
      return undefined;
    }
    return metadata as {
      ACLAddress: `0x${string}`;
      InputVerifierAddress: `0x${string}`;
      KMSVerifierAddress: `0x${string}`;
    };
  } catch {
    // Not a FHEVM Hardhat Node
    return undefined;
  }
}

export function useZamaInstance() {
  const [instance, setInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();

  useEffect(() => {
    let mounted = true;

    const initZama = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if it's a local Hardhat network
        if (chainId === 31337 || chainId === 1337) {
          const rpcUrl = "http://localhost:8545";
          
          // Try to detect if it's a FHEVM Hardhat Node
          console.log('Checking for FHEVM Hardhat Node...');
          const fhevmRelayerMetadata = await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl);
          
          if (fhevmRelayerMetadata) {
            // Use mock mode, no need to connect to remote relayer!
            console.log('FHEVM Hardhat Node detected, using mock mode');
            console.log('Metadata:', fhevmRelayerMetadata);
            
            // Dynamically import mock module (avoid including in production bundle)
            const { fhevmMockCreateInstance } = await import('./fhevmMock');
            const mockInstance = await fhevmMockCreateInstance({
              rpcUrl,
              chainId,
              metadata: fhevmRelayerMetadata,
            });
            
            if (mounted) {
              setInstance(mockInstance);
            }
            return;
          }
          
          // If not a FHEVM Hardhat Node, continue with standard approach
          console.log('Standard Hardhat Node detected, using relayer');
        }
        
        // Standard initialization flow (requires relayer connection)
        console.log('Initializing Zama SDK...');
        await initSDK();
        console.log('Zama SDK initialized successfully');

        let config;
        if (chainId === 31337 || chainId === 1337) {
          // Localhost/Hardhat configuration
          const ethereum = (window as any).ethereum;
          config = {
            aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
            kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
            inputVerifierContractAddress: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
            verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
            verifyingContractAddressInputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
            chainId: 31337,
            gatewayChainId: 55815,
            network: ethereum || "http://localhost:8545",
            relayerUrl: "https://relayer.testnet.zama.cloud",
          };
        } else {
          // Use Sepolia config for other networks
          config = SepoliaConfig;
        }

        console.log('Creating Zama instance with config:', { ...config, network: '[Ethereum Provider]' });
        const zamaInstance = await createInstance(config);
        console.log('Zama instance created successfully');

        if (mounted) {
          setInstance(zamaInstance);
        }
      } catch (err: any) {
        console.error('Failed to initialize Zama instance:', err);
        console.error('Error details:', {
          message: err?.message,
          stack: err?.stack,
          name: err?.name,
        });
        
        if (mounted) {
          // Provide more detailed error information
          let errorMessage = 'Failed to initialize encryption service';
          
          if (err?.message) {
            if (err.message.includes('Relayer') || err.message.includes('relayer')) {
              errorMessage = 'Unable to connect to Zama Relayer service. Please check your network connection or use a VPN.';
            } else if (err.message.includes('initSDK') || err.message.includes('WASM')) {
              errorMessage = 'Zama SDK initialization failed. This might be a WASM loading issue, please refresh the page and try again.';
            } else {
              errorMessage = `Initialization failed: ${err.message}`;
            }
          }
          
          setError(errorMessage);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initZama();

    return () => {
      mounted = false;
    };
  }, [chainId]);

  return { instance, isLoading, error };
}
