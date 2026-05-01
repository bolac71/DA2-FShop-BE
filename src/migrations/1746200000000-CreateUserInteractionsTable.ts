import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateUserInteractionsTable1746200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "user_interactions_interaction_type_enum" AS ENUM('view', 'wishlist', 'add_to_cart', 'purchase')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'user_interactions',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'interaction_type',
            type: 'user_interactions_interaction_type_enum',
            default: "'view'",
            isNullable: false,
          },
          {
            name: 'score',
            type: 'float',
            default: 1.0,
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

    await queryRunner.createForeignKey(
      'user_interactions',
      new TableForeignKey({
        name: 'FK_user_interactions_user_id_users_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createForeignKey(
      'user_interactions',
      new TableForeignKey({
        name: 'FK_user_interactions_product_id_products_id',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'NO ACTION',
      }),
    );

    await queryRunner.createIndex(
      'user_interactions',
      new TableIndex({
        name: 'IDX_user_interactions_user_created_at',
        columnNames: ['user_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'user_interactions',
      new TableIndex({
        name: 'IDX_user_interactions_product_id',
        columnNames: ['product_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('user_interactions', 'IDX_user_interactions_product_id');
    await queryRunner.dropIndex('user_interactions', 'IDX_user_interactions_user_created_at');
    await queryRunner.dropForeignKey('user_interactions', 'FK_user_interactions_product_id_products_id');
    await queryRunner.dropForeignKey('user_interactions', 'FK_user_interactions_user_id_users_id');
    await queryRunner.dropTable('user_interactions');
    await queryRunner.query(`DROP TYPE IF EXISTS "user_interactions_interaction_type_enum"`);
  }
}