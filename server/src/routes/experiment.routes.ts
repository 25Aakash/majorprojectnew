import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.middleware';
import Experiment from '../models/Experiment.model';

const router = Router();

/**
 * A/B Testing (Experiment) API
 *
 * Educators / admins create experiments that split students into
 * variant groups and track a primary metric.  The platform
 * automatically assigns students and queries their outcomes to
 * determine which adaptive strategy works best for each condition.
 */

// ── LIST all experiments ──
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const experiments = await Experiment.find().sort({ createdAt: -1 }).lean();
    res.json(experiments);
  } catch (error) {
    console.error('Error listing experiments:', error);
    res.status(500).json({ message: 'Error listing experiments' });
  }
});

// ── GET single experiment ──
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await Experiment.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Experiment not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching experiment' });
  }
});

// ── CREATE experiment (educator / admin) ──
router.post(
  '/',
  authMiddleware,
  roleMiddleware('educator', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, targetConditions, variants, primaryMetric } = req.body;

      if (!name || !variants || variants.length < 2) {
        return res.status(400).json({
          message: 'An experiment needs a name and at least 2 variants.',
        });
      }

      const experiment = await Experiment.create({
        name,
        description,
        targetConditions: targetConditions ?? [],
        variants,
        primaryMetric: primaryMetric ?? 'engagement',
        createdBy: req.user?._id,
      });

      res.status(201).json(experiment);
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(409).json({ message: 'Experiment name already exists' });
      }
      console.error('Error creating experiment:', error);
      res.status(500).json({ message: 'Error creating experiment' });
    }
  }
);

// ── UPDATE experiment status ──
router.patch(
  '/:id/status',
  authMiddleware,
  roleMiddleware('educator', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.body;
      if (!['draft', 'active', 'paused', 'completed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const update: any = { status };
      if (status === 'active') update.startDate = new Date();
      if (status === 'completed') update.endDate = new Date();

      const doc = await Experiment.findByIdAndUpdate(req.params.id, update, { new: true });
      if (!doc) return res.status(404).json({ message: 'Experiment not found' });
      res.json(doc);
    } catch (error) {
      res.status(500).json({ message: 'Error updating experiment' });
    }
  }
);

// ── ASSIGN a student to a variant ──
router.post(
  '/:id/assign',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      if (!userId) return res.status(401).json({ message: 'Not authenticated' });

      const experiment = await Experiment.findById(req.params.id);
      if (!experiment) return res.status(404).json({ message: 'Experiment not found' });
      if (experiment.status !== 'active') {
        return res.status(400).json({ message: 'Experiment is not active' });
      }

      // Already assigned?
      const existing = experiment.assignments.get(userId);
      if (existing) {
        return res.json({ variant: existing, alreadyAssigned: true });
      }

      // Weighted random assignment
      const totalWeight = experiment.variants.reduce((s, v) => s + v.weight, 0);
      let rand = Math.random() * totalWeight;
      let chosen = experiment.variants[0].name;
      for (const v of experiment.variants) {
        rand -= v.weight;
        if (rand <= 0) {
          chosen = v.name;
          break;
        }
      }

      experiment.assignments.set(userId, chosen);
      await experiment.save();

      res.json({ variant: chosen, alreadyAssigned: false });
    } catch (error) {
      console.error('Error assigning variant:', error);
      res.status(500).json({ message: 'Error assigning variant' });
    }
  }
);

// ── GET which variant a student is in ──
router.get(
  '/:id/my-variant',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id?.toString();
      const experiment = await Experiment.findById(req.params.id);
      if (!experiment) return res.status(404).json({ message: 'Experiment not found' });

      const variant = experiment.assignments.get(userId ?? '');
      if (!variant) {
        return res.json({ assigned: false });
      }

      const variantConfig = experiment.variants.find((v) => v.name === variant);
      res.json({ assigned: true, variant, config: variantConfig?.config ?? {} });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching variant' });
    }
  }
);

// ── RECORD outcome measurement ──
router.post(
  '/:id/record',
  authMiddleware,
  roleMiddleware('educator', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { variantName, metrics } = req.body;
      const experiment = await Experiment.findById(req.params.id);
      if (!experiment) return res.status(404).json({ message: 'Experiment not found' });

      const existing = experiment.results.get(variantName) ?? {};
      // Merge new metrics with existing
      experiment.results.set(variantName, { ...(existing as any), ...metrics });
      await experiment.save();

      res.json({ message: 'Metrics recorded', variant: variantName });
    } catch (error) {
      res.status(500).json({ message: 'Error recording metrics' });
    }
  }
);

// ── DELETE experiment ──
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const doc = await Experiment.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ message: 'Experiment not found' });
      res.json({ message: 'Experiment deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting experiment' });
    }
  }
);

export default router;
