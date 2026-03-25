import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedInventoriesForAiReadyVariants1743100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      WITH variant_quantities AS (
        SELECT
          pv.id AS variant_id,
          CASE
            WHEN LOWER(c.name) LIKE '%giày%' THEN 24 + ((pv.id % 5) * 4)
            WHEN LOWER(c.name) LIKE '%balo%' OR LOWER(c.name) LIKE '%phụ kiện%' OR LOWER(c.name) LIKE '%mũ%' THEN 36 + ((pv.id % 4) * 5)
            WHEN LOWER(c.name) LIKE '%trẻ em%' THEN 30 + ((pv.id % 5) * 4)
            ELSE 28 + ((pv.id % 6) * 4)
          END AS quantity
        FROM product_variants pv
        INNER JOIN products p ON p.id = pv.product_id
        INNER JOIN categories c ON c.id = p.category_id
        WHERE pv.is_active = true
      ),
      inserted_inventories AS (
        INSERT INTO inventories (variant_id, quantity)
        SELECT vq.variant_id, vq.quantity
        FROM variant_quantities vq
        LEFT JOIN inventories i ON i.variant_id = vq.variant_id
        WHERE i.id IS NULL
        RETURNING variant_id, quantity
      ),
      actor AS (
        SELECT
          COALESCE(
            (SELECT id FROM users WHERE is_active = true AND role = 'admin' ORDER BY id ASC LIMIT 1),
            (SELECT id FROM users WHERE is_active = true ORDER BY id ASC LIMIT 1)
          ) AS user_id
      )
      INSERT INTO inventory_transactions (variant_id, user_id, type, quantity, note)
      SELECT ii.variant_id, actor.user_id, 'IMPORT', ii.quantity, 'Seed initial stock import'
      FROM inserted_inventories ii
      CROSS JOIN actor
      WHERE actor.user_id IS NOT NULL
    `,
    );
  }

  public down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally no-op to avoid deleting inventories that may already be used in real orders.
    return Promise.resolve();
  }
}
