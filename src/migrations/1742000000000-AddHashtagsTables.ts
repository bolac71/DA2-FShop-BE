import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddHashtagsTables1742000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'hashtags',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'post_count',
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
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'hashtags',
      new TableIndex({
        name: 'idx_hashtags_name',
        columnNames: ['name'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'post_hashtags',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'post_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'hashtag_id',
            type: 'int',
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
            name: 'uq_post_hashtags_post_hashtag',
            columnNames: ['post_id', 'hashtag_id'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'post_hashtags',
      new TableForeignKey({
        name: 'fk_post_hashtags_post_id',
        columnNames: ['post_id'],
        referencedTableName: 'posts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'post_hashtags',
      new TableForeignKey({
        name: 'fk_post_hashtags_hashtag_id',
        columnNames: ['hashtag_id'],
        referencedTableName: 'hashtags',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'post_hashtags',
      new TableIndex({
        name: 'idx_post_hashtags_post_id',
        columnNames: ['post_id'],
      }),
    );

    await queryRunner.createIndex(
      'post_hashtags',
      new TableIndex({
        name: 'idx_post_hashtags_hashtag_id',
        columnNames: ['hashtag_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('post_hashtags', 'idx_post_hashtags_hashtag_id');
    await queryRunner.dropIndex('post_hashtags', 'idx_post_hashtags_post_id');
    await queryRunner.dropForeignKey('post_hashtags', 'fk_post_hashtags_hashtag_id');
    await queryRunner.dropForeignKey('post_hashtags', 'fk_post_hashtags_post_id');
    await queryRunner.dropTable('post_hashtags');
    await queryRunner.dropIndex('hashtags', 'idx_hashtags_name');
    await queryRunner.dropTable('hashtags');
  }
}
