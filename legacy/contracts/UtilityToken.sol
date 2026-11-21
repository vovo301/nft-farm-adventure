// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title UtilityToken (HARVEST)
 * @dev Token utilitário do jogo NFT Farm Adventure.
 *      Usado para transações internas e recompensas off-chain.
 *      Pode ser mintado pelo GameEconomyManager para recompensas.
 */
contract UtilityToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Supply máximo: 1 bilhão de HARVEST
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;

    // Eventos customizados
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @dev Inicializa o contrato com o nome HARVEST e símbolo HARVEST.
     * @param admin Endereço do administrador inicial
     */
    constructor(address admin) ERC20("Harvest Token", "HARVEST") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    /**
     * @dev Cunha novos tokens HARVEST.
     * @param to Endereço do destinatário
     * @param amount Quantidade a cunhar (em wei)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "UtilityToken: max supply exceeded");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Pausa todas as transferências de tokens.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Despausa as transferências de tokens.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Override necessário para ERC20Pausable.
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
        if (from == address(0)) {
            // Mint
        } else if (to == address(0)) {
            // Burn
            emit TokensBurned(from, value);
        }
    }
}
