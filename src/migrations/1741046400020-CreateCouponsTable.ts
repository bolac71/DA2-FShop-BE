import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCouponsTable1741046400020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create coupon_type enum type
    await queryRunner.query(`
      CREATE TYPE coupons_type_enum AS ENUM(
        'fixed',
        'percent',
        'shipping'
      )
    `);

    // Create coupon_status enum type
    await queryRunner.query(`
      CREATE TYPE coupons_status_enum AS ENUM(
        'active',
        'expired',
        'inactive'
      )
    `);

    // Create coupons table
    await queryRunner.createTable(
      new Table({
        name: 'coupons',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'coupons_type_enum',
            default: "'fixed'",
            isNullable: false,
          },
          {
            name: 'value',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'min_order_amount',
            type: 'numeric',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'max_discount_amount',
            type: 'numeric',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'max_uses',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'per_user_limit',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'used_count',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'applicable_product',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'start_date',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'end_date',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'coupons_status_enum',
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'coupons',
      new TableIndex({
        name: 'IDX_coupons_code',
        columnNames: ['code'],
      }),
    );

    await queryRunner.createIndex(
      'coupons',
      new TableIndex({
        name: 'IDX_coupons_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'coupons',
      new TableIndex({
        name: 'IDX_coupons_start_end_date',
        columnNames: ['start_date', 'end_date'],
      }),
    );

    await queryRunner.createIndex(
      'coupons',
      new TableIndex({
        name: 'IDX_coupons_is_active',
        columnNames: ['is_active'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('coupons', 'IDX_coupons_is_active');
    await queryRunner.dropIndex('coupons', 'IDX_coupons_start_end_date');
    await queryRunner.dropIndex('coupons', 'IDX_coupons_status');
    await queryRunner.dropIndex('coupons', 'IDX_coupons_code');

    // Drop table
    await queryRunner.dropTable('coupons');

    // Drop enum types
    await queryRunner.query(`DROP TYPE coupons_status_enum`);
    await queryRunner.query(`DROP TYPE coupons_type_enum`);
  }
}
