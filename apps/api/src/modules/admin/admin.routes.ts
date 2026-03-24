import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../../middleware/rbac.js';
import { AuthRequest, requireAuth } from '../../auth.js';

const router = Router();
const prisma = new PrismaClient();

// Allow CORS Preflight OPTIONS requests to bypass auth, but enforce globally
router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  requireAuth(req as AuthRequest, res, next);
});

// Users Endpoints
router.get('/users', requirePermission('admin', 'view'), async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        roleRelation: true,
        scopes: { include: { garage: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/users/:id', requirePermission('admin', 'manage'), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { roleId, garageIds } = req.body;

    // Use interactive transaction to guarantee atomicity for UserScope rewrite
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Update basic user data and role link
      const user = await tx.user.update({
        where: { id },
        data: { roleId },
      });

      // 2. Wipe existing scopes if a new garage array is provided
      if (Array.isArray(garageIds)) {
        await tx.userScope.deleteMany({
          where: { userId: id }
        });

        // 3. Re-insert fresh scopes
        if (garageIds.length > 0) {
          await tx.userScope.createMany({
            data: garageIds.map((garageId: string) => ({
              userId: id,
              garageId
            }))
          });
        }
      }

      // 4. Return enriched entity
      return tx.user.findUnique({
        where: { id },
        include: {
          roleRelation: true,
          scopes: { include: { garage: true } }
        }
      });
    });

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Roles Endpoints
router.get('/roles', requirePermission('admin', 'view'), async (req: AuthRequest, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' }
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.post('/roles', requirePermission('admin', 'manage'), async (req: AuthRequest, res) => {
  try {
    const { name, permissions } = req.body; // permissions: [{ module: string, access: 'none'|'view'|'manage' }]

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const role = await prisma.role.create({
      data: {
        name,
        permissions: {
          create: Array.isArray(permissions) ? permissions : []
        }
      },
      include: { permissions: true }
    });

    res.status(201).json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

router.patch('/roles/:id', requirePermission('admin', 'manage'), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const { name, permissions } = req.body;

    const updatedRole = await prisma.$transaction(async (tx) => {
      let role = null;

      // Update name safely
      if (name) {
        role = await tx.role.update({
          where: { id },
          data: { name }
        });
      }

      // Wipe and rewrite nested permissions map
      if (Array.isArray(permissions)) {
        await tx.rolePermission.deleteMany({
          where: { roleId: id }
        });

        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((p: any) => ({
              roleId: id,
              module: p.module,
              access: p.access
            }))
          });
        }
      }

      return tx.role.findUnique({
        where: { id },
        include: { permissions: true }
      });
    });

    res.json(updatedRole);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

export default router;
