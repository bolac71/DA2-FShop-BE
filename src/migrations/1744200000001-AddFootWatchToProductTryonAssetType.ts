import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFootWatchToProductTryonAssetType1744200000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE product_tryon_assets DROP CONSTRAINT IF EXISTS chk_product_tryon_assets_asset_type`,
    );
    await queryRunner.query(
      `ALTER TABLE product_tryon_assets ADD CONSTRAINT chk_product_tryon_assets_asset_type CHECK (asset_type IN ('glasses', 'hat', 'accessory', 'foot', 'watch'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE product_tryon_assets DROP CONSTRAINT IF EXISTS chk_product_tryon_assets_asset_type`,
    );
    await queryRunner.query(
      `ALTER TABLE product_tryon_assets ADD CONSTRAINT chk_product_tryon_assets_asset_type CHECK (asset_type IN ('glasses', 'hat', 'accessory'))`,
    );
  }
}
