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
    
    event DocumentUpdated(address indexed editor, uint64 indexed timestamp);
    event PermissionUpdated(address indexed user, bool canWrite, bool canDelete);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

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
    /// @param user The address to grant/revoke permissions
    /// @param canWrite Whether the user can write/edit
    /// @param canDelete Whether the user can delete edits
    function setPermission(
        address user,
        bool canWrite,
        bool canDelete
    ) external onlyAdmin {
        permissions[user] = Permission(canWrite, canDelete);
        emit PermissionUpdated(user, canWrite, canDelete);
    }

    /// @notice Update the document (overwrites previous content)
    /// @param encryptedContent The ChaCha20 ciphertext bytes (nonce || ciphertext)
    /// @param encPwd External encrypted address input handle
    /// @param inputProof The Zama input proof for `encPwd`
    function updateDocument(
        bytes calldata encryptedContent,
        externalEaddress encPwd,
        bytes calldata inputProof
    ) external onlyAuthorized {
        // Security checks: validate encrypted content
        require(encryptedContent.length > 12, "Encrypted content must contain nonce and data");
        require(encryptedContent.length <= 10000, "Encrypted content too large");

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

    /// @notice Grant read access to the caller (all users can read/decrypt)
    /// @dev This allows any user to decrypt the document content
    function grantReadAccess() external {
        require(_currentDocument.exists, "Document does not exist");
        // Grant FHE decryption permission to caller
        FHE.allow(_currentDocument.encPassword, msg.sender);
    }

    /// @notice Get the current document metadata
    /// @return editor Editor address
    /// @return timestamp Edit timestamp
    /// @return exists Whether the document exists
    function getDocumentMeta()
        external
        view
        returns (address editor, uint64 timestamp, bool exists)
    {
        return (_currentDocument.editor, _currentDocument.timestamp, _currentDocument.exists);
    }

    /// @notice Get the encrypted content
    /// @return encryptedContent The ChaCha20 ciphertext bytes
    function getDocumentContent()
        external
        view
        returns (bytes memory encryptedContent)
    {
        require(_currentDocument.exists, "Document does not exist");
        return _currentDocument.encryptedContent;
    }

    /// @notice Get the encrypted password
    /// @return encPassword The FHE-encrypted address-shaped password
    function getDocumentPassword()
        external
        view
        returns (eaddress encPassword)
    {
        require(_currentDocument.exists, "Document does not exist");
        return _currentDocument.encPassword;
    }

    /// @notice Check if a user has write permission
    /// @param user The user address
    /// @return canWrite Whether the user can write
    function canUserWrite(address user) external view returns (bool canWrite) {
        return permissions[user].canWrite || user == admin;
    }

    /// @notice Check if a user has delete permission
    /// @param user The user address
    /// @return canDelete Whether the user can delete
    function canUserDelete(address user) external view returns (bool canDelete) {
        return permissions[user].canDelete || user == admin;
    }

    /// @notice Get admin address
    /// @return adminAddress The admin address
    function getAdmin() external view returns (address adminAddress) {
        return admin;
    }
}

