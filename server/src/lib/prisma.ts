import { PrismaClient } from '@prisma/client';
import { env } from '../env.js';
import { LocalStore } from './localStore.js';

export const prisma: any = env.USE_LOCAL_STORE ? new LocalStore() : new PrismaClient();
