const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { authenticate, authorize } = require('../middleware/auth');
const { query, transaction } = require('../config/database');
const examService = require('../services/exam.service');

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// All routes require ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// ============ DEPARTMENT ROUTES ============

/**
 * GET /api/admin/departments
 * Get all departments
 */
router.get('/departments', async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM departments ORDER BY dept_code');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/sync-departments
 * Sync departments from student master upload
 */
router.post('/sync-departments', async (req, res, next) => {
    try {
        // Get all unique dept codes from student_master_upload
        const result = await query(
            'SELECT DISTINCT UPPER(TRIM(dept_code)) as dept_code FROM student_master_upload WHERE dept_code IS NOT NULL'
        );

        let created = 0;
        for (const row of result.rows) {
            const code = row.dept_code;
            // Check if exists
            const exists = await query(
                'SELECT 1 FROM departments WHERE dept_code = $1',
                [code]
            );

            if (exists.rows.length === 0) {
                await query(
                    'INSERT INTO departments (dept_code) VALUES ($1)',
                    [code]
                );
                created++;
            }
        }

        res.json({
            message: `Synced departments. Created ${created} new departments. Total deptCodes found: ${result.rows.length}`
        });
    } catch (error) {
        next(error);
    }
});

// ============ STUDENT ROUTES ============

/**
 * GET /api/admin/students
 * Get all students
 */
router.get('/students', async (req, res, next) => {
    try {
        const result = await query(
            `SELECT s.*, d.dept_code 
       FROM students s 
       LEFT JOIN departments d ON s.dept_id = d.dept_id 
       ORDER BY s.roll_no`
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/admin/students/:rollNo
 * Update a student
 */
router.put('/students/:rollNo', async (req, res, next) => {
    try {
        const { rollNo } = req.params;
        const { name, email, category, deptId } = req.body;

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (email) {
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }
        if (category) {
            updates.push(`category = $${paramCount++}`);
            values.push(category);
        }
        if (deptId) {
            updates.push(`dept_id = $${paramCount++}`);
            values.push(deptId);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(rollNo);
        const result = await query(
            `UPDATE students SET ${updates.join(', ')} WHERE roll_no = $${paramCount} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// ============ STUDENT MASTER UPLOAD ROUTES ============

/**
 * POST /api/admin/student-master/upload
 * Upload student master Excel file
 */
router.post('/student-master/upload', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Parse Excel file
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        let inserted = 0;
        let updated = 0;
        let errors = [];

        for (const row of data) {
            try {
                // Map Excel columns to database fields
                const rollNo = row['Roll No'] || row['roll_no'] || row['ROLL NO'];
                const name = row['Name'] || row['name'] || row['NAME'];
                const email = row['Email'] || row['email'] || row['EMAIL'];
                const deptCode = row['Dept Code'] || row['dept_code'] || row['DEPT CODE'] || row['Department'];
                const studentType = row['Student Type'] || row['student_type'] || row['TYPE'] || 'DAY';
                const gender = row['Gender'] || row['gender'] || row['GENDER'];

                if (!rollNo || !name || !email) {
                    errors.push(`Missing required fields for row: ${JSON.stringify(row)}`);
                    continue;
                }

                // Check if exists
                const exists = await query(
                    'SELECT 1 FROM student_master_upload WHERE roll_no = $1',
                    [rollNo]
                );

                if (exists.rows.length > 0) {
                    // Update
                    await query(
                        `UPDATE student_master_upload 
             SET name = $1, email = $2, dept_code = $3, student_type = $4, gender = $5
             WHERE roll_no = $6`,
                        [name, email, deptCode, studentType, gender, rollNo]
                    );
                    updated++;
                } else {
                    // Insert
                    await query(
                        `INSERT INTO student_master_upload (roll_no, name, email, dept_code, student_type, gender)
             VALUES ($1, $2, $3, $4, $5, $6)`,
                        [rollNo, name, email, deptCode, studentType, gender]
                    );
                    inserted++;
                }
            } catch (rowError) {
                errors.push(`Error processing row: ${rowError.message}`);
            }
        }

        res.json({
            message: 'Upload processed',
            inserted,
            updated,
            total: data.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/student-master
 * Get all student master data
 */
router.get('/student-master', async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM student_master_upload ORDER BY roll_no');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/student-master/strength
 * Get calculated strength from master data
 */
router.get('/student-master/strength', async (req, res, next) => {
    try {
        const result = await query(`
      SELECT 
        UPPER(dept_code) as dept_code,
        COUNT(*) FILTER (WHERE UPPER(student_type) = 'DAY') as day_count,
        COUNT(*) FILTER (WHERE UPPER(student_type) = 'HOSTEL' AND UPPER(gender) = 'MALE') as hostel_male_count,
        COUNT(*) FILTER (WHERE UPPER(student_type) = 'HOSTEL' AND UPPER(gender) = 'FEMALE') as hostel_female_count,
        COUNT(*) as total
      FROM student_master_upload
      WHERE dept_code IS NOT NULL
      GROUP BY UPPER(dept_code)
      ORDER BY UPPER(dept_code)
    `);

        // Format to match Spring Boot response
        const formatted = result.rows.map(row => ({
            deptCode: row.dept_code,
            dayCount: parseInt(row.day_count),
            hostelMaleCount: parseInt(row.hostel_male_count),
            hostelFemaleCount: parseInt(row.hostel_female_count),
            total: parseInt(row.total)
        }));

        res.json(formatted);
    } catch (error) {
        next(error);
    }
});

// ============ EXAM ROUTES ============

/**
 * POST /api/admin/exam/initialize
 * Initialize a new exam with quotas
 */
router.post('/exam/initialize', async (req, res, next) => {
    try {
        const result = await examService.initializeExam(req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/exams
 * Get all exams
 */
router.get('/exams', async (req, res, next) => {
    try {
        const exams = await examService.getAllExams();
        res.json(exams);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/exams/:examId
 * Get exam by ID
 */
router.get('/exams/:examId', async (req, res, next) => {
    try {
        const { examId } = req.params;
        if (!examId || examId === 'undefined' || isNaN(parseInt(examId))) {
            return res.status(400).json({ message: 'Invalid exam ID' });
        }
        const exam = await examService.getExamById(examId);
        res.json(exam);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * GET /api/admin/exams/:examId/quotas
 * Get quotas for an exam
 */
router.get('/exams/:examId/quotas', async (req, res, next) => {
    try {
        const { examId } = req.params;
        if (!examId || examId === 'undefined' || isNaN(parseInt(examId))) {
            return res.status(400).json({ message: 'Invalid exam ID' });
        }
        const quotas = await examService.getQuotasForExam(examId);
        res.json(quotas);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * DELETE /api/admin/exams/:examId
 * Delete an exam
 */
router.delete('/exams/:examId', async (req, res, next) => {
    try {
        const { examId } = req.params;
        console.log('Delete exam request for examId:', examId);

        if (!examId || examId === 'undefined' || isNaN(parseInt(examId))) {
            return res.status(400).json({ message: 'Invalid exam ID' });
        }

        await examService.deleteExam(examId);
        res.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        console.error('Delete exam error:', error.message);
        res.status(400).json({ message: error.message });
    }
});

// ============ QUOTA ROUTES ============

/**
 * PATCH /api/admin/quotas/:quotaId
 * Update a quota
 */
router.patch('/quotas/:quotaId', async (req, res, next) => {
    try {
        const { quotaId } = req.params;
        if (!quotaId || quotaId === 'undefined' || isNaN(parseInt(quotaId))) {
            return res.status(400).json({ message: 'Invalid quota ID' });
        }
        const quota = await examService.updateQuota(quotaId, req.body);
        res.json(quota);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * PATCH /api/admin/quotas/:quotaId/toggle
 * Toggle quota open/closed
 */
router.patch('/quotas/:quotaId/toggle', async (req, res, next) => {
    try {
        const quota = await examService.toggleQuota(req.params.quotaId);
        res.json(quota);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * DELETE /api/admin/quotas/:quotaId
 * Delete a quota
 */
router.delete('/quotas/:quotaId', async (req, res, next) => {
    try {
        await examService.deleteQuota(req.params.quotaId);
        res.json({ message: 'Quota deleted' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// ============ BOOKING ROUTES ============

/**
 * GET /api/admin/bookings
 * Get all bookings (with optional filters)
 */
router.get('/bookings', async (req, res, next) => {
    try {
        const { slotId, deptId } = req.query;

        // Query with joins to get all details
        // Note: New system uses exam_quota_id, but we keep slot_id support if legacy data exists
        let sql = `
            SELECT 
                b.booking_id, b.roll_no, b.dept_id, b.booked_at, b.exam_quota_id, b.slot_id,
                s.name as student_name, s.email as student_email, 
                d.dept_code,
                eq.category_type, eq.id as quota_id,
                e.exam_name, e.starting_date,
                es.exam_date as slot_date, es.start_time as slot_start, es.end_time as slot_end, es.category as slot_category
            FROM bookings b
            JOIN students s ON b.roll_no = s.roll_no
            JOIN departments d ON b.dept_id = d.dept_id
            LEFT JOIN exam_quotas eq ON b.exam_quota_id = eq.id
            LEFT JOIN exams e ON eq.exam_id = e.exam_id
            LEFT JOIN slots es ON b.slot_id = es.slot_id
        `;

        const conditions = [];
        const values = [];

        if (slotId) {
            values.push(slotId);
            conditions.push(`b.slot_id = $${values.length}`);
        }
        if (deptId) {
            values.push(deptId);
            conditions.push(`b.dept_id = $${values.length}`);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY b.booked_at DESC';

        const result = await query(sql, values);

        // Transform to nested structure expected by frontend
        const formattedBookings = result.rows.map(row => ({
            bookingId: row.booking_id,
            rollNo: row.roll_no,
            bookedAt: row.booked_at,
            student: {
                name: row.student_name,
                rollNo: row.roll_no,
                email: row.student_email
            },
            department: {
                deptCode: row.dept_code,
                deptId: row.dept_id
            },
            // For new system
            examQuota: row.exam_quota_id ? {
                id: row.exam_quota_id,
                categoryType: row.category_type,
                exam: {
                    examName: row.exam_name,
                    startingDate: row.starting_date
                }
            } : null,
            // For legacy/slot system
            slot: row.slot_id ? {
                slotId: row.slot_id,
                examDate: row.slot_date,
                startTime: row.slot_start,
                endTime: row.slot_end,
                category: row.slot_category
            } : null
        }));

        res.json(formattedBookings);
    } catch (error) {
        console.error('Bookings query error:', error.message);
        res.status(500).json({ message: 'Error fetching bookings', error: error.message });
    }
});

/**
 * GET /api/admin/strength
 * Get all department exam strengths
 */
router.get('/strength', async (req, res, next) => {
    try {
        const result = await query(
            `SELECT des.*, d.dept_code 
       FROM dept_exam_strength des
       JOIN departments d ON des.dept_id = d.dept_id
       ORDER BY d.dept_code`
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/strength
 * Update department strength
 */
router.post('/strength', async (req, res, next) => {
    try {
        const { deptId, dayCount, hostelMaleCount, hostelFemaleCount } = req.body;

        // Check if exists
        const exists = await query(
            'SELECT * FROM dept_exam_strength WHERE dept_id = $1',
            [deptId]
        );

        let result;
        if (exists.rows.length > 0) {
            result = await query(
                `UPDATE dept_exam_strength 
         SET day_count = $1, hostel_male_count = $2, hostel_female_count = $3
         WHERE dept_id = $4 RETURNING *`,
                [dayCount, hostelMaleCount, hostelFemaleCount, deptId]
            );
        } else {
            result = await query(
                `INSERT INTO dept_exam_strength (dept_id, day_count, hostel_male_count, hostel_female_count)
         VALUES ($1, $2, $3, $4) RETURNING *`,
                [deptId, dayCount, hostelMaleCount, hostelFemaleCount]
            );
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/exam-slots
 * Get all exam slots
 */
router.get('/exam-slots', async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM exam_slots ORDER BY exam_date, slot_number');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/generate-slots
 * Generate slots (placeholder - implement if needed)
 */
router.post('/generate-slots', async (req, res, next) => {
    try {
        // This is a complex operation from the Spring Boot service
        // Implement based on SlotGenerationService if needed
        res.status(501).json({ message: 'Slot generation not implemented yet' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
