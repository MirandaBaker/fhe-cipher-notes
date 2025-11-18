# FHE Cipher Notes

Collaborative encrypted document editing with Fully Homomorphic Encryption (FHE).

## 🌐 Live Demo

**Vercel Deployment**: [https://fhe-cipher-notes-hlhe.vercel.app/](https://fhe-cipher-notes-hlhe.vercel.app/)

## 📹 Demo Video

Watch the project demo video: [FHECipherNotes.mp4](./FHECipherNotes.mp4)

## 📋 Overview

FHE Cipher Notes is a decentralized application that enables multiple users to collaboratively edit a shared document with complete privacy. Individual edits are encrypted using ChaCha20 symmetric encryption, while the encryption keys are protected using Zama's FHE technology. The document password is publicly decryptable, allowing all users to read the content without requiring separate authorization.

## ✨ Features

- **Read Permission (All Users)**: Every user can decrypt and view the latest document content using public decryption
- **Write Permission (Authorized Only)**: Only admin-granted users can edit the document
- **Delete Permission**: Admin can grant delete permissions to users
- **FHE Encryption**: Encryption keys are protected with Zama's Fully Homomorphic Encryption
- **Public Decryption**: Document password is publicly decryptable, no separate authorization needed
- **On-Chain Storage**: All edits are stored on the blockchain for transparency and verifiability
- **Network Support**: Works on both Hardhat local network and Sepolia testnet
- **Manual Refresh**: Users manually refresh to decrypt and view the latest document content

## 🏗️ Architecture

### Smart Contract
- **FHECipherNotes.sol**: Main contract managing permissions and encrypted document edits
- Uses FHEVM for encrypted operations
- Stores encrypted content (ChaCha20) and FHE-encrypted passwords
- Makes passwords publicly decryptable using `FHE.makePubliclyDecryptable()`

### Frontend
- React + TypeScript + Vite
- RainbowKit for wallet connection
- Wagmi for blockchain interactions
- Zama Relayer SDK for FHE operations
- Tailwind CSS for styling

## 📍 Contract Addresses

### Local Network (Hardhat)
- **Chain ID**: 31337 or 1337
- **Contract Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **RPC URL**: `http://localhost:8545`

### Sepolia Testnet
- **Chain ID**: 11155111
- **Contract Address**: `0x0e4a3add37040add91e983c36720C7B2f0a4cDC5`
- **Block Explorer**: [Etherscan Sepolia](https://sepolia.etherscan.io/)

### Mainnet (Planned)
- **Chain ID**: 1
- **Contract Address**: TBD
- **Block Explorer**: [Etherscan](https://etherscan.io/)

## 🔧 Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Private Key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs (optional, fallbacks provided)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_key
MAINNET_RPC_URL=https://mainnet.infura.io/v3/your_infura_key
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your_alchemy_key

# API Keys for deployment verification
INFURA_API_KEY=your_infura_api_key
ALCHEMY_API_KEY=your_alchemy_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# FHEVM Configuration
FHEVM_NETWORK_URL=http://localhost:8545
```

## 📚 API Documentation

### Smart Contract Functions

#### Permission Management

```solidity
// Set permissions for a user (admin only)
function setPermission(address user, bool canWrite, bool canDelete) external onlyAdmin

// Check if user has write permission
function canUserWrite(address user) external view returns (bool)

// Check if user has delete permission
function canUserDelete(address user) external view returns (bool)

// Get admin address
function getAdmin() external view returns (address)
```

#### Document Operations

```solidity
// Update document with encrypted content (authorized users only)
function updateDocument(
    bytes calldata encryptedContent,
    externalEaddress encPwd,
    bytes calldata inputProof
) external onlyAuthorized

// Clear current document (admin or authorized users)
function clearDocument() external onlyAuthorizedToDelete

// Get document metadata
function getDocumentMeta() external view returns (address editor, uint64 timestamp, bool exists)

// Get encrypted document content
function getDocumentContent() external view returns (bytes memory)

// Get FHE-encrypted password
function getDocumentPassword() external view returns (eaddress)
```

#### Events

```solidity
// Emitted when document is updated
event DocumentUpdated(address indexed editor, uint64 indexed timestamp)

// Emitted when user permissions change
event PermissionUpdated(address indexed user, bool canWrite, bool canDelete)

// Emitted when admin changes
event AdminChanged(address indexed oldAdmin, address indexed newAdmin)
```

### Frontend Components

#### AddEditDialog
- **Purpose**: Modal dialog for adding new document edits
- **Features**: Content validation, encryption, blockchain submission
- **Props**: `open: boolean, onOpenChange: (open: boolean) => void`

#### EditList
- **Purpose**: Display current document with decryption capability
- **Features**: Real-time decryption, error handling, refresh functionality
- **Dependencies**: FHE instance, wallet connection

#### AdminPanel
- **Purpose**: Administrative interface for permission management
- **Features**: Grant/revoke permissions, view authorized users
- **Restrictions**: Admin-only access

## 🚀 Advanced Deployment Guide

### Local Development Setup

1. **Start Local Network**:
```bash
npx hardhat node
```

2. **Deploy Contracts**:
```bash
npx hardhat deploy --network hardhat
```

3. **Start Frontend**:
```bash
cd ui
npm run dev
```

### Testnet Deployment

1. **Configure Environment**:
```bash
cp .env.example .env
# Edit .env with your keys
```

2. **Deploy to Sepolia**:
```bash
npm run deploy:sepolia
```

3. **Verify Contract**:
```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

### Production Deployment

1. **Build Frontend**:
```bash
cd ui
npm run build
```

2. **Deploy to Vercel/Netlify**:
```bash
# Configure your deployment platform with environment variables
```

## 🔒 Security Considerations

### Encryption Security
- **ChaCha20**: Industry-standard symmetric encryption with 256-bit keys
- **FHE Protection**: Passwords encrypted with Zama's Fully Homomorphic Encryption
- **Public Decryption**: Passwords made publicly decryptable for accessibility

### Access Control
- **Admin Override**: Admin can always perform all operations
- **Permission Checks**: Smart contract enforces permission validation
- **Input Validation**: Content length and format validation prevents attacks

### Best Practices
- **Environment Variables**: Never commit private keys or API keys
- **Network Security**: Use HTTPS in production, validate RPC endpoints
- **Wallet Security**: Encourage hardware wallet usage for mainnet deployment

## 🧪 Testing Strategy

### Unit Tests
- **Contract Tests**: Permission logic, access control, encryption handling
- **Utility Tests**: ChaCha20 implementation, byte manipulation, FHE operations
- **Component Tests**: React component behavior, state management

### Integration Tests
- **End-to-End Encryption**: Complete encryption/decryption cycles
- **Multi-User Collaboration**: Permission-based document editing workflows
- **Cross-Network Compatibility**: Testing on different blockchain networks

### Coverage Goals
- **Smart Contracts**: >95% code coverage
- **Frontend Components**: >80% code coverage
- **Integration Tests**: All critical user workflows covered
- **Contract Address**: `0x0e4a3add37040add91e983c36720C7B2f0a4cDC5`
- **Explorer**: [View on Etherscan](https://sepolia.etherscan.io/address/0x0e4a3add37040add91e983c36720C7B2f0a4cDC5)

## 🔐 Encryption & Decryption Logic

### Encryption Flow (When Adding/Updating Document)

1. **Generate Random Password**:
   ```typescript
   const passwordAddress = generateRandomAddress(); // 20-byte random address
   ```

2. **Derive ChaCha20 Key**:
   ```typescript
   const key = keccak256(toUtf8Bytes(passwordAddress.toLowerCase()));
   // Extract 32 bytes from the hash
   ```

3. **Encrypt Content with ChaCha20**:
   ```typescript
   const nonce = randomBytes(12); // 12-byte random nonce
   const encryptedContent = chacha20Encrypt(key, nonce, plaintextBytes);
   const finalContent = concatBytes(nonce, encryptedContent); // nonce || ciphertext
   ```

4. **Encrypt Password with FHE**:
   ```typescript
   const input = instance.createEncryptedInput(contractAddress, userAddress);
   input.addAddress(passwordAddress);
   const encryptedInput = await input.encrypt();
   // Returns: { handles: [encryptedPassword], inputProof: proof }
   ```

5. **Store on Chain**:
   ```solidity
   updateDocument(encryptedContent, encPwd, inputProof);
   // Contract makes password publicly decryptable:
   FHE.makePubliclyDecryptable(_currentDocument.encPassword);
   ```

### Decryption Flow (When Viewing Document)

1. **Get Encrypted Data from Contract**:
   ```typescript
   const encryptedContent = await getDocumentContent();
   const encPassword = await getDocumentPassword();
   ```

2. **Decrypt Password using Public Decryption**:
   ```typescript
   // Since password is publicly decryptable, use publicDecrypt
   const decryptedPassword = await instance.publicDecrypt([encPassword]);
   const passwordAddress = decryptedPassword[encPassword].toString();
   ```

3. **Derive ChaCha20 Key**:
   ```typescript
   const key = keccak256(toUtf8Bytes(passwordAddress.toLowerCase()));
   // Extract 32 bytes from the hash
   ```

4. **Decrypt Content**:
   ```typescript
   const nonce = encryptedContent.slice(0, 12);
   const ciphertext = encryptedContent.slice(12);
   const plaintext = chacha20Decrypt(key, nonce, ciphertext);
   const document = bytesToUtf8(plaintext);
   ```

### Key Security Features

- **Two-Layer Encryption**: Content encrypted with ChaCha20, key encrypted with FHE
- **Public Decryption**: Password is publicly decryptable, allowing all users to read
- **Random Nonce**: Each encryption uses a unique 12-byte nonce
- **Key Derivation**: Uses Keccak256 hash of password address for ChaCha20 key

## 📄 Smart Contract Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHECipherNotes - Collaborative encrypted document editing
/// @notice A document collaboratively edited by all users with FHE encryption
/// @dev Only authorized users can edit. All users can read and decrypt.
contract FHECipherNotes is SepoliaConfig {
    struct DocumentEdit {
        address editor;
        bytes encryptedContent; // ChaCha20 ciphertext (nonce || ciphertext)
        eaddress encPassword; // FHE-encrypted address-shaped password
        uint64 timestamp;
        bool exists;
    }

    struct Permission {
        bool canWrite;
        bool canDelete;
    }

    address public admin;
    DocumentEdit private _currentDocument; // Single document, overwritten on each update
    mapping(address => Permission) public permissions;
    
    event DocumentUpdated(address indexed editor, uint64 timestamp);
    event PermissionUpdated(address indexed user, bool canWrite, bool canDelete);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyAuthorized() {
        require(
            permissions[msg.sender].canWrite || msg.sender == admin,
            "Not authorized to edit"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        permissions[msg.sender] = Permission(true, true);
    }

    /// @notice Set write and delete permissions for a user
    function setPermission(
        address user,
        bool canWrite,
        bool canDelete
    ) external onlyAdmin {
        permissions[user] = Permission(canWrite, canDelete);
        emit PermissionUpdated(user, canWrite, canDelete);
    }

    /// @notice Update the document (overwrites previous content)
    function updateDocument(
        bytes calldata encryptedContent,
        externalEaddress encPwd,
        bytes calldata inputProof
    ) external onlyAuthorized {
        eaddress password = FHE.fromExternal(encPwd, inputProof);

        _currentDocument = DocumentEdit({
            editor: msg.sender,
            encryptedContent: encryptedContent,
            encPassword: password,
            timestamp: uint64(block.timestamp),
            exists: true
        });

        // ACL: allow contract and editor to access the encrypted password
        FHE.allowThis(_currentDocument.encPassword);
        FHE.allow(_currentDocument.encPassword, msg.sender);
        // Make password publicly decryptable for all users, no separate authorization needed
        FHE.makePubliclyDecryptable(_currentDocument.encPassword);

        emit DocumentUpdated(msg.sender, uint64(block.timestamp));
    }

    /// @notice Clear the document (only admin or users with delete permission)
    function clearDocument() external {
        require(_currentDocument.exists, "Document does not exist");
        require(
            msg.sender == admin || 
            (msg.sender == _currentDocument.editor && permissions[msg.sender].canDelete),
            "Not authorized to clear"
        );
        _currentDocument.exists = false;
    }

    /// @notice Get the current document metadata
    function getDocumentMeta()
        external
        view
        returns (address editor, uint64 timestamp, bool exists)
    {
        return (_currentDocument.editor, _currentDocument.timestamp, _currentDocument.exists);
    }

    /// @notice Get the encrypted content
    function getDocumentContent()
        external
        view
        returns (bytes memory encryptedContent)
    {
        require(_currentDocument.exists, "Document does not exist");
        return _currentDocument.encryptedContent;
    }

    /// @notice Get the encrypted password
    function getDocumentPassword()
        external
        view
        returns (eaddress encPassword)
    {
        require(_currentDocument.exists, "Document does not exist");
        return _currentDocument.encPassword;
    }

    /// @notice Check if a user has write permission
    function canUserWrite(address user) external view returns (bool canWrite) {
        return permissions[user].canWrite || user == admin;
    }

    /// @notice Check if a user has delete permission
    function canUserDelete(address user) external view returns (bool canDelete) {
        return permissions[user].canDelete || user == admin;
    }

    /// @notice Get admin address
    function getAdmin() external view returns (address adminAddress) {
        return admin;
    }
}
```

## 🚀 Setup

### Prerequisites
- Node.js >= 20
- npm >= 7.0.0
- Hardhat (for local development)
- MetaMask or Rainbow wallet

### Installation

1. Install contract dependencies:
```bash
cd project/FHECipherNotes
npm install
```

2. Install frontend dependencies:
```bash
cd ui
npm install
```

3. Configure environment:
   - Set your WalletConnect project ID in `ui/src/config/wagmi.ts`
   - Contract addresses are already configured in `ui/src/config/contracts.ts`

## 📦 Deployment

### Local Network (Hardhat)

1. Start Hardhat node:
```bash
npx hardhat node
```

2. Deploy contracts:
```bash
npx hardhat deploy --network hardhat
```

3. The contract will be deployed to: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### Sepolia Testnet

1. Set up environment variables (do not commit to git):
```bash
PRIVATE_KEY=your_private_key
INFURA_API_KEY=your_infura_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_key
```

2. Deploy contracts:
```bash
npm run deploy:sepolia
```

3. The contract is deployed to: `0x0e4a3add37040add91e983c36720C7B2f0a4cDC5`

## 🧪 Testing

### Local Tests
```bash
npm test
```

### Sepolia Tests
```bash
npm run test:sepolia
```

## 💻 Usage

### Admin Workflow

1. Connect wallet (admin account)
2. Go to Admin Panel
3. Grant write/delete permissions to users
4. Users can now edit the document

### User Workflow

1. Connect wallet to the correct network (Hardhat local or Sepolia testnet)
2. View document by clicking the refresh button to decrypt and view latest content
3. If authorized, click "Add Edit" to contribute to the document
4. Switch between "Document" and "Guide" views using the toggle buttons

### Development

Start frontend dev server:
```bash
cd ui
npm run dev
```

## 📚 Contract Functions

### Permission Management
- `setPermission(address user, bool canWrite, bool canDelete)`: Admin grants/revokes permissions
- `canUserWrite(address user)`: Check if user can write
- `canUserDelete(address user)`: Check if user can delete
- `getAdmin()`: Get admin address

### Document Operations
- `updateDocument(bytes encryptedContent, externalEaddress encPwd, bytes inputProof)`: Update document (overwrites previous)
- `clearDocument()`: Clear the document (admin or user with delete permission)
- `getDocumentMeta()`: Get document metadata (editor, timestamp, exists)
- `getDocumentContent()`: Get encrypted content (ChaCha20 ciphertext)
- `getDocumentPassword()`: Get FHE-encrypted password (publicly decryptable)

### Events
- `DocumentUpdated(address indexed editor, uint64 timestamp)`: Emitted when document is updated
- `PermissionUpdated(address indexed user, bool canWrite, bool canDelete)`: Emitted when permissions change

## 🔧 Technical Details

### Encryption Stack
- **Content Encryption**: ChaCha20 (RFC 8439) with 32-byte key and 12-byte nonce
- **Key Encryption**: Zama FHE (Fully Homomorphic Encryption)
- **Key Derivation**: Keccak256 hash of password address
- **Storage Format**: `nonce (12 bytes) || ChaCha20_ciphertext`

### Decryption Method
- **Public Decryption**: Uses `instance.publicDecrypt()` since password is made publicly decryptable
- **No Authorization Required**: All users can decrypt without calling `grantReadAccess()`

### Network Configuration
- **Local**: Hardhat node (chainId: 31337/1337)
- **Testnet**: Sepolia (chainId: 11155111)
- **FHEVM Support**: Automatically detects FHEVM Hardhat node for mock mode

## 📝 Project Structure

```
FHECipherNotes/
├── contracts/
│   └── FHECipherNotes.sol          # Main smart contract
├── deploy/
│   └── deploy_fheciphernotes.ts    # Deployment script
├── ui/
│   └── src/
│       ├── components/
│       │   ├── AddEditDialog.tsx   # Dialog for adding edits
│       │   ├── EditList.tsx        # Document display and decryption
│       │   ├── AdminPanel.tsx      # Admin permission management
│       │   └── GuidePanel.tsx      # User guide panel
│       ├── utils/
│       │   ├── fheDecrypt.ts       # FHE decryption logic
│       │   ├── chacha20.ts         # ChaCha20 encryption/decryption
│       │   └── bytes.ts            # Byte manipulation utilities
│       ├── hooks/
│       │   └── useZamaInstance.ts  # Zama SDK initialization
│       └── config/
│           └── contracts.ts        # Contract addresses and ABI
└── README.md
```

## 🔒 Security Considerations

- **Private Keys**: Never commit private keys or API keys to git
- **Environment Variables**: Use `.env` files (already in `.gitignore`)
- **Public Decryption**: Password is publicly decryptable, but content remains encrypted until decrypted
- **Permission Model**: Only authorized users can edit, but all users can read

## 📄 License

MIT

## 🙏 Acknowledgments

- [Zama](https://www.zama.ai/) for FHE technology and FHEVM
- [Hardhat](https://hardhat.org/) for development framework
- [RainbowKit](https://www.rainbowkit.com/) for wallet connection
- [Wagmi](https://wagmi.sh/) for React Hooks for Ethereum
