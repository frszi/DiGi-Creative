<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

try {
    $code = strtoupper(trim((string) ($_GET['code'] ?? '')));
    if ($code === '') {
        jsonResponse(['ok' => false, 'message' => 'Kode promo tidak boleh kosong.'], 422);
    }

    $pdo = getDb();
    $stmt = $pdo->prepare("
        SELECT id, code, label, discount_type, discount_value, max_uses, used_count, valid_from, valid_until
        FROM promo_codes
        WHERE code = :code AND is_active = 1
        LIMIT 1
    ");
    $stmt->execute([':code' => $code]);
    $promo = $stmt->fetch();

    if (!$promo) {
        jsonResponse(['ok' => false, 'message' => 'Kode promo tidak ditemukan atau tidak aktif.'], 404);
    }

    if ($promo['max_uses'] !== null && (int) $promo['used_count'] >= (int) $promo['max_uses']) {
        jsonResponse(['ok' => false, 'message' => 'Kuota kode promo sudah habis.'], 400);
    }

    $now = new DateTimeImmutable();
    if ($promo['valid_from'] && $now < new DateTimeImmutable($promo['valid_from'])) {
        jsonResponse(['ok' => false, 'message' => 'Kode promo belum berlaku.'], 400);
    }
    if ($promo['valid_until'] && $now > new DateTimeImmutable($promo['valid_until'])) {
        jsonResponse(['ok' => false, 'message' => 'Kode promo sudah kedaluwarsa.'], 400);
    }

    jsonResponse([
        'ok' => true,
        'promo' => [
            'code' => $promo['code'],
            'label' => $promo['label'],
            'type' => $promo['discount_type'],
            'value' => (float) $promo['discount_value'],
        ],
    ]);
} catch (Throwable $e) {
    jsonResponse([
        'ok' => false,
        'message' => 'Gagal memvalidasi kode promo.',
        'error' => $e->getMessage(),
    ], 500);
}
