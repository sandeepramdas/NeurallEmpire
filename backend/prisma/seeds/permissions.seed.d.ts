import { PrismaClient } from '@prisma/client';
declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare const PERMISSIONS: ({
    module: string;
    action: string;
    resource: string;
    code: string;
    description: string;
    category: string;
    isAdminOnly: boolean;
} | {
    module: string;
    action: string;
    resource: string;
    code: string;
    description: string;
    category: string;
    isAdminOnly?: undefined;
})[];
export declare const DEFAULT_ROLES: {
    code: string;
    name: string;
    description: string;
    isSystem: boolean;
    isDefault: boolean;
    priority: number;
    permissions: string[];
}[];
export declare function seedPermissionsAndRoles(): Promise<{
    permissions: number;
    roles: number;
}>;
export { prisma };
//# sourceMappingURL=permissions.seed.d.ts.map