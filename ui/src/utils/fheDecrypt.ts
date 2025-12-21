/**
 * Decrypt FHE encrypted data using userDecrypt (requires user signature and ACL permission)
 * This method requires the user to have been granted read access by the admin
 */

interface FHEInstance {
  generateKeypair?: () => { privateKey: string; publicKey: string };
  createEIP712?: (
    publicKey: string,
    contractAddresses: string[],
    startTimeStamp: string,
    durationDays: string
  ) => {
    domain: any;
    types: any;
    message: any;
    primaryType: string;
  };
  userDecrypt?: (
    handleContractPairs: Array<{ handle: string; contractAddress: string }>,
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: string[],
    userAddress: string,
    startTimeStamp: string,
    durationDays: string
  ) => Promise<Record<string, any>>;
  publicDecrypt?: (handles: string[]) => Promise<string | string[] | { [key: string]: string }>;
}

interface SignTypedDataFunction {
  (args: {
    domain: any;
    types: any;
    primaryType?: string;
    message: any;
  }): Promise<string>;
}

export async function decryptFHE(
  instance: FHEInstance,
  contractAddress: string,
  encPassword: string,
  userAddress: string,
  signTypedDataFn: SignTypedDataFunction
): Promise<string> {
  // Enhanced input validation
  if (!instance) {
    throw new Error('FHE instance is required for decryption');
  }
  if (!contractAddress || typeof contractAddress !== 'string') {
    throw new Error('Valid contract address is required');
  }
  if (!encPassword || typeof encPassword !== 'string') {
    throw new Error('Encrypted password handle is required');
  }
  if (!userAddress || typeof userAddress !== 'string') {
    throw new Error('User address is required for decryption');
  }
  if (!signTypedDataFn || typeof signTypedDataFn !== 'function') {
    throw new Error('Sign function is required for user decryption');
  }

  // Check if instance has userDecrypt method
  if (!instance.userDecrypt || typeof instance.userDecrypt !== 'function') {
    // Fallback to publicDecrypt if available (for backward compatibility)
    if (instance.publicDecrypt && typeof instance.publicDecrypt === 'function') {
      console.warn('userDecrypt not available, falling back to publicDecrypt');
      try {
        const publicResult = await instance.publicDecrypt([encPassword]);
        if (publicResult) {
          if (typeof publicResult === 'object' && !Array.isArray(publicResult)) {
            const value = publicResult[encPassword];
            if (value !== undefined && value !== null) {
              return value.toString();
            }
          }
          if (Array.isArray(publicResult) && publicResult.length > 0) {
            return publicResult[0].toString();
          }
        }
        throw new Error('Public decryption returned empty result');
      } catch (e: any) {
        throw new Error(`Failed to decrypt: ${e?.message || 'Unknown error'}`);
      }
    } else {
      throw new Error('userDecrypt method not available on FHE instance');
    }
  }

  // Use userDecrypt (requires signature and ACL permission)
  try {
    console.log('Starting userDecrypt for:', encPassword);
    
    // 1. Generate keypair for user decryption
    if (!instance.generateKeypair || typeof instance.generateKeypair !== 'function') {
      throw new Error('generateKeypair method not available');
    }
    const keypair = instance.generateKeypair();
    console.log('Generated keypair for decryption');

    // 2. Prepare handle-contract pairs
    const handleContractPairs = [{
      handle: encPassword,
      contractAddress: contractAddress,
    }];

    // 3. Set up decryption parameters
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "7"; // 7 days validity
    const contractAddresses = [contractAddress];

    // 4. Create EIP712 signature data
    if (!instance.createEIP712 || typeof instance.createEIP712 !== 'function') {
      throw new Error('createEIP712 method not available');
    }
    const eip712 = instance.createEIP712(
      keypair.publicKey,
      contractAddresses,
      startTimeStamp,
      durationDays
    );
    console.log('Created EIP712 data for signature');

    // 5. Request MetaMask signature (this will pop up MetaMask)
    console.log('Requesting MetaMask signature for decryption...');
    const signature = await signTypedDataFn({
      domain: eip712.domain,
      types: {
        UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
      },
      primaryType: 'UserDecryptRequestVerification',
      message: eip712.message,
    });
    console.log('Received signature from MetaMask');

    // 6. Remove 0x prefix from signature
    const cleanSignature = signature.startsWith('0x') 
      ? signature.slice(2) 
      : signature;

    // 7. Call userDecrypt (requires ACL permission granted by admin)
    console.log('Calling userDecrypt...');
    const result = await instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      cleanSignature,
      contractAddresses,
      userAddress,
      startTimeStamp,
      durationDays,
    );

    // 8. Extract decrypted value
    const decryptedValue = result[encPassword];
    if (decryptedValue !== undefined && decryptedValue !== null) {
      console.log('User decryption successful');
      return decryptedValue.toString();
    }
    
    throw new Error('User decryption returned empty result. Make sure you have read permission granted by admin.');
  } catch (e: any) {
    console.error('User decryption failed:', e);
    
    // Provide more helpful error messages
    if (e?.message?.includes('permission') || e?.message?.includes('ACL') || e?.message?.includes('access')) {
      throw new Error('You do not have read permission. Please contact the admin to grant you access.');
    }
    if (e?.message?.includes('signature') || e?.message?.includes('sign')) {
      throw new Error('Signature failed. Please try again.');
    }
    if (e?.message?.includes('user rejected') || e?.message?.includes('denied')) {
      throw new Error('Signature request was rejected. Please approve the signature to decrypt.');
    }
    
    throw new Error(`Decryption failed: ${e?.message || 'Unknown error'}`);
  }
}
