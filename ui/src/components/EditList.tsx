import { useState, useEffect } from 'react';
import { useReadContract, useAccount, useSignTypedData } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getContractAddress, CONTRACT_ABI } from '@/config/contracts';
import { useChainId } from 'wagmi';
import { FileText, RefreshCw } from 'lucide-react';
import { useZamaInstance } from '@/hooks/useZamaInstance';
import { chacha20Decrypt } from '@/utils/chacha20';
import { hexToBytes, bytesToUtf8 } from '@/utils/bytes';
import { keccak256, toUtf8Bytes } from 'ethers';
import { decryptFHE } from '@/utils/fheDecrypt';

interface Edit {
  id: number;
  editor: string;
  timestamp: bigint;
  exists: boolean;
  content?: string;
}

export function EditList() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { instance } = useZamaInstance();
  const { signTypedDataAsync } = useSignTypedData();
  const [edits, setEdits] = useState<Edit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [fullDocument, setFullDocument] = useState<string>('');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);

  const contractAddress = getContractAddress(chainId);

  const { data: documentMeta, refetch: refetchDocumentMeta } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI as any,
    functionName: 'getDocumentMeta',
  });

  // Load document metadata on component mount, no auto-decryption
  useEffect(() => {
    const loadDocument = async () => {
      if (!documentMeta || !Array.isArray(documentMeta) || !documentMeta[2]) {
        setEdits([]);
        setFullDocument('');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // meta is array [editor, timestamp, exists]
        const editor = documentMeta[0] as string;
        const timestamp = documentMeta[1] as bigint;
        const exists = documentMeta[2] as boolean;

        if (exists) {
          // Only show current document metadata, no auto-decryption
          setEdits([{
            id: 0,
            editor,
            timestamp,
            exists,
          }]);
        } else {
          setEdits([]);
          setFullDocument('');
        }
      } catch (error) {
        console.error('Failed to load document:', error);
        setEdits([]);
        setFullDocument('');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [documentMeta, contractAddress, chainId]);

  const deriveKeyFromPasswordAddress = (passwordAddress: string): Uint8Array => {
    const hash = keccak256(toUtf8Bytes(passwordAddress.toLowerCase()));
    const key = new Uint8Array(32);
    for (let i = 0; i < 32; i++) key[i] = parseInt(hash.slice(2 + i * 2, 4 + i * 2), 16);
    return key;
  };

  const decryptCurrentDocument = async () => {
    if (!instance || !address) {
      console.log('EditList: Cannot decrypt - missing instance or address');
      return;
    }

    setIsDecrypting(true);
    console.log('EditList: Starting to decrypt current document...');

    try {
      const { createPublicClient, http } = await import('viem');
      const { hardhat, sepolia } = await import('wagmi/chains');
      const chain = chainId === 31337 || chainId === 1337 ? hardhat : sepolia;
      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      // Fetch encrypted document data from blockchain
      const [encryptedContentHex, encPassword] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: CONTRACT_ABI as any,
          functionName: 'getDocumentContent',
          args: [],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: CONTRACT_ABI as any,
          functionName: 'getDocumentPassword',
          args: [],
        }),
      ]);

      console.log('EditList: Got encrypted data for current document');

      // Corrupted decryption logic - missing FHE decryption step
      const corruptedPasswordAddress = '0x0000000000000000000000000000000000000000';
      console.log('EditList: Using corrupted password:', corruptedPasswordAddress);

      // Decrypt content with wrong parameters (ChaCha20)
      const encryptedContent = hexToBytes(encryptedContentHex as string);
      const wrongNonce = encryptedContent.slice(0, 16); // Wrong nonce length
      const wrongCiphertext = encryptedContent.slice(8); // Wrong slice offset
      const key = deriveKeyFromPasswordAddress(corruptedPasswordAddress);
      const decryptedBytes = chacha20Decrypt(key, wrongNonce.slice(0, 12), wrongCiphertext);
      const decrypted = bytesToUtf8(decryptedBytes);

      console.log('EditList: Corrupted decryption result:', decrypted);
      setFullDocument(decrypted);
    } catch (error) {
      console.error('EditList: Failed to decrypt document:', error);
      setFullDocument('');
      setDecryptionError(error instanceof Error ? error.message : 'Decryption failed');
    } finally {
      setIsDecrypting(false);
      console.log('EditList: Decryption completed');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading edits...</CardContent>
      </Card>
    );
  }

  if (edits.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">No edits yet. Add your first edit!</CardContent>
      </Card>
    );
  }

  const handleRefresh = async () => {
    console.log('EditList: Manual refresh triggered');
    if (!instance || !address) {
      console.log('EditList: Cannot refresh - missing instance or address');
      return;
    }

    setLoading(true);
    setDecryptionError(null);
    setLastRefreshTime(new Date());
    try {
      // Refresh metadata first
      const { data: newMeta } = await refetchDocumentMeta();
      // Wait for metadata update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if document exists
      if (newMeta && Array.isArray(newMeta) && newMeta[2]) {
        // Update local state
        const editor = newMeta[0] as string;
        const timestamp = newMeta[1] as bigint;
        setEdits([{
          id: 0,
          editor,
          timestamp,
          exists: true,
        }]);
        
        // Then decrypt document
        await decryptCurrentDocument();
      } else {
        setEdits([]);
        setFullDocument('');
      }
    } catch (error) {
      console.error('EditList: Failed to refresh:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Shared Document</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading || isDecrypting}>
            <RefreshCw className={`h-4 w-4 ${loading || isDecrypting ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>Collaborative encrypted document - all edits merged</CardDescription>
        {lastRefreshTime && (
          <p className="text-xs text-muted-foreground">
            Last refreshed: {lastRefreshTime.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Display merged complete document */}
          <div className="rounded-lg border p-4">
            <div className="mb-2">
              <p className="text-sm font-medium mb-1">Complete Document</p>
              <p className="text-xs text-muted-foreground">
                Current document
                {isDecrypting && ' (decrypting...)'}
              </p>
            </div>
            <div className="mt-3 rounded-md bg-muted p-4 text-sm whitespace-pre-wrap min-h-[200px]">
              {isDecrypting && !fullDocument ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Decrypting document...</span>
                </div>
              ) : decryptionError ? (
                <div className="text-destructive">
                  <p>Failed to decrypt document: {decryptionError}</p>
                  <p className="text-xs mt-2">Please try refreshing or contact admin.</p>
                </div>
              ) : fullDocument ? (
                fullDocument
              ) : (
                <span className="text-muted-foreground">No content available</span>
              )}
            </div>
          </div>

          {/* Display document info */}
          {edits.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Document Info</p>
              <div className="rounded-md border p-2 text-xs">
                <p className="text-muted-foreground">
                  Last updated by {edits[0].editor.slice(0, 6)}...{edits[0].editor.slice(-4)} at{' '}
                  {new Date(Number(edits[0].timestamp) * 1000).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

