const { query } = require('../config/database');
const { generateToken } = require('../config/jwt');
const otpService = require('./otp.service');

/**
 * Initiate student login - send OTP
 * @param {string} rollNo - Student roll number
 * @param {string} email - Student email
 */
const initiateStudentLogin = async (rollNo, email) => {
    // 1. Verify against StudentMasterUpload (Source of Truth)
    const masterResult = await query(
        'SELECT * FROM student_master_upload WHERE roll_no = $1',
        [rollNo]
    );

    if (masterResult.rows.length === 0) {
        throw new Error('Student not found in master records');
    }

    const masterRecord = masterResult.rows[0];

    if (masterRecord.email.toLowerCase() !== email.toLowerCase()) {
        throw new Error('Email does not match master records');
    }

    // 2. Rate limit check
    if (!otpService.checkRateLimit(`rate:${email}`, 5, 300)) {
        throw new Error('Too many attempts. Try again later.');
    }

    // 3. Generate and save OTP
    const otp = otpService.generateOtp();
    otpService.saveOtp(`otp:${email}`, otp);

    // 4. Mock send email (in production, use actual email service)
    // 4. Mock send email (in production, use actual email service)
    console.log('----------------------------');
    console.log(`📧 OTP for ${email}: ${otp}`);
    console.log('----------------------------');

    return { message: 'OTP sent to email' };
};

/**
 * Verify student OTP and return JWT
 * @param {string} email - Student email
 * @param {string} otp - OTP to verify
 */
const verifyStudentOtp = async (email, otp) => {
    const key = `otp:${email}`;
    const savedOtp = otpService.getOtp(key);

    if (!savedOtp || savedOtp !== otp) {
        throw new Error('Invalid or Expired OTP');
    }

    // Delete used OTP
    otpService.deleteOtp(key);

    // Check if student exists, if not register from master data
    let studentResult = await query(
        'SELECT * FROM students WHERE email = $1',
        [email]
    );

    let student;
    if (studentResult.rows.length === 0) {
        // Auto-register student from master data
        student = await registerStudentFromMaster(email);
    } else {
        student = studentResult.rows[0];
    }

    // Generate JWT token
    const token = generateToken(student.roll_no, 'STUDENT');

    return { token };
};

/**
 * Register student from master upload data
 * @param {string} email - Student email
 */
const registerStudentFromMaster = async (email) => {
    // Get master record
    const masterResult = await query(
        'SELECT * FROM student_master_upload WHERE email = $1',
        [email]
    );

    if (masterResult.rows.length === 0) {
        throw new Error('Student master record not found during registration');
    }

    const master = masterResult.rows[0];

    // Get department
    const deptResult = await query(
        'SELECT * FROM departments WHERE dept_code = $1',
        [master.dept_code]
    );

    if (deptResult.rows.length === 0) {
        throw new Error(`Department code ${master.dept_code} not found`);
    }

    const dept = deptResult.rows[0];

    // Determine category
    let category = 'DAY';
    if (master.student_type && master.student_type.toUpperCase() === 'HOSTEL') {
        if (master.gender && master.gender.toUpperCase() === 'MALE') {
            category = 'HOSTEL_MALE';
        } else {
            category = 'HOSTEL_FEMALE';
        }
    }

    // Insert new student
    const insertResult = await query(
        `INSERT INTO students (roll_no, name, email, dept_id, category, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
        [master.roll_no, master.name, master.email, dept.dept_id, category]
    );

    return insertResult.rows[0];
};

/**
 * Admin login with password
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 */
const adminLogin = async (email, password) => {
    const result = await query(
        'SELECT * FROM admins WHERE email = $1',
        [email]
    );

    if (result.rows.length === 0) {
        throw new Error('Admin not found');
    }

    const admin = result.rows[0];

    // Simple password check (in production, use bcrypt)
    // The Spring Boot app was using plain text comparison
    if (admin.password_hash !== password) {
        throw new Error('Invalid Credentials');
    }

    const token = generateToken(admin.email, 'ADMIN');

    return { token };
};

module.exports = {
    initiateStudentLogin,
    verifyStudentOtp,
    adminLogin
};
