import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignTypedData } from 'wagmi';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getContractAddress, CONTRACT_ABI } from '@/config/contracts';
import { useChainId } from 'wagmi';
import { useZamaInstance } from '@/hooks/useZamaInstance';
import { chacha20Encrypt, chacha20Decrypt } from '@/utils/chacha20';
import { utf8ToBytes, bytesToHex, randomBytes, concatBytes, hexToBytes, bytesToUtf8 } from '@/utils/bytes';
import { keccak256, toUtf8Bytes } from 'ethers';
import { decryptFHE } from '@/utils/fheDecrypt';

// Basic edit dialog component for collaborative document editing

interface AddEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEditDialog({ open, onOpenChange }: AddEditDialogProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const { signTypedDataAsync } = useSignTypedData();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCurrentDocument, setIsLoadingCurrentDocument] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const contractAddress = getContractAddress(chainId);

  const { data: canWrite } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: 'canUserWrite',
    args: address ? [address] : undefined,
  });

  const { data: documentMeta } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI as any,
    functionName: 'getDocumentMeta',
  });

  // Load current document when dialog opens
  useEffect(() => {
    if (open && instance && address && documentMeta && Array.isArray(documentMeta) && documentMeta[2]) {
      loadCurrentDocument();
    } else if (open) {
      setContent('');
      setCharCount(0);
    }
  }, [open, instance, address, documentMeta]);

  // Update character count when content changes
  useEffect(() => {
    setCharCount(content.length);
  }, [content]);

  const loadCurrentDocument = async () => {
    if (!instance || !address || !documentMeta || !Array.isArray(documentMeta) || !documentMeta[2]) {
      setContent('');
      return;
    }

    setIsLoadingCurrentDocument(true);
    try {
      const provider = (window as any).ethereum;
      if (!provider) return;

      const { createPublicClient, http } = await import('viem');
      const { hardhat, sepolia } = await import('wagmi/chains');
      const chain = chainId === 31337 || chainId === 1337 ? hardhat : sepolia;
      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      // Load current document only (single document, not array)
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

      // Direct decryption (password is publicly decryptable, all users can decrypt)
      const decryptedPasswordAddress = await decryptFHE(
        instance,
        contractAddress,
        encPassword as string,
        address,
        signTypedDataAsync
      );
      console.log('AddEditDialog: Decrypted password:', decryptedPasswordAddress);
      
      // Decrypt content (ChaCha20)
      const encryptedContent = hexToBytes(encryptedContentHex as string);
      const nonce = encryptedContent.slice(0, 12);
      const ciphertext = encryptedContent.slice(12);
      const key = deriveKeyFromPasswordAddress(decryptedPasswordAddress);
      const decryptedBytes = chacha20Decrypt(key, nonce, ciphertext);
      const decrypted = bytesToUtf8(decryptedBytes);
      
      setContent(decrypted);
      console.log('AddEditDialog: Loaded current document:', decrypted);
    } catch (error) {
      console.error('Failed to load current document:', error);
      setError('Failed to load current document');
    } finally {
      setIsLoadingCurrentDocument(false);
    }
  };

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });


  // Handle writeContract errors
  useEffect(() => {
    if (writeError) {
      console.error('Write contract error:', writeError);
      setError(writeError.message || 'Transaction failed. Please try again.');
      setIsSubmitting(false);
    }
  }, [writeError]);

  // Handle transaction success
  useEffect(() => {
    if (isSuccess) {
      console.log('AddEditDialog: Transaction successful, closing dialog');
      setContent('');
      setError(null);
      setIsSubmitting(false);
      onOpenChange(false);
      
      // Trigger global event to notify EditList to refresh
      window.dispatchEvent(new CustomEvent('documentUpdated'));
    }
  }, [isSuccess, onOpenChange]);

  const deriveKeyFromPasswordAddress = (passwordAddress: string): Uint8Array => {
    const hash = keccak256(toUtf8Bytes(passwordAddress.toLowerCase()));
    const key = new Uint8Array(32);
    for (let i = 0; i < 32; i++) key[i] = parseInt(hash.slice(2 + i * 2, 4 + i * 2), 16);
    return key;
  };

  const generateRandomAddress = (): string => {
    const bytes = randomBytes(20);
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async () => {
    if (!instance || !address || !content.trim()) {
      setError('Please fill in the content');
      return;
    }

    if (content.length < 10) {
      setError('Content must be at least 10 characters long');
      return;
    }

    if (content.length > 10000) {
      setError('Content must be less than 10,000 characters');
      return;
    }

    if (!canWrite) {
      setError('You do not have permission to edit');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Starting to add edit...');

      // Placeholder - encryption logic removed during development
      console.log('Content processing placeholder...');
    } catch (error: any) {
      console.error('Failed to add edit:', error);
      setError(error?.message || 'Failed to add edit. Please try again.');
      setIsSubmitting(false);
    }
    // Note: Don't set setIsSubmitting(false) here, because writeContract is async
    // Errors are handled via writeError, success is handled via isSuccess
  };

  const validateContent = (text: string): string | null => {
    if (!text.trim()) return 'Content cannot be empty';
    if (text.length < 10) return 'Content must be at least 10 characters';
    if (text.length > 10000) return 'Content must be less than 10,000 characters';
    return null;
  };

  const canSubmit = instance && address && content.trim() && canWrite && !isPending && !isConfirming && !isSubmitting && content.length >= 10 && content.length <= 10000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Edit</DialogTitle>
          <DialogDescription>
            {zamaError ? (
              <span className="text-destructive">Encryption service error: {zamaError}</span>
            ) : zamaLoading ? (
              'Initializing encryption service...'
            ) : !instance ? (
              <span className="text-destructive">Encryption service not available</span>
            ) : !canWrite ? (
              'You do not have permission to edit. Contact the admin.'
            ) : (
              'Add a new encrypted edit to the document'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <Textarea
              placeholder="Enter your edit content..."
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setError(null);
              }}
              disabled={!canWrite || !instance || isPending || isConfirming || isSubmitting || isLoadingCurrentDocument}
              rows={6}
            />
            <div className="text-xs text-muted-foreground text-right mt-1">
              {charCount} characters
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setContent('');
            setError(null);
            onOpenChange(false);
          }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending || isConfirming || isSubmitting ? 'Processing...' : 'Add Edit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

