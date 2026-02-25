import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { verifyMessage } from "viem";
import { upsertUser, getUserByOpenId } from "./db";
import { nanoid } from "nanoid";
import { farmingRouter } from "./routers/farming";
import { inventoryRouter } from "./routers/inventory";
import { marketplaceRouter } from "./routers/marketplace";
import { craftingRouter } from "./routers/crafting";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    
    // Web3 Authentication
    web3Nonce: publicProcedure
      .input(z.object({ address: z.string() }))
      .mutation(async ({ input }) => {
        // Gerar nonce aleatório
        const nonce = nanoid();
        // Em produção, armazenar nonce em cache (Redis) com TTL de 5 minutos
        // Por enquanto, apenas retornar
        return { nonce };
      }),
    
    web3Login: publicProcedure
      .input(z.object({
        address: z.string(),
        signature: z.string(),
        nonce: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const { address, signature, nonce } = input;
          
          // Validar assinatura
          const message = `Sign this message to login to Harvest Realm\n\nNonce: ${nonce}\nAddress: ${address}`;
          
          const isValid = await verifyMessage({
            address: address as `0x${string}`,
            message,
            signature: signature as `0x${string}`,
          });
          
          if (!isValid) {
            return { success: false, error: 'Assinatura inválida' };
          }
          
          // Upsert jogador no banco de dados
          await upsertUser({
            openId: address.toLowerCase(),
            walletAddress: address,
            name: null,
            email: null,
            loginMethod: 'web3',
          });
          
          // Obter jogador
          const user = await getUserByOpenId(address.toLowerCase());
          
          if (!user) {
            return { success: false, error: 'Falha ao criar usuário' };
          }
          
          // Criar sessão
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, JSON.stringify(user), cookieOptions);
          
          return { success: true, user };
        } catch (error: any) {
          console.error('[Web3Login] Error:', error);
          return { success: false, error: error?.message || 'Erro ao fazer login' };
        }
      }),
    
    web3Logout: protectedProcedure
      .mutation(({ ctx }) => {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return { success: true };
      }),
  }),

  // Game routers
  game: router({
    farming: farmingRouter,
    inventory: inventoryRouter,
    marketplace: marketplaceRouter,
    crafting: craftingRouter,
    // TODO: Adicionar routers de jogo aqui
    // missions: router({ ... }),
    // factions: router({ ... }),
  }),
});

export type AppRouter = typeof appRouter;

export const appCaller = appRouter.createCaller({} as any);

/**
 * Tipos para Web3 Auth
 */
export interface Web3LoginInput {
  address: string;
  signature: string;
  nonce: string;
}

export interface Web3LoginResponse {
  success: boolean;
  error?: string;
  user?: any;
}

/**
 * Tipos para Farming
 */
export interface PlantCropInput {
  landId: number;
  cropTypeId: number;
  gridX: number;
  gridY: number;
}

export interface HarvestCropInput {
  cropId: number;
}
