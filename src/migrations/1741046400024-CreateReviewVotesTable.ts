import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

export class CreateReviewVotesTable1741046400024 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create review_votes table
    await queryRunner.createTable(
      new Table({
        name: 'review_votes',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'review_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'is_helpful',
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
    );

    // Create unique constraint: one vote per (review, user) pair
    await queryRunner.createUniqueConstraint(
      'review_votes',
      new TableUnique({
        columnNames: ['review_id', 'user_id'],
        name: 'uq_review_votes_review_id_user_id',
      }),
    );

    // Create foreign key: review_id -> reviews
    await queryRunner.createForeignKey(
      'review_votes',
      new TableForeignKey({
        columnNames: ['review_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'reviews',
        onDelete: 'CASCADE',
        name: 'fk_review_votes_review_id',
      }),
    );

    // Create foreign key: user_id -> users
    await queryRunner.createForeignKey(
      'review_votes',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        name: 'fk_review_votes_user_id',
      }),
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'review_votes',
      new TableIndex({
        name: 'idx_review_votes_review_id',
        columnNames: ['review_id'],
      }),
    );

    await queryRunner.createIndex(
      'review_votes',
      new TableIndex({
        name: 'idx_review_votes_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'review_votes',
      new TableIndex({
        name: 'idx_review_votes_is_helpful',
        columnNames: ['is_helpful'],
      }),
    );

    await queryRunner.createIndex(
      'review_votes',
      new TableIndex({
        name: 'idx_review_votes_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('review_votes', 'fk_review_votes_user_id');
    await queryRunner.dropForeignKey('review_votes', 'fk_review_votes_review_id');

    // Drop unique constraint
    await queryRunner.dropUniqueConstraint('review_votes', 'uq_review_votes_review_id_user_id');

    // Drop table
    await queryRunner.dropTable('review_votes');
  }
}
