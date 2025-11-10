import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Shield, Edit, Eye, Lock, RefreshCw } from 'lucide-react';

export function GuidePanel() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <CardTitle>User Guide</CardTitle>
        </div>
        <CardDescription>Learn how to use FHE Cipher Notes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Overview</h3>
          <p className="text-sm text-muted-foreground mb-4">
            FHE Cipher Notes is a collaborative encrypted document editing platform that uses Fully Homomorphic Encryption (FHE) 
            to ensure complete privacy. All edits are encrypted on-chain, and only authorized users can modify the document.
          </p>
        </div>

        {/* Features */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Features</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Read Permission (All Users)</h4>
                <p className="text-sm text-muted-foreground">
                  Every user can decrypt and view the latest document content. The document is publicly decryptable, 
                  so no special permissions are needed to read.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Edit className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Write Permission (Authorized Only)</h4>
                <p className="text-sm text-muted-foreground">
                  Only users granted write permission by the admin can edit the document. Contact the admin to request access.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Admin Controls</h4>
                <p className="text-sm text-muted-foreground">
                  Admins can grant or revoke write and delete permissions for any user through the Admin Panel.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-medium">FHE Encryption</h4>
                <p className="text-sm text-muted-foreground">
                  All document content is encrypted using ChaCha20, and encryption keys are protected with Zama's FHE technology 
                  for maximum security.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How to Use */}
        <div>
          <h3 className="text-lg font-semibold mb-3">How to Use</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Connect Your Wallet</h4>
              <p className="text-sm text-muted-foreground">
                Click the "Connect Wallet" button in the header to connect your MetaMask or Rainbow wallet. 
                Make sure you're connected to the correct network (Hardhat local or Sepolia testnet).
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. View Document</h4>
              <p className="text-sm text-muted-foreground">
                Once connected, you can view the current document. Click the refresh button to decrypt and view the latest content. 
                All users have read access by default.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. Edit Document (Authorized Users Only)</h4>
              <p className="text-sm text-muted-foreground">
                If you have write permission, click the "Add Edit" button to contribute to the document. 
                Your edit will be encrypted and stored on-chain. The document will be updated with your changes.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">4. Admin Functions</h4>
              <p className="text-sm text-muted-foreground">
                If you're the admin, you'll see an Admin Panel where you can manage user permissions. 
                Enter a user address and grant write/delete permissions as needed.
              </p>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Technical Details</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              • <strong>Encryption:</strong> Document content is encrypted using ChaCha20 symmetric encryption
            </p>
            <p>
              • <strong>Key Management:</strong> Encryption keys are protected using Zama's FHE technology
            </p>
            <p>
              • <strong>Storage:</strong> All encrypted data is stored on-chain for transparency and verifiability
            </p>
            <p>
              • <strong>Decryption:</strong> The document password is publicly decryptable, allowing all users to read the content
            </p>
            <p>
              • <strong>Network:</strong> Supports both Hardhat local network (chainId: 31337) and Sepolia testnet (chainId: 11155111)
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-lg font-semibold mb-2 text-blue-900">Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <RefreshCw className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Click the refresh button to decrypt and view the latest document content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>If you don't have write permission, contact the admin to request access</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>Make sure your wallet is connected to the correct network before interacting with the contract</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>All edits are permanent and stored on-chain - be careful with what you submit</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

