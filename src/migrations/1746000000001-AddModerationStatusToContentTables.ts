import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModerationStatusToContentTables1746000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "content_moderation_status_enum" AS ENUM('pending', 'approved', 'flagged')`,
    );

    await queryRunner.query(
      `ALTER TABLE "reviews"
       ADD COLUMN "moderation_status" "content_moderation_status_enum"
       NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_comments"
       ADD COLUMN "moderation_status" "content_moderation_status_enum"
       NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "livestream_comments"
       ADD COLUMN "moderation_status" "content_moderation_status_enum"
       NOT NULL DEFAULT 'pending'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "livestream_comments" DROP COLUMN "moderation_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_comments" DROP COLUMN "moderation_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP COLUMN "moderation_status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "content_moderation_status_enum"`,
    );
  }
}
