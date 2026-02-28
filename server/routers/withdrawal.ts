import { router, publicProcedure } from '@/server/trpc';
import { z } from 'zod';
import { db } from '@/server/db';
import { inventory, users, withdrawalRequests } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Router para gerenciar saques de itens off-chain para NFTs on-chain
 * Permite que jogadores transformem itens do inventário em NFTs ERC-1155
 */
export const withdrawalRouter = router({
  /**
   * Obter o histórico de saques do jogador
   */
  getWithdrawalHistory: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const history = await db
        .select()
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.userId, input.userId))
        .orderBy((t) => t.createdAt);

      return history;
    }),

  /**
   * Obter itens disponíveis para saque
   * Retorna todos os itens no inventário do jogador
   */
  getWithdrawableItems: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const items = await db
        .select()
        .from(inventory)
        .where(eq(inventory.userId, input.userId));

      return items.map((item) => ({
        ...item,
        canWithdraw: item.quantity > 0,
      }));
    }),

  /**
   * Criar uma solicitação de saque
   * Valida se o jogador possui o item e se há saldo suficiente
   * Cria um registro de solicitação que será processado pelo GameEconomyManager
   */
  requestWithdrawal: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        itemId: z.number(),
        quantity: z.number().min(1),
        withdrawalFeePercentage: z.number().default(0.05), // 5% de taxa
      })
    )
    .mutation(async ({ input }) => {
      // Validar se o jogador existe
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!user.length) {
        throw new Error('Jogador não encontrado');
      }

      // Validar se o jogador possui o item no inventário
      const inventoryItem = await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.userId, input.userId),
            eq(inventory.itemId, input.itemId)
          )
        )
        .limit(1);

      if (!inventoryItem.length || inventoryItem[0].quantity < input.quantity) {
        throw new Error(
          'Quantidade insuficiente no inventário para realizar o saque'
        );
      }

      // Calcular taxa de saque
      const withdrawalFee = Math.floor(
        input.quantity * input.withdrawalFeePercentage
      );
      const quantityAfterFee = input.quantity - withdrawalFee;

      if (quantityAfterFee <= 0) {
        throw new Error(
          'Quantidade após taxa é zero. Aumente a quantidade para sacar.'
        );
      }

      // Criar solicitação de saque
      const withdrawalRequest = await db
        .insert(withdrawalRequests)
        .values({
          userId: input.userId,
          itemId: input.itemId,
          quantity: input.quantity,
          quantityAfterFee,
          withdrawalFee,
          status: 'pending', // pending, processing, completed, failed
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Deduzir quantidade do inventário (reservar para saque)
      await db
        .update(inventory)
        .set({
          quantity: inventoryItem[0].quantity - input.quantity,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventory.userId, input.userId),
            eq(inventory.itemId, input.itemId)
          )
        );

      return {
        success: true,
        withdrawalId: withdrawalRequest[0].id,
        message: `Solicitação de saque criada. ${withdrawalFee} unidades serão deduzidas como taxa.`,
        details: {
          itemId: input.itemId,
          requestedQuantity: input.quantity,
          quantityToReceive: quantityAfterFee,
          fee: withdrawalFee,
        },
      };
    }),

  /**
   * Cancelar uma solicitação de saque pendente
   * Devolve os itens ao inventário do jogador
   */
  cancelWithdrawal: publicProcedure
    .input(z.object({ withdrawalId: z.string() }))
    .mutation(async ({ input }) => {
      // Obter a solicitação de saque
      const withdrawal = await db
        .select()
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.id, input.withdrawalId))
        .limit(1);

      if (!withdrawal.length) {
        throw new Error('Solicitação de saque não encontrada');
      }

      if (withdrawal[0].status !== 'pending') {
        throw new Error(
          `Não é possível cancelar uma solicitação com status: ${withdrawal[0].status}`
        );
      }

      // Devolver os itens ao inventário
      const inventoryItem = await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.userId, withdrawal[0].userId),
            eq(inventory.itemId, withdrawal[0].itemId)
          )
        )
        .limit(1);

      if (inventoryItem.length) {
        await db
          .update(inventory)
          .set({
            quantity: inventoryItem[0].quantity + withdrawal[0].quantity,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventory.userId, withdrawal[0].userId),
              eq(inventory.itemId, withdrawal[0].itemId)
            )
          );
      } else {
        // Se o item não existe mais no inventário, criar uma nova entrada
        await db.insert(inventory).values({
          userId: withdrawal[0].userId,
          itemId: withdrawal[0].itemId,
          quantity: withdrawal[0].quantity,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Atualizar status da solicitação
      await db
        .update(withdrawalRequests)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(withdrawalRequests.id, input.withdrawalId));

      return {
        success: true,
        message: 'Solicitação de saque cancelada. Itens devolvidos ao inventário.',
      };
    }),

  /**
   * Obter detalhes de uma solicitação de saque
   */
  getWithdrawalDetails: publicProcedure
    .input(z.object({ withdrawalId: z.string() }))
    .query(async ({ input }) => {
      const withdrawal = await db
        .select()
        .from(withdrawalRequests)
        .where(eq(withdrawalRequests.id, input.withdrawalId))
        .limit(1);

      if (!withdrawal.length) {
        throw new Error('Solicitação de saque não encontrada');
      }

      return withdrawal[0];
    }),
});
