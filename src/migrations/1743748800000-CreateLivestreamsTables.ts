import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateLivestreamsTables1743748800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "livestreams_status_enum" AS ENUM('scheduled', 'live', 'ended')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'livestreams',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'host_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'cover_image_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'cover_image_public_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'agora_channel',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'livestreams_status_enum',
            default: `'scheduled'`,
            isNullable: false,
          },
          {
            name: 'scheduled_start_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'ended_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'viewer_count',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'total_viewers',
            type: 'int',
            default: 0,
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
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'livestreams',
      new TableForeignKey({
        columnNames: ['host_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'livestreams',
      new TableIndex({
        name: 'idx_livestreams_host_id',
        columnNames: ['host_id'],
      }),
    );

    await queryRunner.createIndex(
      'livestreams',
      new TableIndex({
        name: 'idx_livestreams_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'livestream_products',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'livestream_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'position',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'units_sold',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        uniques: [
          {
            name: 'uq_livestream_products_livestream_product',
            columnNames: ['livestream_id', 'product_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('livestream_products', [
      new TableForeignKey({
        columnNames: ['livestream_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'livestreams',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['product_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      'livestream_products',
      new TableIndex({
        name: 'idx_livestream_products_livestream_id',
        columnNames: ['livestream_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'livestream_comments',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'livestream_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'like_count',
            type: 'int',
            default: 0,
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
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('livestream_comments', [
      new TableForeignKey({
        columnNames: ['livestream_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'livestreams',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      'livestream_comments',
      new TableIndex({
        name: 'idx_livestream_comments_livestream_id',
        columnNames: ['livestream_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'livestream_orders',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'livestream_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'order_id',
            type: 'int',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKeys('livestream_orders', [
      new TableForeignKey({
        columnNames: ['livestream_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'livestreams',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'orders',
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      'livestream_orders',
      new TableIndex({
        name: 'idx_livestream_orders_livestream_id',
        columnNames: ['livestream_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('livestream_orders', true);
    await queryRunner.dropTable('livestream_comments', true);
    await queryRunner.dropTable('livestream_products', true);
    await queryRunner.dropTable('livestreams', true);
    await queryRunner.query(`DROP TYPE "livestreams_status_enum"`);
  }
}