const { query, transaction } = require('../config/database');

/**
 * Initialize a new exam with quotas
 * @param {object} examData - Exam initialization data
 */
const initializeExam = async (examData) => {
    const { examName, noOfDays, startingDate, examPurpose, quotas } = examData;

    // Calculate ending date
    const startDate = new Date(startingDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + noOfDays - 1);

    return await transaction(async (client) => {
        // 1. Create exam record
        const examResult = await client.query(
            `INSERT INTO exams (exam_name, no_of_days, starting_date, ending_date, exam_purpose, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
            [examName, noOfDays, startingDate, endDate.toISOString().split('T')[0], examPurpose || null]
        );

        const exam = examResult.rows[0];

        // 2. Create quotas for each department and category
        const createdQuotas = [];

        if (quotas && Array.isArray(quotas)) {
            for (const q of quotas) {
                const quotaResult = await client.query(
                    `INSERT INTO exam_quotas (exam_id, dept_id, category_type, max_count, current_fill, is_closed)
           VALUES ($1, $2, $3, $4, 0, false)
           RETURNING *`,
                    [exam.exam_id, q.deptId, q.categoryType, q.maxCount]
                );
                createdQuotas.push(quotaResult.rows[0]);
            }
        }

        return {
            exam,
            quotas: createdQuotas,
            message: `Exam initialized with ${createdQuotas.length} quotas`
        };
    });
};

/**
 * Get all exams
 */
const getAllExams = async () => {
    const result = await query(
        'SELECT * FROM exams ORDER BY created_at DESC'
    );
    // Transform snake_case to camelCase for frontend compatibility
    return result.rows.map(exam => ({
        examId: exam.exam_id,
        examName: exam.exam_name,
        noOfDays: exam.no_of_days,
        startingDate: exam.starting_date,
        endingDate: exam.ending_date,
        examPurpose: exam.exam_purpose,
        totalDayScholars: exam.total_day_scholars,
        totalHostelBoys: exam.total_hostel_boys,
        totalHostelGirls: exam.total_hostel_girls,
        createdAt: exam.created_at
    }));
};

/**
 * Get exam by ID
 * @param {number} examId - Exam ID
 */
const getExamById = async (examId) => {
    const result = await query(
        'SELECT * FROM exams WHERE exam_id = $1',
        [examId]
    );

    if (result.rows.length === 0) {
        throw new Error('Exam not found');
    }

    return result.rows[0];
};

/**
 * Get quotas for an exam
 * @param {number} examId - Exam ID
 */
const getQuotasForExam = async (examId) => {
    const result = await query(
        `SELECT eq.*, d.dept_code
     FROM exam_quotas eq
     JOIN departments d ON eq.dept_id = d.dept_id
     WHERE eq.exam_id = $1
     ORDER BY d.dept_code, eq.category_type`,
        [examId]
    );
    return result.rows;
};

/**
 * Delete an exam and its quotas
 * @param {number} examId - Exam ID
 */
const deleteExam = async (examId) => {
    return await transaction(async (client) => {
        // Delete quotas first (foreign key)
        await client.query(
            'DELETE FROM exam_quotas WHERE exam_id = $1',
            [examId]
        );

        // Delete exam
        await client.query(
            'DELETE FROM exams WHERE exam_id = $1',
            [examId]
        );

        return { message: 'Exam deleted successfully' };
    });
};

/**
 * Update a quota
 * @param {number} quotaId - Quota ID
 * @param {object} updates - Fields to update
 */
const updateQuota = async (quotaId, updates) => {
    const { maxCount } = updates;

    const result = await query(
        `UPDATE exam_quotas SET max_count = $1 WHERE id = $2 RETURNING *`,
        [maxCount, quotaId]
    );

    if (result.rows.length === 0) {
        throw new Error('Quota not found');
    }

    return result.rows[0];
};

/**
 * Toggle quota open/closed status
 * @param {number} quotaId - Quota ID
 */
const toggleQuota = async (quotaId) => {
    const result = await query(
        `UPDATE exam_quotas 
     SET is_closed = NOT COALESCE(is_closed, false) 
     WHERE id = $1 
     RETURNING *`,
        [quotaId]
    );

    if (result.rows.length === 0) {
        throw new Error('Quota not found');
    }

    return result.rows[0];
};

/**
 * Delete a quota
 * @param {number} quotaId - Quota ID
 */
const deleteQuota = async (quotaId) => {
    await query('DELETE FROM exam_quotas WHERE id = $1', [quotaId]);
    return { message: 'Quota deleted' };
};

module.exports = {
    initializeExam,
    getAllExams,
    getExamById,
    getQuotasForExam,
    deleteExam,
    updateQuota,
    toggleQuota,
    deleteQuota
};
