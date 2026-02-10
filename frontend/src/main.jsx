import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

// Set global base URL for axios
// Vercel will process VITE_API_URL at build time
axios.defaults.baseURL = import.meta.env.VITE_API_URL || "http://localhost:8080";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
