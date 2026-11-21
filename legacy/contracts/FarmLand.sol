// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FarmLand (ERC-721)
 * @dev Representa propriedades de terra únicas no NFT Farm Adventure.
 *      Cada terra tem atributos como tamanho, fertilidade e raridade.
 *      Terras são NFTs reais que podem ser transferidos e negociados.
 */
contract FarmLand is ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Pausable, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Contador de token IDs
    uint256 private _nextTokenId;

    // Supply máximo de terras
    uint256 public constant MAX_SUPPLY = 10_000;

    // Preço base de uma terra (em HARVEST tokens)
    uint256 public landPrice = 100 * 10 ** 18; // 100 HARVEST

    // Raridades de terra
    enum LandRarity { Common, Uncommon, Rare, Epic, Legendary }

    // Atributos de uma terra
    struct LandAttributes {
        uint8 gridSize;         // Tamanho da grade (ex: 10 = 10x10)
        uint8 fertilityLevel;   // Nível de fertilidade (0-100)
        LandRarity rarity;      // Raridade da terra
        uint256 mintedAt;       // Timestamp de criação
    }

    mapping(uint256 => LandAttributes) public landAttributes;

    // Eventos
    event LandMinted(address indexed to, uint256 indexed tokenId, LandRarity rarity);
    event LandAttributesUpdated(uint256 indexed tokenId, uint8 fertilityLevel);

    /**
     * @dev Inicializa o contrato FarmLand.
     * @param admin Endereço do administrador inicial
     */
    constructor(address admin) ERC721("FarmLand", "LAND") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _nextTokenId = 1;
    }

    /**
     * @dev Cunha uma nova terra NFT.
     * @param to Endereço do destinatário
     * @param gridSize Tamanho da grade da terra
     * @param fertilityLevel Nível de fertilidade inicial
     * @param rarity Raridade da terra
     * @param uri URI dos metadados da terra
     * @return tokenId ID do token criado
     */
    function mintLand(
        address to,
        uint8 gridSize,
        uint8 fertilityLevel,
        LandRarity rarity,
        string memory uri
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(_nextTokenId <= MAX_SUPPLY, "FarmLand: max supply reached");
        require(gridSize >= 5 && gridSize <= 20, "FarmLand: invalid grid size");
        require(fertilityLevel <= 100, "FarmLand: invalid fertility level");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        landAttributes[tokenId] = LandAttributes({
            gridSize: gridSize,
            fertilityLevel: fertilityLevel,
            rarity: rarity,
            mintedAt: block.timestamp
        });

        emit LandMinted(to, tokenId, rarity);
        return tokenId;
    }

    /**
     * @dev Atualiza o nível de fertilidade de uma terra.
     * @param tokenId ID do token
     * @param newFertilityLevel Novo nível de fertilidade
     */
    function updateFertility(
        uint256 tokenId,
        uint8 newFertilityLevel
    ) external onlyRole(MINTER_ROLE) {
        require(_ownerOf(tokenId) != address(0), "FarmLand: token does not exist");
        require(newFertilityLevel <= 100, "FarmLand: invalid fertility level");
        landAttributes[tokenId].fertilityLevel = newFertilityLevel;
        emit LandAttributesUpdated(tokenId, newFertilityLevel);
    }

    /**
     * @dev Retorna os atributos de uma terra.
     * @param tokenId ID do token
     */
    function getLandAttributes(uint256 tokenId) external view returns (LandAttributes memory) {
        require(_ownerOf(tokenId) != address(0), "FarmLand: token does not exist");
        return landAttributes[tokenId];
    }

    /**
     * @dev Retorna todas as terras de um endereço.
     * @param owner Endereço do proprietário
     */
    function getLandsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokenIds;
    }

    /**
     * @dev Atualiza o preço base das terras.
     * @param newPrice Novo preço em wei
     */
    function setLandPrice(uint256 newPrice) external onlyRole(DEFAULT_ADMIN_ROLE) {
        landPrice = newPrice;
    }

    /**
     * @dev Pausa todas as transferências.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Despausa as transferências.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // Overrides necessários para múltipla herança
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable, ERC721Pausable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
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
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
