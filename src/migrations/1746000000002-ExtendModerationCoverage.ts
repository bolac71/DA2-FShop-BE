import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendModerationCoverage1746000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "moderation_logs_content_type_enum" ADD VALUE IF NOT EXISTS 'post'`,
    );
    await queryRunner.query(
      `ALTER TYPE "content_moderation_status_enum" ADD VALUE IF NOT EXISTS 'rejected'`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts"
       ADD COLUMN IF NOT EXISTS "moderation_status" "content_moderation_status_enum"
       NOT NULL DEFAULT 'pending'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "posts" DROP COLUMN IF EXISTS "moderation_status"`,
    );
  }
}
