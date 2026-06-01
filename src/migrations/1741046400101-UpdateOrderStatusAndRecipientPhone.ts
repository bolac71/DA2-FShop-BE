import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOrderStatusAndRecipientPhone1741046400101 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_phone varchar`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_status_enum') THEN
          ALTER TYPE orders_status_enum RENAME TO orders_status_enum_old;

          CREATE TYPE orders_status_enum AS ENUM(
            'pending',
            'confirmed',
            'processing',
            'awaiting_pickup',
            'in_transit',
            'out_for_delivery',
            'delivered',
            'delivery_failed',
            'canceled',
            'refunded'
          );

          ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;

          ALTER TABLE orders
          ALTER COLUMN status TYPE orders_status_enum
          USING (
            CASE status::text
              WHEN 'shipped' THEN 'in_transit'
              WHEN 'return_requested' THEN 'delivery_failed'
              WHEN 'returned' THEN 'delivery_failed'
              ELSE status::text
            END
          )::orders_status_enum;

          ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
          DROP TYPE orders_status_enum_old;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_status_enum') THEN
          ALTER TYPE orders_status_enum RENAME TO orders_status_enum_new;

          CREATE TYPE orders_status_enum AS ENUM(
            'pending',
            'confirmed',
            'processing',
            'shipped',
            'delivered',
            'canceled',
            'return_requested',
            'returned',
            'refunded'
          );

          ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;

          ALTER TABLE orders
          ALTER COLUMN status TYPE orders_status_enum
          USING (
            CASE status::text
              WHEN 'awaiting_pickup' THEN 'processing'
              WHEN 'in_transit' THEN 'shipped'
              WHEN 'out_for_delivery' THEN 'shipped'
              WHEN 'delivery_failed' THEN 'returned'
              ELSE status::text
            END
          )::orders_status_enum;

          ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
          DROP TYPE orders_status_enum_new;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE orders DROP COLUMN IF EXISTS recipient_phone`,
    );
  }
}
