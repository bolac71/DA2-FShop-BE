import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCouponRedemptionsTable1741046400021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create redemption_status enum type
    await queryRunner.query(`
      CREATE TYPE coupon_redemptions_status_enum AS ENUM(
        'applied',
        'redeemed'
      )
    `);

    // Create coupon_redemptions table
    await queryRunner.createTable(
      new Table({
        name: 'coupon_redemptions',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'coupon_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'order_id',
            type: 'integer',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'discount_amount',
            type: 'numeric',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'coupon_redemptions_status_enum',
            default: "'applied'",
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

    // Create foreign key for coupon_id
    await queryRunner.createForeignKey(
      'coupon_redemptions',
      new TableForeignKey({
        columnNames: ['coupon_id'],
        referencedTableName: 'coupons',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create foreign key for user_id
    await queryRunner.createForeignKey(
      'coupon_redemptions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create foreign key for order_id
    await queryRunner.createForeignKey(
      'coupon_redemptions',
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'coupon_redemptions',
      new TableIndex({
        name: 'IDX_coupon_redemptions_coupon_id',
        columnNames: ['coupon_id'],
      }),
    );

    await queryRunner.createIndex(
      'coupon_redemptions',
      new TableIndex({
        name: 'IDX_coupon_redemptions_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'coupon_redemptions',
      new TableIndex({
        name: 'IDX_coupon_redemptions_order_id',
        columnNames: ['order_id'],
      }),
    );

    await queryRunner.createIndex(
      'coupon_redemptions',
      new TableIndex({
        name: 'IDX_coupon_redemptions_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'coupon_redemptions',
      new TableIndex({
        name: 'IDX_coupon_redemptions_user_created_at',
        columnNames: ['user_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('coupon_redemptions', 'IDX_coupon_redemptions_user_created_at');
    await queryRunner.dropIndex('coupon_redemptions', 'IDX_coupon_redemptions_status');
    await queryRunner.dropIndex('coupon_redemptions', 'IDX_coupon_redemptions_order_id');
    await queryRunner.dropIndex('coupon_redemptions', 'IDX_coupon_redemptions_user_id');
    await queryRunner.dropIndex('coupon_redemptions', 'IDX_coupon_redemptions_coupon_id');

    // Drop foreign keys
    await queryRunner.dropForeignKey('coupon_redemptions', 'FK_coupon_redemptions_order_id_orders_id');
    await queryRunner.dropForeignKey('coupon_redemptions', 'FK_coupon_redemptions_user_id_users_id');
    await queryRunner.dropForeignKey('coupon_redemptions', 'FK_coupon_redemptions_coupon_id_coupons_id');

    // Drop table
    await queryRunner.dropTable('coupon_redemptions');

    // Drop enum type
    await queryRunner.query(`DROP TYPE coupon_redemptions_status_enum`);
  }
}
