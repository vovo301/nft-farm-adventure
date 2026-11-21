// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./UtilityToken.sol";
import "./FarmToken.sol";
import "./FarmLand.sol";
import "./FarmItems.sol";

/**
 * @title GameEconomyManager
 * @dev Contrato central que gerencia a economia do NFT Farm Adventure.
 *      Coordena interações entre todos os contratos do jogo:
 *      - Emissão de recompensas (HARVEST e FARM)
 *      - Compra de terras (FarmLand)
 *      - Saque de itens off-chain para on-chain (FarmItems)
 *      - Queima de tokens (deflação)
 *      - Taxas do marketplace on-chain
 */
contract GameEconomyManager is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant GAME_SERVER_ROLE = keccak256("GAME_SERVER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Referências aos contratos
    UtilityToken public harvestToken;
    FarmToken public farmToken;
    FarmLand public farmLand;
    FarmItems public farmItems;

    // Endereço da tesouraria (recebe taxas)
    address public treasury;

    // Taxa do marketplace on-chain (em basis points, ex: 250 = 2.5%)
    uint256 public marketplaceFeeRate = 250;

    // Configurações de recompensas
    uint256 public harvestRewardPerCrop = 10 * 10 ** 18;  // 10 HARVEST por cultivo
    uint256 public farmRewardPerMission = 1 * 10 ** 18;   // 1 FARM por missão

    // Eventos
    event LandPurchased(address indexed buyer, uint256 indexed tokenId, uint256 price);
    event ItemsWithdrawn(address indexed user, uint256 indexed itemTypeId, uint256 amount);
    event HarvestRewardIssued(address indexed user, uint256 amount, string reason);
    event FarmRewardIssued(address indexed user, uint256 amount, string reason);
    event TokensBurned(address indexed token, uint256 amount);
    event TreasuryUpdated(address indexed newTreasury);

    /**
     * @dev Inicializa o GameEconomyManager com todos os contratos do jogo.
     * @param admin Endereço do administrador
     * @param _harvestToken Endereço do contrato UtilityToken (HARVEST)
     * @param _farmToken Endereço do contrato FarmToken (FARM)
     * @param _farmLand Endereço do contrato FarmLand
     * @param _farmItems Endereço do contrato FarmItems
     * @param _treasury Endereço da tesouraria
     */
    constructor(
        address admin,
        address _harvestToken,
        address _farmToken,
        address _farmLand,
        address _farmItems,
        address _treasury
    ) {
        require(_harvestToken != address(0), "GameEconomyManager: invalid harvest token");
        require(_farmToken != address(0), "GameEconomyManager: invalid farm token");
        require(_farmLand != address(0), "GameEconomyManager: invalid farm land");
        require(_farmItems != address(0), "GameEconomyManager: invalid farm items");
        require(_treasury != address(0), "GameEconomyManager: invalid treasury");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_SERVER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        harvestToken = UtilityToken(_harvestToken);
        farmToken = FarmToken(_farmToken);
        farmLand = FarmLand(_farmLand);
        farmItems = FarmItems(_farmItems);
        treasury = _treasury;
    }

    /**
     * @dev Permite que um jogador compre uma terra NFT pagando em HARVEST.
     * @param gridSize Tamanho da grade desejado
     * @param rarity Raridade da terra
     * @param uri URI dos metadados
     */
    function purchaseLand(
        uint8 gridSize,
        FarmLand.LandRarity rarity,
        string memory uri
    ) external nonReentrant whenNotPaused {
        uint256 price = _calculateLandPrice(gridSize, rarity);

        // Transferir HARVEST do comprador para a tesouraria
        require(
            harvestToken.transferFrom(msg.sender, treasury, price),
            "GameEconomyManager: HARVEST transfer failed"
        );

        // Cunhar a terra NFT
        uint256 tokenId = farmLand.mintLand(
            msg.sender,
            gridSize,
            50, // fertilidade inicial: 50%
            rarity,
            uri
        );

        emit LandPurchased(msg.sender, tokenId, price);
    }

    /**
     * @dev Processa um saque de itens off-chain para on-chain.
     *      Chamado pelo servidor do jogo após validação.
     * @param user Endereço do usuário
     * @param itemTypeId ID do tipo de item
     * @param amount Quantidade a sacar
     */
    function processItemWithdrawal(
        address user,
        uint256 itemTypeId,
        uint256 amount
    ) external onlyRole(GAME_SERVER_ROLE) nonReentrant whenNotPaused {
        farmItems.processWithdrawal(user, itemTypeId, amount);
        emit ItemsWithdrawn(user, itemTypeId, amount);
    }

    /**
     * @dev Emite recompensas HARVEST para um jogador.
     *      Chamado pelo servidor do jogo para recompensar ações.
     * @param user Endereço do usuário
     * @param amount Quantidade de HARVEST a emitir
     * @param reason Motivo da recompensa
     */
    function issueHarvestReward(
        address user,
        uint256 amount,
        string memory reason
    ) external onlyRole(GAME_SERVER_ROLE) whenNotPaused {
        harvestToken.mint(user, amount);
        emit HarvestRewardIssued(user, amount, reason);
    }

    /**
     * @dev Emite recompensas FARM para um jogador.
     *      Chamado pelo servidor do jogo para recompensar missões e conquistas.
     * @param user Endereço do usuário
     * @param amount Quantidade de FARM a emitir
     * @param reason Motivo da recompensa
     */
    function issueFarmReward(
        address user,
        uint256 amount,
        string memory reason
    ) external onlyRole(GAME_SERVER_ROLE) whenNotPaused {
        farmToken.mint(user, amount);
        emit FarmRewardIssued(user, amount, reason);
    }

    /**
     * @dev Queima tokens HARVEST (mecanismo deflacionário).
     * @param amount Quantidade a queimar
     */
    function burnHarvest(uint256 amount) external onlyRole(GAME_SERVER_ROLE) {
        harvestToken.burn(amount);
        emit TokensBurned(address(harvestToken), amount);
    }

    /**
     * @dev Calcula o preço de uma terra baseado no tamanho e raridade.
     * @param gridSize Tamanho da grade
     * @param rarity Raridade da terra
     * @return Preço em HARVEST (wei)
     */
    function _calculateLandPrice(
        uint8 gridSize,
        FarmLand.LandRarity rarity
    ) internal view returns (uint256) {
        uint256 basePrice = farmLand.landPrice();

        // Multiplicador por tamanho
        uint256 sizeMultiplier = uint256(gridSize) * 10; // 10x por unidade de tamanho

        // Multiplicador por raridade
        uint256 rarityMultiplier;
        if (rarity == FarmLand.LandRarity.Common) rarityMultiplier = 100;
        else if (rarity == FarmLand.LandRarity.Uncommon) rarityMultiplier = 200;
        else if (rarity == FarmLand.LandRarity.Rare) rarityMultiplier = 500;
        else if (rarity == FarmLand.LandRarity.Epic) rarityMultiplier = 1000;
        else rarityMultiplier = 5000; // Legendary

        return (basePrice * sizeMultiplier * rarityMultiplier) / 10000;
    }

    /**
     * @dev Retorna o preço calculado de uma terra.
     * @param gridSize Tamanho da grade
     * @param rarity Raridade da terra
     */
    function getLandPrice(
        uint8 gridSize,
        FarmLand.LandRarity rarity
    ) external view returns (uint256) {
        return _calculateLandPrice(gridSize, rarity);
    }

    /**
     * @dev Atualiza o endereço da tesouraria.
     * @param newTreasury Novo endereço da tesouraria
     */
    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "GameEconomyManager: invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @dev Atualiza a taxa do marketplace on-chain.
     * @param newFeeRate Nova taxa em basis points
     */
    function setMarketplaceFeeRate(uint256 newFeeRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeRate <= 1000, "GameEconomyManager: fee rate too high"); // Max 10%
        marketplaceFeeRate = newFeeRate;
    }

    /**
     * @dev Adiciona um endereço como servidor do jogo.
     * @param server Endereço do servidor
     */
    function addGameServer(address server) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(GAME_SERVER_ROLE, server);
    }

    /**
     * @dev Remove um endereço como servidor do jogo.
     * @param server Endereço do servidor
     */
    function removeGameServer(address server) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(GAME_SERVER_ROLE, server);
    }

    /**
     * @dev Pausa todas as operações.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Despausa as operações.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
