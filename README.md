# SlotBooking System

## Overview

The **SlotBooking System** is a comprehensive web application designed to manage exam slot bookings for students. It features two distinct portals: an **Admin Portal** for managing exams, slots, and student data, and a **Student Portal** for booking exam slots based on eligibility and department quotas.

This project uses a modern tech stack with a robust backend and a responsive frontend.

## 🚀 Features

### 🎓 Student Portal
- **Secure Login**: OTP-based authentication linked to student master data.
- **Dashboard**: View eligible exams and current bookings.
- **Slot Booking**: Real-time slot availability check and booking.
- **Quota System**: Department-wise quota management to ensures fair distribution.
- **Booking History**: View past and upcoming exam bookings.

### 🛡️ Admin Portal
- **Dashboard**: Overview of total students, bookings, and active exams.
- **Exam Management**: Create and manage exam schedules.
- **Slot Management**: precise control over slot timings, capacity, and status.
- **Student Master**: Manage student records and eligibility.
- **Analytics**: View filling status of slots and department-wise participation.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React](https://react.dev/) (Vite)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: Radix UI, Lucide React
- **State Management**: React Hooks
- **HTTP Client**: Axios

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (Supabase)
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: CORS, Helmet (planned), Rate Limiting

## 📂 Project Structure

```
SlotBooking/
├── backend/                # Express.js Backend
│   ├── src/
│   │   ├── config/         # Database and app config
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth and error handling middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── app.js          # Entry point
│   ├── .env                # Environment variables
│   └── package.json        # Backend dependencies
│
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth and app context
│   │   ├── lib/            # Utilities
│   │   ├── pages/          # Application pages
│   │   ├── App.jsx         # Main component
│   │   └── main.jsx        # Entry point
│   ├── .env                # Environment variables
│   └── package.json        # Frontend dependencies
│
├── database/               # Database Scripts
│   ├── schema.sql          # Database schema definition
│   └── seed_data.sql       # Initial seed data
│
└── README.md               # Project documentation
```

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (or Supabase account)

### 1. Database Setup
1. Create a PostgreSQL database (or use Supabase).
2. Run the SQL scripts in the `database/` folder:
   - Execute `schema.sql` to create tables.
   - Execute `seed_data.sql` to populate initial data.

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and configure your database credentials:
   ```env
   PORT=8080
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   JWT_SECRET=your_jwt_secret
   FRONTEND_URL=http://localhost:5173
   ```
4. Start the server:
   ```bash
   npm start
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file if needed (usually handled by Vite proxy or hardcoded for dev):
   ```env
   VITE_API_URL=http://localhost:8080/api
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 📸 Screenshots

## 📸 Screenshots

### Student Login Page
![Student login](./screenshots/student.png)

### Admin Login Page
![Admin login](./screenshots/admin.png)

### Student Dashboard
![Student Dashboard](./screenshots/availableslots.png)

### Student Bookings
![Student Bookings](./screenshots/slotbookingconfirm(1).png)

### Admin Exam Setup
![Admin Examsetup](./screenshots/examsetup.png)

### Department Details
![Department details](./screenshots/dept.png)

### Student Details
![Student Details](./screenshots/studentsdetails.png)

### Students Upload Page
![Students Upload page](./screenshots/studentsupload.png)

> **Note**: Screenshot images need to be added to a `screenshots` folder in the root directory.

## 🤝 Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License
This project is licensed under the ISC License.
