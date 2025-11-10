/**
 * Decrypt FHE encrypted data (data is publicly decryptable, using publicDecrypt)
 */
export async function decryptFHE(
  instance: any,
  contractAddress: string,
  encPassword: string,
  _userAddress: string,
  _signTypedDataFn: (args: any) => Promise<string>
): Promise<string> {
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
    return await instance.decrypt(contractAddress, encPassword);
  }
}
