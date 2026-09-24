<div align="center">

# 🏡 MagicVilla

### Full-Stack Hotel & Villa Booking Management System

**ASP.NET Core Web API** · **Angular** · **SQL Server / Entity Framework Core**

[![.NET](https://img.shields.io/badge/.NET-9.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Angular](https://img.shields.io/badge/Angular-standalone-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![SQL Server](https://img.shields.io/badge/SQL_Server-EF_Core-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/sql-server)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#license)

</div>

---

## ✨ Overview

**MagicVilla** is a full-stack hotel booking application built as a single monorepo containing both the **backend API** and the **frontend client**. It allows users to browse villas, manage bookings, and authenticate securely — with a clean separation between a robust ASP.NET Core Web API and a modern Angular UI.

This repository combines two previously separate projects into one, so anyone can clone it and get the entire application — backend and frontend — with a single `git clone`.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | ASP.NET Core Web API (.NET 9) |
| **Database** | SQL Server + Entity Framework Core |
| **Frontend** | Angular (standalone components) |
| **Auth** | Token-based authentication |
| **IDE** | Visual Studio (backend) · VS Code (frontend) |

---

## 📁 Project Structure

```
MagicVilla_Villa/
├── MagicVilla_VillaAPI/       # ASP.NET Core Web API (backend)
│   ├── Controllers/           # Auth, Villa, Booking controllers
│   ├── Models/                # Entities & DTOs
│   ├── Data/                  # ApplicationDbContext (EF Core)
│   └── appsettings.json       # Configuration
│
├── Magic_villa_Frontend/      # Angular application (frontend)
│   ├── src/                   # Components, services, routes
│   ├── angular.json
│   └── package.json
│
├── MagicVilla_Villa.slnx      # Visual Studio solution file
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Node.js & npm](https://nodejs.org/)
- [Angular CLI](https://angular.io/cli) → `npm install -g @angular/cli`
- SQL Server (LocalDB or full instance)

### 1️⃣ Clone the repository

```bash
git clone https://github.com/syedsaimhaider78/MagicVilla_Villa.git
cd MagicVilla_Villa
```

### 2️⃣ Run the Backend (API)

```bash
cd MagicVilla_VillaAPI
dotnet restore
dotnet ef database update
dotnet run
```

The API will start at `https://localhost:7097` (or the port shown in your `launchSettings.json`).

### 3️⃣ Run the Frontend (Angular)

```bash
cd Magic_villa_Frontend
npm install
ng serve
```

The app will be available at `http://localhost:4200`.

> ⚠️ Make sure the API base URL inside the Angular services matches the port your backend is running on, and that CORS is enabled for `http://localhost:4200`.

---

## 🔑 Features

- 🏘️ Villa listing, details, create/update/delete
- 📅 Booking management
- 🔐 User authentication
- 🧩 Clean API ↔ Angular integration
- 🗄️ EF Core code-first database with migrations

---

## 🛣️ Roadmap

- [ ] Complete booking flow end-to-end
- [ ] Role-based authorization
- [ ] Unit & integration tests (backend + frontend)
- [ ] Production deployment configuration

---

## 👤 Author

**Syed Saim Haider**
Software Engineer · MERN & .NET Stack

[![GitHub](https://img.shields.io/badge/GitHub-syedsaimhaider78-181717?style=flat-square&logo=github)](https://github.com/syedsaimhaider78)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/syed-saim-haider-030534411)
[![Email](https://img.shields.io/badge/Email-Contact-D14836?style=flat-square&logo=gmail&logoColor=white)](mailto:syedsaimhaider78@gmail.com)

---

<div align="center">

⭐ If you find this project useful, consider giving it a star!

</div>
