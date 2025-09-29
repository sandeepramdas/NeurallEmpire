import { RequestHandler } from 'express';
import { AuthenticatedRequest } from '@/types';

// Helper to cast authenticated route handlers to Express RequestHandler
export const authHandler = (handler: any): RequestHandler => handler;