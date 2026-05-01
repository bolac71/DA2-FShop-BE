import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateModerationLogsTable1746000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "moderation_logs_content_type_enum" AS ENUM('review', 'post_comment', 'livestream_comment')`,
    );
    await queryRunner.query(
      `CREATE TYPE "moderation_logs_decision_enum" AS ENUM('approved', 'flagged')`,
    );
    await queryRunner.query(
      `CREATE TYPE "moderation_logs_priority_enum" AS ENUM('NORMAL', 'HIGH')`,
    );
    await queryRunner.query(
      `CREATE TYPE "moderation_logs_override_decision_enum" AS ENUM('approved', 'rejected')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'moderation_logs',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'content_type',
            type: 'moderation_logs_content_type_enum',
            isNullable: false,
          },
          {
            name: 'content_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'content_text',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'rule_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'ml_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'ml_labels',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'final_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'decision',
            type: 'moderation_logs_decision_enum',
            isNullable: false,
          },
          {
            name: 'priority',
            type: 'moderation_logs_priority_enum',
            isNullable: false,
            default: `'NORMAL'`,
          },
          {
            name: 'confidence',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'signals',
            type: 'jsonb',
            isNullable: false,
            default: `'{}'`,
          },
          {
            name: 'reviewed_by',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'is_overridden',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'override_decision',
            type: 'moderation_logs_override_decision_enum',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'moderation_logs',
      new TableIndex({
        name: 'idx_moderation_logs_content',
        columnNames: ['content_type', 'content_id'],
      }),
    );
    await queryRunner.createIndex(
      'moderation_logs',
      new TableIndex({
        name: 'idx_moderation_logs_decision',
        columnNames: ['decision'],
      }),
    );
    await queryRunner.createIndex(
      'moderation_logs',
      new TableIndex({
        name: 'idx_moderation_logs_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('moderation_logs', 'idx_moderation_logs_created_at');
    await queryRunner.dropIndex('moderation_logs', 'idx_moderation_logs_decision');
    await queryRunner.dropIndex('moderation_logs', 'idx_moderation_logs_content');
    await queryRunner.dropTable('moderation_logs');
    await queryRunner.query(`DROP TYPE IF EXISTS "moderation_logs_override_decision_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "moderation_logs_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "moderation_logs_decision_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "moderation_logs_content_type_enum"`);
  }
}
