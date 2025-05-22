# Expense Tracker Backend — Project Documentation

---

## Overview

This is a **RESTful API backend** for an Expense Tracker application built with **Node.js**, **MongoDB**, and **Netlify Functions**. It provides secure user authentication, expense tracking, financial goal management, and analytics to help users monitor their spending and savings effectively.

---

## Key Features

### User Authentication
- JWT-based login and signup.
- Password hashing using `bcryptjs` for secure storage.
- Middleware protects endpoints by validating JWT tokens.

### User Profile & Financial Goals
- Set and update monthly salary and saving goals.
- Snapshots of salary and saving goals saved with each expense for accurate history.

### Expense Management
- Add expenses with categories, notes, and timestamps.
- Default categories included (Food, Shopping, Vehicles, etc.).
- Users can add custom expense categories.

### Balance and Saving Calculation
- Automatically calculates current balance and monthly savings.
- Updates dynamically as expenses or goals change.
- Tracks total accumulated savings over time.

### Spending Analytics API
- Filtered summaries of expenses by category.
- Supports multiple time filters: current month, last 6 months, current year, and all-time.

### Secure API Endpoints
- All sensitive routes require JWT authentication.

---

## Tech Stack

| Technology         | Purpose                                 |
|--------------------|-----------------------------------------|
| Node.js & Express  | Server and routing                      |
| MongoDB            | NoSQL database for users, expenses, and categories |
| JWT                | Token-based authentication              |
| bcryptjs           | Password hashing                        |
| Joi                | Request validation                      |
| Netlify Functions  | Serverless backend deployment (optional) |

---

## Future Enhancements

- Frontend PDF report generation (using jsPDF, html2canvas).
- Email notifications for monthly reports.
- Voice command support for querying expenses and balances.

---

## Local Development Base URL

Run your Netlify functions locally with:

```bash
netlify dev
