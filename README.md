# Sistem Purchase Request Enterprise

Aplikasi web manajemen pengadaan barang dan jasa (*Purchase Request* / PR) berbasis multi-peran dengan integritas workflow yang ketat, audit trail terperinci (*append-only*), penanganan *race condition*, dan server sebagai *single source of truth*.

---

## 2. Architecture Overview & Technical Assumptions

### Arsitektur Tiga Lapis (Three-Tier Architecture)

Sistem ini dirancang dengan pemisahan tanggung jawab yang tegas:
1. **Frontend Layer (Web UI):** Single Page Application (SPA) berbasis React 19, TypeScript, dan Tailwind CSS. Berkomunikasi dengan backend melalui RESTful JSON API menggunakan Bearer Token (Laravel Sanctum). Tidak ada logika bisnis kritis yang dijalankan di sisi klien.
2. **Backend Layer (API Service):** Aplikasi Laravel 13 running on PHP 8.4. Menangani otentikasi, otorisasi berbasis Policy, validasi request, dan state machine workflow di `PurchaseRequestService`.
   - **Atomic State Transitions:** Setiap mutasi dibungkus dalam `DB::transaction`.
   - **Pessimistic Locking:** Menggunakan `lockForUpdate()` untuk mencegah *race condition* atau *double decision* saat manajer melakukan approval paralel (E5).
   - **Server as Single Source of Truth:** Kalkulasi total nilai dihitung ulang secara mutlak di server dari perkalian `qty * unit_price` masing-masing item, mengabaikan segala bentuk manipulasi input nilai total dari klien (E4).
3. **Database Layer (Persistence & Integrity):** PostgreSQL 16 dengan integritas relasional, *foreign key cascade*, constraint CHECK pada level database, dan **PostgreSQL Trigger** untuk memastikan riwayat persetujuan (*approval history*) bersifat *append-only* (tidak dapat diubah atau dihapus bahkan via query langsung).

### Diagram Arsitektur

```mermaid
graph TD
    subgraph Client ["Frontend Layer (React 19 + TypeScript)"]
        UI["React SPA (Port 8000 / 3000)"]
        TokenAuth["Auth State / Bearer Token"]
    end

    subgraph Server ["Backend Layer (Laravel 13 & PHP 8.4)"]
        Router["API Routing & Middleware (/api/v1)"]
        PolicySec["Policy Authorization (PurchaseRequestPolicy)"]
        Validation["Form Request Validation"]
        Service["PurchaseRequestService (State Machine & Locking)"]
    end

    subgraph Database ["Database Layer (PostgreSQL 16)"]
        PRTable[("purchase_requests (CHECK status, priority)")]
        ItemTable[("request_items (CHECK qty > 0, price > 0)")]
        HistoryTable[("approval_history (Append-Only Trigger)")]
        UserTable[("users (role: EMPLOYEE / MANAGER)")]
    end

    UI -->|HTTP Bearer Token| Router
    Router --> PolicySec
    PolicySec --> Validation
    Validation --> Service
    Service -->|Atomic Transaction + lockForUpdate| Database
    Database -->|Rollback on Error| Service
```

### State Machine Workflow

```mermaid
stateDiagram-v2
    [*] --> Draft : Buat Request (F1)
    Draft --> Draft : Edit Item / Catatan / Prioritas (F3)
    Draft --> Submitted : Submit Request (F4, min 1 item)
    Submitted --> Approved : Approve oleh Manajer (F5)
    Submitted --> Rejected : Reject oleh Manajer (F6, wajib komentar)
    Approved --> [*] : Status Final (Terkunci)
    Rejected --> [*] : Status Final (Terkunci)
```

### Asumsi Teknis (Technical Assumptions)
1. **Wewenang Manajer & Separation of Duty:** Setiap akun dengan role `MANAGER` berwenang menyetujui atau menolak request yang diajukan oleh karyawan, namun **dilarang keras** menyetujui atau menolak pengajuannya sendiri (*self-approval prevention*, E2).
2. **Keterlihatan Data (Scoping by Role):** Karyawan hanya dapat melihat request miliknya sendiri. Manajer dapat melihat request seluruh karyawan yang berstatus `SUBMITTED`, `APPROVED`, dan `REJECTED`, namun tidak melihat draft milik karyawan lain.
3. **Integritas Moneter:** Kalkulasi finansial diproses dengan pembulatan dua desimal standar per item dan subtotal; nilai total selalu dihitung ulang di server untuk menjamin konsistensi.
4. **Append-Only Audit Trail:** Catatan persetujuan tidak boleh di-update atau di-delete oleh proses apa pun dalam sistem. Integritas ini dilindungi langsung oleh *stored procedure trigger* di level database PostgreSQL.

---

## 3. Database Schema & Migration

Database PostgreSQL dirancang dengan integritas data ketat:

### Skema Tabel Utama

```mermaid
erDiagram
    users ||--o{ purchase_requests : "requests"
    users ||--o{ approval_history : "acts_on"
    purchase_requests ||--|{ request_items : "contains"
    purchase_requests ||--o{ approval_history : "records"

    users {
        bigint id PK
        string name
        string email UK
        string password
        string role "EMPLOYEE / MANAGER"
        timestamp created_at
    }

    purchase_requests {
        bigint id PK
        string number UK "PR-YYYY-XXXX"
        bigint requester_id FK
        string status "DRAFT / SUBMITTED / APPROVED / REJECTED"
        string priority "LOW / MEDIUM / HIGH / URGENT"
        decimal total_amount
        integer version
        text notes
        timestamp submitted_at
        timestamp decided_at
    }

    request_items {
        bigint id PK
        bigint request_id FK
        string name
        string uom "Pcs, Unit, Box, dll."
        integer qty "CHECK qty > 0"
        decimal unit_price "CHECK unit_price > 0"
        decimal subtotal
    }

    approval_history {
        bigint id PK
        bigint request_id FK
        string action "CREATED / SUBMITTED / APPROVED / REJECTED / EDITED"
        string from_status
        string to_status
        bigint actor_id FK
        text comment
        timestamp created_at
    }
```

### Constraint & Trigger Spesifik
- **Database CHECK Constraint:**
  - `purchase_requests.status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')`
  - `purchase_requests.priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')`
  - `request_items.qty > 0`
  - `request_items.unit_price > 0`
- **PostgreSQL Append-Only Trigger (`approval_history`):**
  Trigger PostgreSQL `forbid_approval_history_mutation` mencegah perintah `UPDATE` maupun `DELETE` pada tabel riwayat audit, melempar exception `approval_history is append-only`.

---

## 4. Setup Instructions

### Opsi A: Menggunakan Docker Compose (Direkomendasikan)
Menjalankan seluruh sistem (PostgreSQL 16, Laravel API, Web SPA) secara otomatis:

```bash
# 1. Clone repository
git clone <repository-url>
cd purchase-request

# 2. Jalankan seluruh container
docker compose up --build
```

Setelah kontainer siap:
- **Aplikasi Web:** [http://localhost:3000](http://localhost:3000) atau [http://localhost:8000](http://localhost:8000)
- **API Endpoint:** [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
- Database otomatis dimigrasi dan di-seed dengan akun pengujian.

---

### Opsi B: Menjalankan Secara Lokal (Host)
**Persyaratan Sistem:**
- PHP 8.4 (ekstensi: `pdo_pgsql`, `pgsql`, `mbstring`, `intl`)
- PostgreSQL 16 (Port 5432)
- Composer 2
- Node.js 20+ & npm

**Langkah Instalasi:**
```bash
# 1. Install dependensi
composer install
npm install

# 2. Setup konfigurasi environment
cp .env.example .env
php artisan key:generate

# 3. Sesuaikan koneksi database di .env jika perlu:
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=purchase_request
# DB_USERNAME=postgres
# DB_PASSWORD=postgres

# 4. Jalankan migrasi dan seeder
php artisan migrate:fresh --seed

# 5. Build asset frontend (React Vite)
npm run build

# 6. Jalankan server lokal
php artisan serve --port=8000
```

---

## 5. Akun Pengujian (Seed Data)

Database seeder secara otomatis menyiapkan akun pengujian berikut (password default untuk semua akun: `password123`):

| Nama Pengguna | Alamat Email | Peran | Kegunaan Pengujian |
| :--- | :--- | :--- | :--- |
| **Rina Wijaya** | `rina.wijaya@example.test` | `EMPLOYEE` | Pemohon PR (Dapat membuat draft, submit request) |
| **Andi Saputra** | `andi.saputra@example.test` | `EMPLOYEE` | Karyawan lain (Uji isolasi data & otorisasi E2) |
| **Budi Hartono** | `budi.hartono@example.test` | `MANAGER` | Manajer (Uji persetujuan / penolakan) |
| **Sari Lestari** | `sari.lestari@example.test` | `MANAGER` | Manajer kedua (Uji *concurrency* / *race condition* E5) |

---

## 6. Dokumentasi API (RESTful JSON)

Seluruh request dan response menggunakan header `Accept: application/json` dan `Content-Type: application/json`. Endpoint privat membutuhkan header `Authorization: Bearer <token>`.

### 1. Autentikasi
- **POST `/api/v1/auth/login`**
  - Body: `{ "email": "...", "password": "..." }`
  - Response `200 OK`: `{ "user": { ... }, "token": "..." }`
- **POST `/api/v1/auth/logout`**
  - Response `204 No Content`
- **GET `/api/v1/auth/me`**
  - Response `200 OK`: `{ "user": { "id": 1, "name": "...", "role": "..." } }`

### 2. Purchase Request Endpoints
- **GET `/api/v1/requests`**
  - Query Params opsional: `status=DRAFT|SUBMITTED|APPROVED|REJECTED`, `priority=LOW|MEDIUM|HIGH|URGENT`
  - Response `200 OK`: `{ "data": [ ... ] }`
- **POST `/api/v1/requests`**
  - Body:
    ```json
    {
      "priority": "HIGH",
      "notes": "Pengadaan perangkat kerja baru",
      "items": [
        { "name": "Laptop ThinkPad", "uom": "Unit", "qty": 2, "unit_price": 15000000 }
      ]
    }
    ```
  - Response `201 Created`: `{ "data": { "id": 1, "number": "PR-2026-0001", "status": "DRAFT", ... } }`
- **GET `/api/v1/requests/{id}`**
  - Response `200 OK`: Mengembalikan detail PR, rincian items, dan audit history.
- **PUT `/api/v1/requests/{id}`**
  - Memperbarui request yang berstatus Draft (menaikkan nomor versi PR).
  - Response `200 OK`
- **POST `/api/v1/requests/{id}/submit`**
  - Mengubah status dari `DRAFT` menjadi `SUBMITTED`.
  - Response `200 OK`
- **POST `/api/v1/requests/{id}/approve`**
  - Body (opsional): `{ "comment": "Disetujui untuk dibeli" }`
  - Response `200 OK`
- **POST `/api/v1/requests/{id}/reject`**
  - Body (wajib): `{ "comment": "Anggaran departemen tidak mencukupi" }`
  - Response `200 OK`
- **GET `/api/v1/requests/{id}/history`**
  - Mengambil daftar audit trail lengkap untuk request tersebut.

### Format Standar Error Response
Jika terjadi kesalahan validasi atau pelanggaran aturan bisnis:
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validasi gagal",
    "fields": {
      "comment": "Alasan penolakan wajib diisi."
    }
  }
}
```

---

## 7. Automated Testing (16 Test Cases)

Seluruh aturan integritas bisnis dilindungi oleh automated feature & unit tests.

### Menjalankan Test Suite
```bash
# Menjalankan di Docker:
docker compose exec api php artisan test

# Menjalankan secara lokal:
php artisan test --env=local
```

### Ringkasan Test Cases
| Kategori | Nama Test Case | Deskripsi & Verifikasi |
| :--- | :--- | :--- |
| **Integrity (E1)** | `test_e1_submit_request_without_items_returns_422` | Request tanpa item ditolak 422 saat submit; status tetap DRAFT. |
| **Security (E2)** | `test_e2_unauthorized_user_or_self_approving_returns_403_and_status_unchanged` | Pemohon yang berperan manajer ditolak 403 jika menyetujui pengajuannya sendiri. |
| **Integrity (E3)** | `test_e3_double_decision_on_final_status_returns_409` | PR dengan status final (Approved/Rejected) tidak dapat diapprove/direject ulang. |
| **Security (E4)** | `test_e4_server_recalculates_totals_and_ignores_client_tampering` | Total yang dimanipulasi klien diabaikan; server menghitung ulang nilai asli. |
| **Concurrency (E5)** | `test_e5_concurrent_manager_approvals_only_one_wins_other_gets_409` | Dua manajer menyetujui bersamaan: tepat satu sukses (200), lainnya mendapat 409 (*lockForUpdate*). |
| **Atomicity (E6)** | `test_e6_atomic_transaction_rollback_when_history_insert_fails` | Transaksi di-rollback total jika penulisan audit history gagal. |
| **Workflow (F6)** | `test_f6_reject_without_comment_returns_422` | Penolakan tanpa alasan/komentar wajib menghasilkan 422 Unprocessable Entity. |
| **Workflow (F3)** | `test_f3_edit_after_submitted_returns_409` | Pengeditan draft yang sudah diajukan (Submitted) ditolak dengan 409 Invalid State. |
| **Scoping (F2)** | `test_f2_list_scoping_by_role` | Karyawan hanya melihat request miliknya; manajer melihat request non-draft seluruh tim. |
| **Audit Trail (F7)** | `test_f7_every_successful_action_adds_history_with_correct_from_and_to_status` | Setiap mutasi mencatat riwayat dengan action, from_status, to_status, dan aktor yang valid. |
| **Database Trigger** | `test_append_only_direct_update_or_delete_on_approval_history_is_rejected_by_database` | Verifikasi database trigger menolak modifikasi langsung pada tabel history. |
| **Audit Security** | `test_rejected_attempts_403_and_409_are_written_to_audit_log_channel` | Upaya terlarang dicatat ke channel log audit keamanan khusus. |
| **Auth** | `test_user_can_login_with_valid_credentials` | Login berhasil menerbitkan Bearer Token Sanctum. |
| **Auth** | `test_login_fails_with_invalid_credentials` | Login gagal melempar 422 / kredensial salah. |
