<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

try {
    $pdo = getDb();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query("
            SELECT id, source_page, full_name, phone, email, organization_name, notes, status, created_at
            FROM leads
            ORDER BY created_at DESC
            LIMIT 50
        ");
        jsonResponse(['ok' => true, 'leads' => $stmt->fetchAll()]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['ok' => false, 'message' => 'Method not allowed'], 405);
    }

    $input = getJsonInput();
    $fullName = trim((string) ($input['full_name'] ?? ''));
    $phone = trim((string) ($input['phone'] ?? ''));
    $sourcePage = trim((string) ($input['source_page'] ?? 'beranda'));

    if ($fullName === '' || $phone === '') {
        jsonResponse(['ok' => false, 'message' => 'Nama lengkap dan nomor WhatsApp wajib diisi.'], 422);
    }

    $allowedSources = ['beranda', 'kontak', 'in_house_training', 'kelas_campus', 'digi_potrait', 'booking_modal'];
    if (!in_array($sourcePage, $allowedSources, true)) {
        $sourcePage = 'beranda';
    }

    $stmt = $pdo->prepare("
        INSERT INTO leads (source_page, full_name, phone, email, organization_name, estimated_participants, preferred_date, notes)
        VALUES (:source_page, :full_name, :phone, :email, :organization_name, :estimated_participants, :preferred_date, :notes)
    ");

    $preferredDate = trim((string) ($input['preferred_date'] ?? ''));
    $stmt->execute([
        ':source_page' => $sourcePage,
        ':full_name' => $fullName,
        ':phone' => $phone,
        ':email' => trim((string) ($input['email'] ?? '')) ?: null,
        ':organization_name' => trim((string) ($input['organization_name'] ?? '')) ?: null,
        ':estimated_participants' => trim((string) ($input['estimated_participants'] ?? '')) ?: null,
        ':preferred_date' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $preferredDate) ? $preferredDate : null,
        ':notes' => trim((string) ($input['notes'] ?? '')) ?: null,
    ]);

    jsonResponse([
        'ok' => true,
        'id' => (int) $pdo->lastInsertId(),
        'message' => 'Lead berhasil disimpan ke database.',
    ], 201);
} catch (Throwable $e) {
    jsonResponse([
        'ok' => false,
        'message' => 'Gagal menyimpan data lead.',
        'error' => $e->getMessage(),
    ], 500);
}
