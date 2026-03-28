import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class SeedAiReadyProductsCatalog1742900000000 implements MigrationInterface {
  private readonly skuPrefix = 'AIREADY';

  private readSqlStatements(fileName: string): string[] {
    const filePath = path.join(__dirname, 'sql', fileName);
    const content = fs.readFileSync(filePath, 'utf-8');
    return content
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private extractInsertedIds(fileName: string): number[] {
    const filePath = path.join(__dirname, 'sql', fileName);
    const content = fs.readFileSync(filePath, 'utf-8');
    const ids: number[] = [];
    for (const match of content.matchAll(/VALUES\((\d+),/g)) {
      ids.push(parseInt(match[1], 10));
    }
    return [...new Set(ids)];
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const productIds = this.extractInsertedIds('product.sql');

    // Xoá data cũ (idempotent) — cascade sẽ xoá luôn product_images và product_variants
    await queryRunner.query(`DELETE FROM product_variants WHERE sku LIKE $1`, [`${this.skuPrefix}-%`]);
    if (productIds.length > 0) {
      await queryRunner.query(`DELETE FROM products WHERE id = ANY($1)`, [productIds]);
    }

    // Seed theo thứ tự: products → product_images → product_variants
    for (const fileName of ['product.sql', 'product-image.sql', 'product-variant.sql']) {
      for (const statement of this.readSqlStatements(fileName)) {
        await queryRunner.query(statement);
      }
    }

    // Reset sequences sau khi insert explicit IDs, tránh duplicate key lần insert sau
    await queryRunner.query(`SELECT setval(pg_get_serial_sequence('products', 'id'), MAX(id)) FROM products`);
    await queryRunner.query(`SELECT setval(pg_get_serial_sequence('product_images', 'id'), MAX(id)) FROM product_images`);
    await queryRunner.query(`SELECT setval(pg_get_serial_sequence('product_variants', 'id'), MAX(id)) FROM product_variants`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const productIds = this.extractInsertedIds('product.sql');

    await queryRunner.query(`DELETE FROM product_variants WHERE sku LIKE $1`, [`${this.skuPrefix}-%`]);
    if (productIds.length > 0) {
      await queryRunner.query(`DELETE FROM products WHERE id = ANY($1)`, [productIds]);
    }
  }
}
