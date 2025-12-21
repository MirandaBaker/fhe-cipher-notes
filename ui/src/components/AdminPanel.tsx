import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getContractAddress, CONTRACT_ABI } from '@/config/contracts';
import { useChainId } from 'wagmi';
import { Shield, RefreshCw } from 'lucide-react';

interface AuthorizedUser {
  address: string;
  canWrite: boolean;
  canDelete: boolean;
  canRead: boolean;
}

export function AdminPanel() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [userAddress, setUserAddress] = useState('');
  const [canWrite, setCanWrite] = useState(true);
  const [canDelete, setCanDelete] = useState(false);
  const [canRead, setCanRead] = useState(true);
  const [readAccessAddress, setReadAccessAddress] = useState('');
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const contractAddress = getContractAddress(chainId);

  const { data: adminAddress } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: 'getAdmin',
  });

  const isAdmin = address && adminAddress && address.toLowerCase() === adminAddress.toLowerCase();

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const loadAuthorizedUsers = useCallback(async () => {
    if (!address || !isAdmin) return;

    setLoadingUsers(true);
    try {
      // Query PermissionUpdated events
      const provider = (window as any).ethereum;
      if (!provider) return;

      const { createPublicClient, http } = await import('viem');
      const { hardhat, sepolia } = await import('wagmi/chains');
      const chain = chainId === 31337 || chainId === 1337 ? hardhat : sepolia;
      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      const events = await publicClient.getLogs({
        address: contractAddress,
        event: {
          type: 'event',
          name: 'PermissionUpdated',
          inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: false, name: 'canWrite', type: 'bool' },
            { indexed: false, name: 'canDelete', type: 'bool' },
          ],
        },
        fromBlock: 0n,
      });

      const userMap = new Map<string, AuthorizedUser>();
      for (const event of events) {
        if (event.args && event.args.user) {
          const userAddr = event.args.user as string;
          // Read current permissions from contract
          const [canWrite, canDelete, canRead] = await Promise.all([
            publicClient.readContract({
              address: contractAddress,
              abi: CONTRACT_ABI,
              functionName: 'canUserWrite',
              args: [userAddr],
            }),
            publicClient.readContract({
              address: contractAddress,
              abi: CONTRACT_ABI,
              functionName: 'canUserDelete',
              args: [userAddr],
            }),
            publicClient.readContract({
              address: contractAddress,
              abi: CONTRACT_ABI,
              functionName: 'canUserRead',
              args: [userAddr],
            }),
          ]);
          
          userMap.set(userAddr.toLowerCase(), {
            address: userAddr,
            canWrite: canWrite as boolean,
            canDelete: canDelete as boolean,
            canRead: canRead as boolean,
          });
        }
      }

      // Also check admin
      if (adminAddress) {
        userMap.set(adminAddress.toLowerCase(), {
          address: adminAddress,
          canWrite: true,
          canDelete: true,
          canRead: true,
        });
      }

      const users = Array.from(userMap.values());
      setAuthorizedUsers(users);
      setTotalUsers(users.length);
    } catch (error) {
      console.error('Failed to load authorized users:', error);
      } finally {
      setLoadingUsers(false);
    }
  }, [address, isAdmin, contractAddress, adminAddress, chainId]);

  useEffect(() => {
    loadAuthorizedUsers();
  }, [loadAuthorizedUsers]);

  const handleSetPermission = () => {
    if (!userAddress || !isAdmin) return;

    // Basic address validation
    if (!userAddress.startsWith('0x') || userAddress.length !== 42) {
      setLastAction('Invalid address format');
      return;
    }

    setLastAction(`Setting permissions for ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`);
      writeContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: 'setPermission',
        args: [userAddress as `0x${string}`, canWrite, canDelete, canRead],
      });
  };

  useEffect(() => {
    if (isSuccess) {
      setUserAddress('');
      setReadAccessAddress('');
      loadAuthorizedUsers();
    }
  }, [isSuccess, loadAuthorizedUsers]);

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Admin Panel</CardTitle>
          </div>
        <CardDescription>Manage user permissions for reading, editing, and deleting</CardDescription>
        {lastAction && (
          <p className="text-xs text-muted-foreground mt-1">
            Last action: {lastAction}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
            <div className="space-y-2">
            <label className="text-sm font-medium">User Address</label>
              <Input
              placeholder="0x..."
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
              />
            </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={canWrite}
                  onChange={(e) => setCanWrite(e.target.checked)}
                className="rounded"
                />
              <span className="text-sm">Can Write</span>
            </label>
            <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={canDelete}
                  onChange={(e) => setCanDelete(e.target.checked)}
                className="rounded"
                />
              <span className="text-sm">Can Delete</span>
            </label>
            <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={canRead}
                  onChange={(e) => setCanRead(e.target.checked)}
                className="rounded"
                />
              <span className="text-sm">Can Read</span>
            </label>
              </div>
          <Button
            onClick={handleSetPermission}
            disabled={!userAddress || isPending || isConfirming}
            className="w-full"
          >
            {isPending || isConfirming ? 'Processing...' : 'Set Permission'}
          </Button>
            </div>

        <div className="border-t pt-4 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Quick Grant Read Access</h3>
            <div className="flex gap-2">
              <Input
                placeholder="0x... (user address)"
                value={readAccessAddress}
                onChange={(e) => setReadAccessAddress(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (!readAccessAddress || !isAdmin) return;
                  if (!readAccessAddress.startsWith('0x') || readAccessAddress.length !== 42) {
                    setLastAction('Invalid address format');
                    return;
                  }
                  setLastAction(`Granting read access to ${readAccessAddress.slice(0, 6)}...${readAccessAddress.slice(-4)}`);
                  writeContract({
                    address: contractAddress,
                    abi: CONTRACT_ABI,
                    functionName: 'grantReadAccess',
                    args: [readAccessAddress as `0x${string}`],
                  });
                }}
                disabled={!readAccessAddress || isPending || isConfirming}
                variant="outline"
              >
                Grant Read
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Authorized Users ({totalUsers})</h3>
            <Button variant="outline" size="sm" onClick={loadAuthorizedUsers} disabled={loadingUsers}>
              <RefreshCw className={`h-4 w-4 ${loadingUsers ? 'animate-spin' : ''}`} />
              </Button>
          </div>
          {loadingUsers ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : authorizedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No authorized users yet</p>
          ) : (
            <div className="space-y-2">
              {authorizedUsers.map((user) => (
                <div
                  key={user.address}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <p className="font-mono text-xs">{user.address}</p>
                    <div className="mt-1 flex gap-2">
                      {user.canRead && (
                        <span className="rounded bg-primary/20 px-2 py-0.5 text-xs text-primary font-medium">Read</span>
                      )}
                      {user.canWrite && (
                        <span className="rounded bg-primary/20 px-2 py-0.5 text-xs text-primary font-medium">Write</span>
                      )}
                      {user.canDelete && (
                        <span className="rounded bg-destructive/20 px-2 py-0.5 text-xs text-destructive font-medium">Delete</span>
                )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
