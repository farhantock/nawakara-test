# Dokumentasi RESTful API

Dokumentasi lengkap antarmuka pemrograman aplikasi (API) untuk **Sistem Purchase Request Enterprise**.

---

## 1. Informasi Umum

- **Base URL:** `http://localhost:8000/api/v1` (atau `http://127.0.0.1:8000/api/v1`)
- **Format Pertukaran Data:** JSON (`Content-Type: application/json` & `Accept: application/json`)
- **Otentikasi:** Bearer Token via Laravel Sanctum pada header HTTP:
  ```http
  Authorization: Bearer <token_anda>
  ```

---

## 2. Format Respons Error Seragam

Semua kegagalan (validasi, otentikasi, otorisasi, status konflik, atau server error) mengembalikan struktur payload konsisten:

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

### Kode Status & Makna Error

| HTTP Status | Error Code | Keterangan & Pemicu |
| :--- | :--- | :--- |
| **401 Unauthorized** | `UNAUTHENTICATED` | Token tidak disertakan, kedaluwarsa, atau tidak valid. |
| **403 Forbidden** | `FORBIDDEN` | Pengguna tidak memiliki wewenang (contoh: Karyawan mencoba approve, atau Manajer mencoba approve PR miliknya sendiri). |
| **404 Not Found** | `NOT_FOUND` | Resource tidak ditemukan, atau pengguna mencoba mengakses PR yang bukan haknya. |
| **409 Conflict** | `INVALID_STATE` | Pelanggaran alur state machine (contoh: edit PR yang sudah Submitted, atau *race condition* approval paralel). |
| **422 Unprocessable** | `VALIDATION_FAILED` | Input data tidak valid (contoh: submit tanpa item, reject tanpa komentar). |
| **500 Server Error** | `INTERNAL_ERROR` | Terjadi kegagalan server; seluruh transaksi database otomatis di-*rollback*. |

---

## 3. Endpoint Autentikasi

### 3.1. Login Pengguna
Menerima email dan password, memverifikasi kredensial, dan mengembalikan token API.

- **Method:** `POST`
- **Path:** `/api/v1/auth/login`
- **Hak Akses:** Publik

**Request Body:**
```json
{
  "email": "rina.wijaya@example.test",
  "password": "password123"
}
```

**Response `200 OK`:**
```json
{
  "user": {
    "id": 1,
    "name": "Rina Wijaya",
    "email": "rina.wijaya@example.test",
    "role": "EMPLOYEE"
  },
  "token": "1|abcde12345sampletoken..."
}
```

---

### 3.2. Logout Pengguna
Mencabut token Bearer yang sedang digunakan.

- **Method:** `POST`
- **Path:** `/api/v1/auth/logout`
- **Hak Akses:** Authenticated
- **Response:** `204 No Content`

---

### 3.3. Cek Profil Pengguna (Me)
Mengambil informasi pengguna yang sedang terautentikasi.

- **Method:** `GET`
- **Path:** `/api/v1/auth/me`
- **Hak Akses:** Authenticated

**Response `200 OK`:**
```json
{
  "user": {
    "id": 1,
    "name": "Rina Wijaya",
    "email": "rina.wijaya@example.test",
    "role": "EMPLOYEE"
  }
}
```

---

## 4. Endpoint Purchase Request

### 4.1. Daftar Purchase Request
Mengambil daftar purchase request sesuai pembatasan wewenang (Karyawan hanya melihat miliknya; Manajer melihat request non-draft dari seluruh tim).

- **Method:** `GET`
- **Path:** `/api/v1/requests`
- **Hak Akses:** Authenticated (Karyawan & Manajer)
- **Query Parameters (Opsional):**
  - `status`: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`
  - `priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 1,
      "number": "PR-2026-0001",
      "requester_id": 1,
      "status": "SUBMITTED",
      "priority": "HIGH",
      "total_amount": 31000000,
      "version": 1,
      "notes": "Pengadaan perlengkapan tim",
      "submitted_at": "2026-11-22T04:44:50.000000Z",
      "decided_at": null,
      "created_at": "2026-11-22T03:46:55.000000Z",
      "requester": {
        "id": 1,
        "name": "Rina Wijaya",
        "email": "rina.wijaya@example.test",
        "role": "EMPLOYEE"
      },
      "items": [
        {
          "id": 1,
          "name": "Laptop 14 Inch",
          "uom": "Unit",
          "qty": 2,
          "unit_price": 15500000,
          "subtotal": 31000000
        }
      ]
    }
  ]
}
```

---

### 4.2. Buat Draft Baru
Membuat purchase request baru dengan status awal `DRAFT`. Kalkulasi total nilai dilakukan secara mutlak oleh server.

- **Method:** `POST`
- **Path:** `/api/v1/requests`
- **Hak Akses:** Karyawan

**Request Body:**
```json
{
  "priority": "MEDIUM",
  "notes": "Pengadaan inventaris kantor baru",
  "items": [
    {
      "name": "Monitor 27 Inch",
      "uom": "Unit",
      "qty": 2,
      "unit_price": 3500000
    },
    {
      "name": "Kabel HDMI 2.1",
      "uom": "Pcs",
      "qty": 3,
      "unit_price": 150000
    }
  ]
}
```

**Response `201 Created`:**
```json
{
  "data": {
    "id": 2,
    "number": "PR-2026-0002",
    "requester_id": 1,
    "status": "DRAFT",
    "priority": "MEDIUM",
    "total_amount": 7450000,
    "version": 1,
    "notes": "Pengadaan inventaris kantor baru",
    "created_at": "2026-11-22T05:00:00.000000Z"
  }
}
```

---

### 4.3. Detail Purchase Request
Mengambil rincian pengajuan lengkap dengan item dan riwayat persetujuan.

- **Method:** `GET`
- **Path:** `/api/v1/requests/{id}`
- **Hak Akses:** Pemilik request atau Manajer
- **Response `200 OK`:** Objek data lengkap PR beserta relasi `requester`, `items`, dan `history`.

---

### 4.4. Perbarui Draft (Edit)
Memperbarui item atau catatan pada request yang **masih berstatus `DRAFT`**. Otomatis menaikkan nomor versi (`version = version + 1`).

- **Method:** `PUT`
- **Path:** `/api/v1/requests/{id}`
- **Hak Akses:** Pemilik request (Hanya jika status `DRAFT`)
- **Request Body:** Format sama dengan `POST /api/v1/requests`.
- **Response `200 OK`:** Data PR yang diperbarui.
- **Error `409 INVALID_STATE`:** Jika request sudah diajukan (`SUBMITTED`, `APPROVED`, `REJECTED`).

---

### 4.5. Submit Request
Mengajukan request untuk persetujuan manajer (`DRAFT` → `SUBMITTED`).

- **Method:** `POST`
- **Path:** `/api/v1/requests/{id}/submit`
- **Hak Akses:** Pemilik request (Status `DRAFT`)
- **Validasi Bisnis:** Minimal memiliki 1 item valid (E1).
- **Response `200 OK`:** Status berubah menjadi `SUBMITTED`, `submitted_at` terisi timestamp.

---

### 4.6. Setujui Request (Approve)
Menyetujui pengajuan yang masuk (`SUBMITTED` → `APPROVED`).

- **Method:** `POST`
- **Path:** `/api/v1/requests/{id}/approve`
- **Hak Akses:** Manajer yang **bukan pemilik** request (E2)
- **Request Body (Opsional):**
  ```json
  {
    "comment": "Disetujui untuk diproses oleh bagian procurement."
  }
  ```
- **Response `200 OK`:** Status berubah menjadi `APPROVED`, `decided_at` terisi timestamp.

---

### 4.7. Tolak Request (Reject)
Menolak pengajuan yang masuk (`SUBMITTED` → `REJECTED`).

- **Method:** `POST`
- **Path:** `/api/v1/requests/{id}/reject`
- **Hak Akses:** Manajer yang **bukan pemilik** request (E2)
- **Request Body (Wajib):**
  ```json
  {
    "comment": "Anggaran departemen bulan ini telah melebihi batas plafon."
  }
  ```
- **Response `200 OK`:** Status berubah menjadi `REJECTED`, `decided_at` terisi timestamp.
- **Error `422 VALIDATION_FAILED`:** Jika field `comment` tidak disertakan (F6).

---

### 4.8. Riwayat Audit Trail
Mengambil riwayat audit perjalanan status request dari awal dibuat hingga status final.

- **Method:** `GET`
- **Path:** `/api/v1/requests/{id}/history`
- **Hak Akses:** Pemilik request atau Manajer
- **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 1,
      "action": "CREATED",
      "from_status": null,
      "to_status": "DRAFT",
      "actor": { "name": "Rina Wijaya" },
      "comment": null,
      "created_at": "2026-11-22T03:46:55.000000Z"
    },
    {
      "id": 2,
      "action": "SUBMITTED",
      "from_status": "DRAFT",
      "to_status": "SUBMITTED",
      "actor": { "name": "Rina Wijaya" },
      "comment": null,
      "created_at": "2026-11-22T04:44:50.000000Z"
    },
    {
      "id": 3,
      "action": "APPROVED",
      "from_status": "SUBMITTED",
      "to_status": "APPROVED",
      "actor": { "name": "Budi Hartono" },
      "comment": "Disetujui untuk diproses.",
      "created_at": "2026-11-22T04:51:40.000000Z"
    }
  ]
}
```

---

## 5. Contoh Eksekusi cURL

```bash
# 1. Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"budi.hartono@example.test","password":"password123"}'

# 2. Approve Request (sebagai Manajer)
curl -X POST http://localhost:8000/api/v1/requests/1/approve \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"comment":"Disetujui"}'
```
