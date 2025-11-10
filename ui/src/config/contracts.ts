// Contract addresses - Update after deployment
// For local hardhat network (chainId: 31337)
export const CONTRACT_ADDRESS_LOCAL = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`;

// For Sepolia testnet (chainId: 11155111)
export const CONTRACT_ADDRESS_SEPOLIA = '0x0e4a3add37040add91e983c36720C7B2f0a4cDC5' as `0x${string}`;

// Get contract address based on chain ID
export function getContractAddress(chainId: number): `0x${string}` {
  if (chainId === 31337 || chainId === 1337) {
    return CONTRACT_ADDRESS_LOCAL;
  } else if (chainId === 11155111) {
    return CONTRACT_ADDRESS_SEPOLIA;
  }
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

// Contract ABI - Generated from contract compilation
export const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "admin",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes", "name": "encryptedContent", "type": "bytes" },
      { "internalType": "externalEaddress", "name": "encPwd", "type": "bytes32" },
      { "internalType": "bytes", "name": "inputProof", "type": "bytes" }
    ],
    "name": "updateDocument",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "canUserDelete",
    "outputs": [{ "internalType": "bool", "name": "canDelete", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "canUserWrite",
    "outputs": [{ "internalType": "bool", "name": "canWrite", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "clearDocument",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAdmin",
    "outputs": [{ "internalType": "address", "name": "adminAddress", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDocumentContent",
    "outputs": [{ "internalType": "bytes", "name": "encryptedContent", "type": "bytes" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDocumentMeta",
    "outputs": [
      { "internalType": "address", "name": "editor", "type": "address" },
      { "internalType": "uint64", "name": "timestamp", "type": "uint64" },
      { "internalType": "bool", "name": "exists", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDocumentPassword",
    "outputs": [{ "internalType": "eaddress", "name": "encPassword", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "grantReadAccess",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "bool", "name": "canWrite", "type": "bool" },
      { "internalType": "bool", "name": "canDelete", "type": "bool" }
    ],
    "name": "setPermission",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "editor", "type": "address" },
      { "indexed": false, "internalType": "uint64", "name": "timestamp", "type": "uint64" }
    ],
    "name": "DocumentUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "bool", "name": "canWrite", "type": "bool" },
      { "indexed": false, "internalType": "bool", "name": "canDelete", "type": "bool" }
    ],
    "name": "PermissionUpdated",
    "type": "event"
  }
] as const;

