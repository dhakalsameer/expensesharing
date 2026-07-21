# ExpenseNFT
[Git Source](https://github.com/dhakalsameer/expensesharing/blob/e9e39bf85ef1663ab548ec7f13c00cb0d6f9db2b/src/ExpenseNft.sol)

**Inherits:**
ERC721, ERC721URIStorage, ERC721Pausable, Ownable, ERC721Burnable


## State Variables
### _tokenIds

```solidity
uint256 private _tokenIds
```


### expenseToNFT

```solidity
mapping(uint256 => uint256) public expenseToNFT
```


### nftToExpensePayer

```solidity
mapping(uint256 => address) public nftToExpensePayer
```


### userNFTs

```solidity
mapping(address => uint256[]) public userNFTs
```


## Functions
### constructor


```solidity
constructor() ERC721("Expense Receipt NFT", "ERNFT") Ownable(msg.sender);
```

### mintExpenseNFT


```solidity
function mintExpenseNFT(address to, string memory uri, uint256 expenseId, string memory expname)
    public
    onlyOwner
    returns (uint256);
```

### getNFTForExpense


```solidity
function getNFTForExpense(uint256 expenseId) public view returns (uint256);
```

### getExpensePayer


```solidity
function getExpensePayer(uint256 tokenId) public view returns (address);
```

### getUserNFTs


```solidity
function getUserNFTs(address user) public view returns (uint256[] memory);
```

### getNFTCount


```solidity
function getNFTCount() public view returns (uint256);
```

### pause


```solidity
function pause() public onlyOwner;
```

### unpause


```solidity
function unpause() public onlyOwner;
```

### _update


```solidity
function _update(address to, uint256 tokenId, address auth)
    internal
    override(ERC721, ERC721Pausable)
    returns (address);
```

### tokenURI


```solidity
function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory);
```

### supportsInterface


```solidity
function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool);
```

## Events
### ExpenseNFTMinted

```solidity
event ExpenseNFTMinted(address indexed to, uint256 tokenId, uint256 expenseId, string expname);
```

