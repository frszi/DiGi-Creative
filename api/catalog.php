<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

try {
    $pdo = getDb();

    // Packages with service name
    $packagesStmt = $pdo->query("
        SELECT p.code AS id, s.name AS service, p.name, p.price, p.billing_cycle, p.is_popular
        FROM packages p
        JOIN services s ON s.id = p.service_id
        WHERE p.is_active = 1
        ORDER BY s.sort_order ASC, p.price ASC
    ");
    $packages = array_map(static function (array $row): array {
        return [
            'id' => $row['id'],
            'service' => $row['service'],
            'name' => $row['name'],
            'price' => (float) $row['price'],
            'billing_cycle' => $row['billing_cycle'],
            'is_popular' => (bool) $row['is_popular'],
        ];
    }, $packagesStmt->fetchAll());

    // Articles
    $articlesStmt = $pdo->query("
        SELECT slug AS id, is_featured, category, filter_key, badge, read_time,
               title, excerpt, source_domain AS source, external_url AS url,
               author_initials, author_name, author_role, cover_image_url AS image
        FROM articles
        ORDER BY is_featured DESC, id ASC
    ");
    $articles = array_map(static function (array $row): array {
        return [
            'id' => $row['id'],
            'featured' => (bool) $row['is_featured'],
            'category' => $row['category'],
            'filterKey' => $row['filter_key'],
            'badge' => $row['badge'],
            'readTime' => $row['read_time'],
            'title' => $row['title'],
            'excerpt' => $row['excerpt'],
            'source' => $row['source'],
            'url' => $row['url'],
            'author' => [
                'initials' => $row['author_initials'],
                'name' => $row['author_name'],
                'role' => $row['author_role'],
            ],
            'image' => $row['image'],
        ];
    }, $articlesStmt->fetchAll());

    // Portfolios
    $portfoliosStmt = $pdo->query("
        SELECT slug AS id, category, badge, year_location AS year, title, subtitle,
               impact_result AS result, is_dark_theme, accent_class, monogram_code AS code
        FROM portfolios
        ORDER BY sort_order ASC, id ASC
    ");
    $designPortfolio = array_map(static function (array $row): array {
        return [
            'id' => $row['id'],
            'category' => $row['category'],
            'badge' => $row['badge'],
            'year' => $row['year'],
            'title' => $row['title'],
            'subtitle' => $row['subtitle'],
            'result' => $row['result'],
            'darkTheme' => (bool) $row['is_dark_theme'],
            'accentColor' => $row['accent_class'],
            'code' => $row['code'],
        ];
    }, $portfoliosStmt->fetchAll());

    // Team Members
    $teamStmt = $pdo->query("
        SELECT full_name AS name, role_title AS role, specialty, photo_url AS image
        FROM team_members
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");
    $teamMembers = $teamStmt->fetchAll();

    jsonResponse([
        'ok' => true,
        'data' => [
            'packages' => $packages,
            'articles' => $articles,
            'designPortfolio' => $designPortfolio,
            'teamMembers' => $teamMembers,
        ],
    ]);
} catch (Throwable $e) {
    jsonResponse([
        'ok' => false,
        'message' => 'Gagal mengambil katalog dari database.',
        'error' => $e->getMessage(),
    ], 500);
}
