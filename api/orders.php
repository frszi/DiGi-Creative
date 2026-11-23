<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function generateVaNumber(string $bank): string
{
    $prefixes = [
        'BCA Virtual Account' => '39010',
        'Mandiri Virtual Account' => '89508',
        'BNI Virtual Account' => '88080',
        'BRI Virtual Account' => '26215',
    ];
    $prefix = $prefixes[$bank] ?? '88000';
    $rand = (string) random_int(10000000000, 99999999999);
    return $prefix . substr($rand, 0, 11);
}

try {
    $pdo = getDb();

    // GET: List recent transactions
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query("
            SELECT o.invoice_id AS invoiceId,
                   CONCAT(s.name, ' — ', p.name) AS packageName,
                   o.customer_name, o.customer_email, o.customer_phone,
                   pay.method_group AS methodGroup,
                   pay.method_detail AS methodDetail,
                   pay.va_number AS vaNumber,
                   o.total_amount AS total,
                   o.status,
                   o.created_at AS createdAt,
                   o.paid_at AS paidAt
            FROM orders o
            JOIN packages p ON p.id = o.package_id
            JOIN services s ON s.id = p.service_id
            LEFT JOIN payments pay ON pay.order_id = o.id
            ORDER BY o.created_at DESC
            LIMIT 25
        ");

        $rows = array_map(static function (array $r): array {
            return [
                'invoiceId' => $r['invoiceId'],
                'packageName' => $r['packageName'],
                'customer' => [
                    'name' => $r['customer_name'],
                    'email' => $r['customer_email'],
                    'phone' => $r['customer_phone'],
                ],
                'methodGroup' => $r['methodGroup'],
                'methodDetail' => $r['methodDetail'],
                'vaNumber' => $r['vaNumber'],
                'total' => (float) $r['total'],
                'status' => $r['status'],
                'createdAt' => $r['createdAt'],
                'paidAt' => $r['paidAt'],
            ];
        }, $stmt->fetchAll());

        jsonResponse(['ok' => true, 'transactions' => $rows]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['ok' => false, 'message' => 'Method not allowed'], 405);
    }

    $input = getJsonInput();
    $packageCode = trim((string) ($input['package_id'] ?? ''));
    $customerName = trim((string) ($input['customer_name'] ?? ''));
    $customerEmail = trim((string) ($input['customer_email'] ?? ''));
    $customerPhone = trim((string) ($input['customer_phone'] ?? ''));
    $companyName = trim((string) ($input['company_name'] ?? ''));
    $promoCodeStr = strtoupper(trim((string) ($input['promo_code'] ?? '')));
    $methodGroup = trim((string) ($input['method_group'] ?? 'qris'));
    $methodDetail = trim((string) ($input['method_detail'] ?? 'QRIS All-Payment'));

    if ($packageCode === '' || $customerName === '' || $customerEmail === '' || $customerPhone === '') {
        jsonResponse(['ok' => false, 'message' => 'Data pemesan dan paket wajib lengkap.'], 422);
    }

    if (!in_array($methodGroup, ['qris', 'va', 'ewallet', 'card'], true)) {
        $methodGroup = 'qris';
    }

    // Lookup package server-side
    $pkgStmt = $pdo->prepare("
        SELECT p.id, p.code, p.name, p.price, s.name AS service_name
        FROM packages p
        JOIN services s ON s.id = p.service_id
        WHERE p.code = :code AND p.is_active = 1
        LIMIT 1
    ");
    $pkgStmt->execute([':code' => $packageCode]);
    $pkg = $pkgStmt->fetch();

    if (!$pkg) {
        jsonResponse(['ok' => false, 'message' => 'Paket tidak ditemukan.'], 404);
    }

    $subtotal = (float) $pkg['price'];
    $discount = 0.0;
    $promoId = null;

    if ($promoCodeStr !== '') {
        $promoStmt = $pdo->prepare("SELECT * FROM promo_codes WHERE code = :code AND is_active = 1 LIMIT 1");
        $promoStmt->execute([':code' => $promoCodeStr]);
        $promo = $promoStmt->fetch();
        if ($promo && ($promo['max_uses'] === null || (int) $promo['used_count'] < (int) $promo['max_uses'])) {
            $promoId = (int) $promo['id'];
            $discount = $promo['discount_type'] === 'percent'
                ? round(($subtotal * (float) $promo['discount_value']) / 100)
                : (float) $promo['discount_value'];
        }
    }

    $adminFee = $methodGroup === 'qris' ? 0.0 : 4500.0;
    $total = max(0.0, $subtotal - $discount + $adminFee);
    $invoiceId = 'INV-DIGI-' . date('Ymd') . '-' . random_int(1000, 9999);
    $expiresAt = (new DateTimeImmutable('+15 minutes'))->format('Y-m-d H:i:s');
    $vaNumber = $methodGroup === 'va' ? generateVaNumber($methodDetail) : null;
    $qrisNmid = $methodGroup === 'qris' ? 'ID1026884920112' : null;
    $gatewayRef = 'GW-' . strtoupper(bin2hex(random_bytes(5)));

    $pdo->beginTransaction();

    $orderStmt = $pdo->prepare("
        INSERT INTO orders (
            invoice_id, package_id, promo_code_id, customer_name, customer_email, customer_phone,
            company_name, subtotal, discount_amount, admin_fee, total_amount, status, expires_at
        ) VALUES (
            :invoice_id, :package_id, :promo_code_id, :customer_name, :customer_email, :customer_phone,
            :company_name, :subtotal, :discount_amount, :admin_fee, :total_amount, 'PENDING', :expires_at
        )
    ");
    $orderStmt->execute([
        ':invoice_id' => $invoiceId,
        ':package_id' => (int) $pkg['id'],
        ':promo_code_id' => $promoId,
        ':customer_name' => $customerName,
        ':customer_email' => $customerEmail,
        ':customer_phone' => $customerPhone,
        ':company_name' => $companyName !== '' ? $companyName : null,
        ':subtotal' => $subtotal,
        ':discount_amount' => $discount,
        ':admin_fee' => $adminFee,
        ':total_amount' => $total,
        ':expires_at' => $expiresAt,
    ]);

    $orderId = (int) $pdo->lastInsertId();

    $payStmt = $pdo->prepare("
        INSERT INTO payments (
            order_id, gateway_provider, gateway_reference, method_group, method_detail,
            va_number, qris_nmid, amount, payment_status
        ) VALUES (
            :order_id, 'digipay-php', :gateway_reference, :method_group, :method_detail,
            :va_number, :qris_nmid, :amount, 'WAITING'
        )
    ");
    $payStmt->execute([
        ':order_id' => $orderId,
        ':gateway_reference' => $gatewayRef,
        ':method_group' => $methodGroup,
        ':method_detail' => $methodDetail,
        ':va_number' => $vaNumber,
        ':qris_nmid' => $qrisNmid,
        ':amount' => $total,
    ]);

    $pdo->commit();

    jsonResponse([
        'ok' => true,
        'invoice' => [
            'invoiceId' => $invoiceId,
            'packageId' => $pkg['code'],
            'packageName' => $pkg['service_name'] . ' — ' . $pkg['name'],
            'customer' => [
                'name' => $customerName,
                'email' => $customerEmail,
                'phone' => $customerPhone,
                'company' => $companyName,
            ],
            'methodGroup' => $methodGroup,
            'methodDetail' => $methodDetail,
            'vaNumber' => $vaNumber,
            'qrisNmid' => $qrisNmid,
            'total' => $total,
            'status' => 'PENDING',
            'createdAt' => date('Y-m-d H:i:s'),
        ],
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse([
        'ok' => false,
        'message' => 'Gagal membuat invoice pembayaran.',
        'error' => $e->getMessage(),
    ], 500);
}
