// src/ExpenseNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract ExpenseNFT is ERC721, ERC721URIStorage, ERC721Pausable, Ownable, ERC721Burnable {
    uint256 private _tokenIds;

    mapping(uint256 => uint256) public expenseToNFT;
    mapping(uint256 => address) public nftToExpensePayer;
    mapping(address => uint256[]) public userNFTs;
    
    event ExpenseNFTMinted(address indexed to, uint256 tokenId, uint256 expenseId, string expname);

    // REMOVED constructor argument - uses msg.sender as owner
    constructor() 
        ERC721("Expense Receipt NFT", "ERNFT")
        Ownable(msg.sender)
    {}

    function mintExpenseNFT(
        address to,
        string memory uri,
        uint256 expenseId,
        string memory expname
    ) public onlyOwner returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(bytes(uri).length > 0, "Token URI required");
        
        uint256 tokenId = _tokenIds;
        _tokenIds++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        expenseToNFT[expenseId] = tokenId;
        nftToExpensePayer[tokenId] = to;
        userNFTs[to].push(tokenId);

        emit ExpenseNFTMinted(to, tokenId, expenseId, expname);
        
        return tokenId;
    }

    function getNFTForExpense(uint256 expenseId) public view returns (uint256) {
        return expenseToNFT[expenseId];
    }

    function getExpensePayer(uint256 tokenId) public view returns (address) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return nftToExpensePayer[tokenId];
    }

    function getUserNFTs(address user) public view returns (uint256[] memory) {
        return userNFTs[user];
    }

    function getNFTCount() public view returns (uint256) {
        return _tokenIds;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Pausable)
        returns (address)
    {
        if (to != address(0)) {
            address from = _ownerOf(tokenId);
            if (from != address(0) && from != to) {
                uint256[] storage oldUserNFTs = userNFTs[from];
                for (uint256 i = 0; i < oldUserNFTs.length; i++) {
                    if (oldUserNFTs[i] == tokenId) {
                        oldUserNFTs[i] = oldUserNFTs[oldUserNFTs.length - 1];
                        oldUserNFTs.pop();
                        break;
                    }
                }
                userNFTs[to].push(tokenId);
                nftToExpensePayer[tokenId] = to;
            }
        }
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}