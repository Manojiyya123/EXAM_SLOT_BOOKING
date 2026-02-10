
require('dotenv').config();
const { query, pool } = require('./config/database');

(async () => {
    try {
        console.log('--- Debugging Bookings API ---');

        // Simulating the query from admin.routes.js (UPDATED)
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
            ORDER BY b.booked_at DESC
        `;

        // Note: The original query in admin.routes.js was different (using slot_id?). 
        // I am checking what data we actually have.

        const result = await query(sql);
        console.log(`Found ${result.rows.length} bookings.`);
        if (result.rows.length > 0) {
            console.log('First booking sample:', JSON.stringify(result.rows[0], null, 2));
        } else {
            console.log('No bookings found. Please ensure there is data.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
})();
