import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetadataToAiChatMessages1780850000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_chat_messages"
      ADD COLUMN IF NOT EXISTS "metadata" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_chat_messages"
      DROP COLUMN IF EXISTS "metadata"
    `);
  }
}
