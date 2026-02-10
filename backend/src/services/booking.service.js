const { query, transaction } = require('../config/database');

/**
 * Book an exam quota slot (new system)
 * Uses PostgreSQL transaction with row-level locking for race-condition safety
 * @param {string} rollNo - Student roll number
 * @param {number} quotaId - Exam quota ID
 */
const bookExamQuota = async (rollNo, quotaId) => {
    return await transaction(async (client) => {
        // 1. Get student
        const studentResult = await client.query(
            `SELECT s.*, d.dept_code 
       FROM students s 
       JOIN departments d ON s.dept_id = d.dept_id 
       WHERE s.roll_no = $1`,
            [rollNo]
        );

        if (studentResult.rows.length === 0) {
            throw new Error('Student not found');
        }

        const student = studentResult.rows[0];

        // 2. Check if student already has a booking
        const existingBooking = await client.query(
            'SELECT * FROM bookings WHERE roll_no = $1',
            [rollNo]
        );

        if (existingBooking.rows.length > 0) {
            throw new Error('You have already booked a slot');
        }

        // 3. Get and lock the quota row (FOR UPDATE)
        const quotaResult = await client.query(
            `SELECT eq.*, e.exam_name, e.starting_date, d.dept_code
       FROM exam_quotas eq
       JOIN exams e ON eq.exam_id = e.exam_id
       JOIN departments d ON eq.dept_id = d.dept_id
       WHERE eq.id = $1
       FOR UPDATE`,
            [quotaId]
        );

        if (quotaResult.rows.length === 0) {
            throw new Error('Quota not found');
        }

        const quota = quotaResult.rows[0];

        // 4. Check if quota is closed
        if (quota.is_closed) {
            throw new Error('Booking is closed for this slot');
        }

        // 5. Check if quota is full
        if (quota.current_fill >= quota.max_count) {
            throw new Error('No slots available - quota is full');
        }

        // 6. Map student category to categoryType
        let studentCategoryType;
        switch (student.category) {
            case 'DAY':
                studentCategoryType = 1;
                break;
            case 'HOSTEL_MALE':
                studentCategoryType = 2;
                break;
            case 'HOSTEL_FEMALE':
                studentCategoryType = 3;
                break;
            default:
                studentCategoryType = 1;
        }

        // 7. Validate quota matches student profile
        if (quota.category_type !== studentCategoryType) {
            throw new Error('This slot is not for your category');
        }

        if (quota.dept_code.toLowerCase() !== student.dept_code.toLowerCase()) {
            throw new Error('This slot is not for your department');
        }

        // 8. Increment current_fill atomically
        await client.query(
            `UPDATE exam_quotas 
       SET current_fill = current_fill + 1 
       WHERE id = $1`,
            [quotaId]
        );

        // 9. Create booking record
        const bookingResult = await client.query(
            `INSERT INTO bookings (roll_no, dept_id, exam_quota_id, booked_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
            [rollNo, student.dept_id, quotaId]
        );

        const booking = bookingResult.rows[0];

        // 10. Return booking confirmation
        return {
            bookingId: booking.booking_id,
            rollNo: rollNo,
            examName: quota.exam_name,
            examDate: quota.starting_date,
            department: student.dept_code,
            category: studentCategoryType === 1 ? 'Day Scholar' :
                studentCategoryType === 2 ? 'Hostel Boys' : 'Hostel Girls',
            message: 'Booking successful!'
        };
    });
};

/**
 * Get available exam slots for a student
 * @param {string} rollNo - Student roll number
 */
const getAvailableSlotsForStudent = async (rollNo) => {
    // Get student info
    const studentResult = await query(
        `SELECT s.*, d.dept_code 
     FROM students s 
     JOIN departments d ON s.dept_id = d.dept_id 
     WHERE s.roll_no = $1`,
        [rollNo]
    );

    if (studentResult.rows.length === 0) {
        throw new Error('Student not found');
    }

    const student = studentResult.rows[0];

    // Map category to categoryType
    let categoryType;
    switch (student.category) {
        case 'DAY':
            categoryType = 1;
            break;
        case 'HOSTEL_MALE':
            categoryType = 2;
            break;
        case 'HOSTEL_FEMALE':
            categoryType = 3;
            break;
        default:
            categoryType = 1;
    }

    // Get available quotas for student's department and category
    const quotaResult = await query(
        `SELECT eq.*, e.exam_name, e.starting_date, d.dept_code
     FROM exam_quotas eq
     JOIN exams e ON eq.exam_id = e.exam_id
     JOIN departments d ON eq.dept_id = d.dept_id
     WHERE d.dept_code = $1
       AND eq.category_type = $2
       AND (eq.is_closed IS NULL OR eq.is_closed = false)
       AND eq.current_fill < eq.max_count`,
        [student.dept_code, categoryType]
    );

    // Format response
    return quotaResult.rows.map(q => ({
        slotId: q.id,
        examDate: q.starting_date,
        examName: q.exam_name,
        startTime: '09:00',
        endTime: '17:00',
        maxCount: q.max_count,
        bookedCount: q.current_fill,
        available: q.max_count - q.current_fill,
        department: student.dept_code,
        category: categoryType === 1 ? 'Day Scholar' :
            categoryType === 2 ? 'Hostel Boys' : 'Hostel Girls',
        quotas: [{
            quotaId: q.id,
            quotaCapacity: q.max_count,
            bookedCount: q.current_fill,
            department: { deptCode: student.dept_code }
        }]
    }));
};

module.exports = {
    bookExamQuota,
    getAvailableSlotsForStudent
};
