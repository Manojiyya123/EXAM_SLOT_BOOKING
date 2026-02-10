const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const bookingService = require('../services/booking.service');

// All routes require STUDENT role
router.use(authenticate);
router.use(authorize('STUDENT'));

/**
 * GET /api/student/slots
 * Get available slots for the authenticated student
 */
router.get('/slots', async (req, res, next) => {
    try {
        const rollNo = req.user.subject;
        const slots = await bookingService.getAvailableSlotsForStudent(rollNo);
        res.json(slots);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/student/book
 * Book a slot for the authenticated student
 */
router.post('/book', async (req, res, next) => {
    try {
        const rollNo = req.user.subject;
        const { slotId } = req.body;

        if (!slotId) {
            return res.status(400).json({ message: 'slotId is required' });
        }

        const result = await bookingService.bookExamQuota(rollNo, slotId);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * GET /api/student/exam-slots
 * Alias for slots (for backward compatibility)
 */
router.get('/exam-slots', async (req, res, next) => {
    try {
        const rollNo = req.user.subject;
        const slots = await bookingService.getAvailableSlotsForStudent(rollNo);
        res.json(slots);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/student/book-exam-slot
 * Book an exam slot (alternate endpoint)
 */
router.post('/book-exam-slot', async (req, res, next) => {
    try {
        const rollNo = req.user.subject;
        const { examSlotId } = req.body;

        if (!examSlotId) {
            return res.status(400).json({ message: 'examSlotId is required' });
        }

        const result = await bookingService.bookExamQuota(rollNo, examSlotId);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
