<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['ok' => false, 'message' => 'Method not allowed'], 405);
}

try {
    $input = getJsonInput();
    $invoiceId = trim((string) ($input['invoice_id'] ?? ''));
    if ($invoiceId === '') {
        jsonResponse(['ok' => false, 'message' => 'invoice_id wajib diisi.'], 422);
    }

    $pdo = getDb();
    $stmt = $pdo->prepare("SELECT id, promo_code_id, status FROM orders WHERE invoice_id = :invoice_id LIMIT 1");
    $stmt->execute([':invoice_id' => $invoiceId]);
    $order = $stmt->fetch();

    if (!$order) {
        jsonResponse(['ok' => false, 'message' => 'Invoice tidak ditemukan.'], 404);
    }

    $paidAt = date('Y-m-d H:i:s');

    if ($order['status'] !== 'PAID') {
        $pdo->beginTransaction();

        $pdo->prepare("UPDATE orders SET status = 'PAID', paid_at = :paid_at WHERE id = :id")
            ->execute([':paid_at' => $paidAt, ':id' => $order['id']]);

        $pdo->prepare("UPDATE payments SET payment_status = 'SETTLEMENT', paid_at = :paid_at WHERE order_id = :order_id")
            ->execute([':paid_at' => $paidAt, ':order_id' => $order['id']]);

        if (!empty($order['promo_code_id'])) {
            $pdo->prepare("UPDATE promo_codes SET used_count = used_count + 1 WHERE id = :id")
                ->execute([':id' => $order['promo_code_id']]);
        }

        $pdo->commit();
    }

    jsonResponse([
        'ok' => true,
        'invoiceId' => $invoiceId,
        'status' => 'PAID',
        'paidAt' => $paidAt,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse([
        'ok' => false,
        'message' => 'Gagal mengonfirmasi pembayaran.',
        'error' => $e->getMessage(),
    ], 500);
}
