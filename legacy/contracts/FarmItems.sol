// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FarmItems (ERC-1155)
 * @dev Representa todos os itens do jogo NFT Farm Adventure.
 *      Inclui cultivos colhidos, ferramentas, recursos e itens especiais.
 *      Itens são cunhados on-demand quando jogadores sacam do off-chain.
 */
contract FarmItems is ERC1155, ERC1155Burnable, ERC1155Pausable, ERC1155Supply, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Categorias de itens
    enum ItemCategory { Crop, Tool, Resource, Special }

    // Metadados de um tipo de item
    struct ItemType {
        string name;
        ItemCategory category;
        uint8 rarity;           // 1-5 (Comum a Lendário)
        uint256 maxSupply;      // 0 = ilimitado
        bool active;
    }

    mapping(uint256 => ItemType) public itemTypes;
    uint256 public nextItemTypeId = 1;

    // URI base para metadados
    string private _baseURI;

    // Taxa de saque (em basis points, ex: 200 = 2%)
    uint256 public withdrawalFeeRate = 200;

    // Eventos
    event ItemTypeDefined(uint256 indexed itemTypeId, string name, ItemCategory category, uint8 rarity);
    event ItemsMinted(address indexed to, uint256 indexed itemTypeId, uint256 amount);
    event ItemsBurned(address indexed from, uint256 indexed itemTypeId, uint256 amount);
    event WithdrawalProcessed(address indexed to, uint256 indexed itemTypeId, uint256 amount, uint256 fee);

    /**
     * @dev Inicializa o contrato FarmItems.
     * @param admin Endereço do administrador inicial
     * @param baseURI URI base para metadados dos itens
     */
    constructor(address admin, string memory baseURI) ERC1155(baseURI) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _baseURI = baseURI;
    }

    /**
     * @dev Define um novo tipo de item.
     * @param name Nome do item
     * @param category Categoria do item
     * @param rarity Raridade (1-5)
     * @param maxSupply Supply máximo (0 = ilimitado)
     * @return itemTypeId ID do tipo de item criado
     */
    function defineItemType(
        string memory name,
        ItemCategory category,
        uint8 rarity,
        uint256 maxSupply
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        require(rarity >= 1 && rarity <= 5, "FarmItems: invalid rarity");

        uint256 itemTypeId = nextItemTypeId++;
        itemTypes[itemTypeId] = ItemType({
            name: name,
            category: category,
            rarity: rarity,
            maxSupply: maxSupply,
            active: true
        });

        emit ItemTypeDefined(itemTypeId, name, category, rarity);
        return itemTypeId;
    }

    /**
     * @dev Cunha itens para um endereço (saque off-chain -> on-chain).
     * @param to Endereço do destinatário
     * @param itemTypeId ID do tipo de item
     * @param amount Quantidade a cunhar
     * @param data Dados adicionais
     */
    function mint(
        address to,
        uint256 itemTypeId,
        uint256 amount,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) {
        require(itemTypes[itemTypeId].active, "FarmItems: item type not active");

        if (itemTypes[itemTypeId].maxSupply > 0) {
            require(
                totalSupply(itemTypeId) + amount <= itemTypes[itemTypeId].maxSupply,
                "FarmItems: max supply exceeded"
            );
        }

        _mint(to, itemTypeId, amount, data);
        emit ItemsMinted(to, itemTypeId, amount);
    }

    /**
     * @dev Processa um saque de itens off-chain para on-chain com taxa.
     * @param to Endereço do destinatário
     * @param itemTypeId ID do tipo de item
     * @param amount Quantidade solicitada (antes da taxa)
     */
    function processWithdrawal(
        address to,
        uint256 itemTypeId,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) nonReentrant {
        require(amount > 0, "FarmItems: amount must be > 0");
        require(itemTypes[itemTypeId].active, "FarmItems: item type not active");

        // Calcular taxa
        uint256 fee = (amount * withdrawalFeeRate) / 10000;
        uint256 amountAfterFee = amount - fee;

        require(amountAfterFee > 0, "FarmItems: amount after fee is 0");

        if (itemTypes[itemTypeId].maxSupply > 0) {
            require(
                totalSupply(itemTypeId) + amountAfterFee <= itemTypes[itemTypeId].maxSupply,
                "FarmItems: max supply exceeded"
            );
        }

        _mint(to, itemTypeId, amountAfterFee, "");
        emit WithdrawalProcessed(to, itemTypeId, amountAfterFee, fee);
    }

    /**
     * @dev Cunha múltiplos tipos de itens de uma vez.
     * @param to Endereço do destinatário
     * @param itemTypeIds Array de IDs de tipos de itens
     * @param amounts Array de quantidades
     * @param data Dados adicionais
     */
    function mintBatch(
        address to,
        uint256[] memory itemTypeIds,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i < itemTypeIds.length; i++) {
            require(itemTypes[itemTypeIds[i]].active, "FarmItems: item type not active");
        }
        _mintBatch(to, itemTypeIds, amounts, data);
    }

    /**
     * @dev Atualiza a taxa de saque.
     * @param newFeeRate Nova taxa em basis points (ex: 200 = 2%)
     */
    function setWithdrawalFeeRate(uint256 newFeeRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeRate <= 1000, "FarmItems: fee rate too high"); // Max 10%
        withdrawalFeeRate = newFeeRate;
    }

    /**
     * @dev Ativa ou desativa um tipo de item.
     * @param itemTypeId ID do tipo de item
     * @param active Status de ativação
     */
    function setItemTypeActive(uint256 itemTypeId, bool active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        itemTypes[itemTypeId].active = active;
    }

    /**
     * @dev Retorna os metadados de um tipo de item.
     * @param itemTypeId ID do tipo de item
     */
    function getItemType(uint256 itemTypeId) external view returns (ItemType memory) {
        return itemTypes[itemTypeId];
    }

    /**
     * @dev Atualiza a URI base dos metadados.
     * @param newBaseURI Nova URI base
     */
    function setBaseURI(string memory newBaseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseURI = newBaseURI;
        _setURI(newBaseURI);
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
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Pausable, ERC1155Supply) {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
