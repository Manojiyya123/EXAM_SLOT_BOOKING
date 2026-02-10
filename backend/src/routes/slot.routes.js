const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');

// All routes require ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * POST /api/admin/slots
 * Create a new slot
 */
router.post('/', async (req, res, next) => {
    try {
        const { examDate, startTime, endTime, category, purpose, quotas } = req.body;

        // Convert date format (YYYY-MM-DD to YYYYMMDD integer)
        const dateInt = parseInt(examDate.replace(/-/g, ''));

        // Insert slot
        const slotResult = await query(
            `INSERT INTO slots (exam_date, start_time, end_time, category, purpose, booking_open)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
            [dateInt, startTime, endTime, category, purpose]
        );

        const slot = slotResult.rows[0];

        // Insert quotas if provided
        if (quotas && Array.isArray(quotas)) {
            for (const q of quotas) {
                await query(
                    `INSERT INTO dept_quotas (slot_id, dept_id, quota_capacity, booked_count)
           VALUES ($1, $2, $3, 0)`,
                    [slot.slot_id, q.deptId, q.quota]
                );
            }
        }

        res.json(slot);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/slots
 * Get all slots
 */
router.get('/', async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM slots ORDER BY exam_date DESC');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/admin/slots/:slotId
 * Update a slot
 */
router.put('/:slotId', async (req, res, next) => {
    try {
        const { slotId } = req.params;
        const { examDate, startTime, endTime, category, purpose } = req.body;

        const dateInt = parseInt(examDate.replace(/-/g, ''));

        const result = await query(
            `UPDATE slots 
       SET exam_date = $1, start_time = $2, end_time = $3, category = $4, purpose = $5
       WHERE slot_id = $6
       RETURNING *`,
            [dateInt, startTime, endTime, category, purpose, slotId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/admin/slots/:slotId
 * Delete a slot
 */
router.delete('/:slotId', async (req, res, next) => {
    try {
        const { slotId } = req.params;

        // Check if exists
        const exists = await query('SELECT 1 FROM slots WHERE slot_id = $1', [slotId]);
        if (exists.rows.length === 0) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        // Try to delete (will fail if has bookings due to foreign key)
        try {
            await query('DELETE FROM slots WHERE slot_id = $1', [slotId]);
            res.json({ message: 'Slot deleted' });
        } catch (error) {
            res.status(400).json({ message: 'Cannot delete slot (likely has bookings/quotas)' });
        }
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/admin/slots/:slotId/toggle
 * Toggle slot booking status
 */
router.patch('/:slotId/toggle', async (req, res, next) => {
    try {
        const { slotId } = req.params;

        const result = await query(
            `UPDATE slots 
       SET booking_open = NOT booking_open 
       WHERE slot_id = $1 
       RETURNING *`,
            [slotId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/slots/:slotId/quotas
 * Add quota to a slot
 */
router.post('/:slotId/quotas', async (req, res, next) => {
    try {
        const { slotId } = req.params;
        const { deptId, quotaCapacity } = req.body;

        const result = await query(
            `INSERT INTO dept_quotas (slot_id, dept_id, quota_capacity, booked_count)
       VALUES ($1, $2, $3, 0)
       RETURNING *`,
            [slotId, deptId, quotaCapacity]
        );

        res.json({ message: 'Quota set', quota: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
