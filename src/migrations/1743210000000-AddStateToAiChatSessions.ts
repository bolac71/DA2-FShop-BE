import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStateToAiChatSessions1743210000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'ai_chat_sessions',
      new TableColumn({
        name: 'state',
        type: 'jsonb',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('ai_chat_sessions', 'state');
  }
}