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
        bool canRead;
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

    modifier onlyAuthorizedToDelete() {
        require(
            msg.sender == admin ||
            (msg.sender == _currentDocument.editor && permissions[msg.sender].canDelete),
            "Not authorized to delete"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        permissions[msg.sender] = Permission(true, true, true);
    }

    /// @notice Set write, delete, and read permissions for a user
    /// @param user The address to grant/revoke permissions
    /// @param canWrite Whether the user can write/edit
    /// @param canDelete Whether the user can delete edits
    /// @param canRead Whether the user can read/decrypt the document
    function setPermission(
        address user,
        bool canWrite,
        bool canDelete,
        bool canRead
    ) external onlyAdmin {
        permissions[user] = Permission(canWrite, canDelete, canRead);
        emit PermissionUpdated(user, canWrite, canDelete);
        
        // If granting read permission, also grant FHE ACL access
        if (canRead && _currentDocument.exists) {
            FHE.allow(_currentDocument.encPassword, user);
        }
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
        // Grant read access to admin
        FHE.allow(_currentDocument.encPassword, admin);
        // Grant read access to all users with canRead permission
        // Note: This is done on-demand via grantReadAccess or setPermission

        emit DocumentUpdated(msg.sender, uint64(block.timestamp));
    }

    /// @notice Clear the document (only admin or users with delete permission)
    function clearDocument() external onlyAuthorizedToDelete {
        require(_currentDocument.exists, "Document does not exist");
        _currentDocument.exists = false;
    }

    /// @notice Grant read access to a user (admin only)
    /// @param user The address to grant read access
    /// @dev This allows the specified user to decrypt the document content
    function grantReadAccess(address user) external onlyAdmin {
        require(_currentDocument.exists, "Document does not exist");
        // Grant FHE decryption permission to user
        FHE.allow(_currentDocument.encPassword, user);
        // Update permission struct
        permissions[user].canRead = true;
        emit PermissionUpdated(user, permissions[user].canWrite, permissions[user].canDelete);
    }
    
    /// @notice Revoke read access from a user (admin only)
    /// @param user The address to revoke read access from
    function revokeReadAccess(address user) external onlyAdmin {
        require(_currentDocument.exists, "Document does not exist");
        // Note: FHE.allow cannot be revoked, but we can track it in permissions
        permissions[user].canRead = false;
        emit PermissionUpdated(user, permissions[user].canWrite, permissions[user].canDelete);
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

    /// @notice Check if a user has read permission
    /// @param user The user address
    /// @return canRead Whether the user can read/decrypt
    function canUserRead(address user) external view returns (bool canRead) {
        return permissions[user].canRead || user == admin;
    }

    /// @notice Get admin address
    /// @return adminAddress The admin address
    function getAdmin() external view returns (address adminAddress) {
        return admin;
    }
}

