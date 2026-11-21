// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FarmToken (FARM)
 * @dev Token de governança do jogo NFT Farm Adventure.
 *      Permite staking para obter recompensas e participar da governança.
 *      Supply inicial: 100.000 FARM.
 */
contract FarmToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Supply máximo: 10 milhões de FARM
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10 ** 18;
    // Supply inicial: 100.000 FARM
    uint256 public constant INITIAL_SUPPLY = 100_000 * 10 ** 18;

    // Taxa de recompensa de staking: 10% ao ano (em base points por segundo)
    // 10% / ano = 10 / (365 * 24 * 3600) = ~3.17e-9 por segundo
    uint256 public stakingRewardRate = 317; // em 1e-11 por segundo (≈10% ao ano)

    // Estrutura de staking por usuário
    struct StakeInfo {
        uint256 amount;         // Quantidade em staking
        uint256 rewardDebt;     // Recompensa já calculada
        uint256 lastStakeTime;  // Timestamp do último stake/unstake
    }

    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;

    // Eventos
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);

    /**
     * @dev Inicializa o contrato com supply inicial para o admin.
     * @param admin Endereço do administrador inicial
     */
    constructor(address admin) ERC20("Farm Token", "FARM") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        // Cunhar supply inicial para o admin
        _mint(admin, INITIAL_SUPPLY);
    }

    /**
     * @dev Cunha novos tokens FARM.
     * @param to Endereço do destinatário
     * @param amount Quantidade a cunhar (em wei)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "FarmToken: max supply exceeded");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Calcula as recompensas pendentes de staking para um usuário.
     * @param user Endereço do usuário
     * @return Recompensas pendentes em wei
     */
    function pendingRewards(address user) public view returns (uint256) {
        StakeInfo storage stake = stakes[user];
        if (stake.amount == 0) return 0;

        uint256 timeElapsed = block.timestamp - stake.lastStakeTime;
        // Recompensa = amount * rate * time / 1e11
        uint256 reward = (stake.amount * stakingRewardRate * timeElapsed) / 1e11;
        return reward;
    }

    /**
     * @dev Faz staking de tokens FARM.
     * @param amount Quantidade a fazer staking
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "FarmToken: amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "FarmToken: insufficient balance");

        // Coletar recompensas pendentes antes de atualizar
        _collectRewards(msg.sender);

        // Transferir tokens para o contrato
        _transfer(msg.sender, address(this), amount);

        stakes[msg.sender].amount += amount;
        stakes[msg.sender].lastStakeTime = block.timestamp;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    /**
     * @dev Retira tokens do staking.
     * @param amount Quantidade a retirar
     */
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        require(stakeInfo.amount >= amount, "FarmToken: insufficient staked amount");

        // Coletar recompensas pendentes antes de atualizar
        _collectRewards(msg.sender);

        stakeInfo.amount -= amount;
        stakeInfo.lastStakeTime = block.timestamp;
        totalStaked -= amount;

        // Transferir tokens de volta ao usuário
        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev Reivindica recompensas de staking.
     */
    function claimRewards() external nonReentrant whenNotPaused {
        _collectRewards(msg.sender);
    }

    /**
     * @dev Lógica interna de coleta de recompensas.
     * @param user Endereço do usuário
     */
    function _collectRewards(address user) internal {
        uint256 reward = pendingRewards(user);
        if (reward > 0) {
            stakes[user].lastStakeTime = block.timestamp;
            // Cunhar recompensas se não exceder supply máximo
            if (totalSupply() + reward <= MAX_SUPPLY) {
                _mint(user, reward);
                emit RewardsClaimed(user, reward);
            }
        } else {
            stakes[user].lastStakeTime = block.timestamp;
        }
    }

    /**
     * @dev Atualiza a taxa de recompensa de staking.
     * @param newRate Nova taxa (em 1e-11 por segundo)
     */
    function setStakingRewardRate(uint256 newRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        stakingRewardRate = newRate;
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
    }
}
