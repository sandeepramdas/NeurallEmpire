import { AuthUser } from './index';
import { Organization } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      organization?: Organization;
      tenant?: string;
    }
  }
}