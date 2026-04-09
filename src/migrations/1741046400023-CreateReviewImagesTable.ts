import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateReviewImagesTable1741046400023 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create review_images table
    await queryRunner.createTable(
      new Table({
        name: 'review_images',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'image_url',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'public_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'review_id',
            type: 'int',
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

    // Create foreign key: review_id -> reviews
    await queryRunner.createForeignKey(
      'review_images',
      new TableForeignKey({
        columnNames: ['review_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'reviews',
        onDelete: 'CASCADE',
        name: 'fk_review_images_review_id',
      }),
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'review_images',
      new TableIndex({
        name: 'idx_review_images_review_id',
        columnNames: ['review_id'],
      }),
    );

    await queryRunner.createIndex(
      'review_images',
      new TableIndex({
        name: 'idx_review_images_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('review_images', 'fk_review_images_review_id');

    // Drop table
    await queryRunner.dropTable('review_images');
  }
}
