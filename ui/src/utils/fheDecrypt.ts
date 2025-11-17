/**
 * Decrypt FHE encrypted data with enhanced error handling and retry logic
 * Supports both publicDecrypt (for publicly decryptable data) and decrypt methods
 */

// Helper function for retry logic
async function retryWithDelay<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries) throw error;
      console.warn(`FHE decryption attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
interface FHEInstance {
  decrypt?: (contractAddress: string, encryptedData: string) => Promise<string>;
  publicDecrypt?: (handles: string[]) => Promise<string | string[] | { [key: string]: string }>;
}

interface SignTypedDataFunction {
  (args: {
    domain: any;
    types: any;
    message: any;
  }): Promise<string>;
}

export async function decryptFHE(
  instance: FHEInstance,
  contractAddress: string,
  encPassword: string,
  _userAddress: string,
  _signTypedDataFn: SignTypedDataFunction
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
  // Check if it's a mock instance (no decrypt method)
  if (!instance.decrypt || typeof instance.decrypt !== 'function') {
    // Use publicDecrypt (data is publicly decryptable)
    if (instance.publicDecrypt && typeof instance.publicDecrypt === 'function') {
      try {
        console.log('Attempting publicDecrypt for:', encPassword);
        const publicResult = await instance.publicDecrypt([encPassword]);
        console.log('Public decryption result:', publicResult);

        // Handle different return formats
        if (publicResult) {
          // If it's an object, find the corresponding value
          if (typeof publicResult === 'object' && !Array.isArray(publicResult)) {
            const value = publicResult[encPassword];
            if (value !== undefined && value !== null) {
              console.log('Public decryption successful');
              return value.toString();
            }
          }
          // If it's an array, take the first element
          if (Array.isArray(publicResult) && publicResult.length > 0) {
            console.log('Public decryption successful');
            return publicResult[0].toString();
          }
        }
        throw new Error('Public decryption returned empty result');
      } catch (e: any) {
        console.error('Public decryption failed:', e);
        throw new Error(`Failed to decrypt public data: ${e?.message || 'Unknown error'}`);
      }
    } else {
      throw new Error('publicDecrypt method not available');
    }
  } else {
    // Use simple decrypt method (if exists)
    return await retryWithDelay(() => instance.decrypt(contractAddress, encPassword));
  }
}
