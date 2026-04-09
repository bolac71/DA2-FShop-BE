import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateAiChatbotTables1743200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE ai_chat_messages_role_enum AS ENUM('user', 'assistant')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'ai_chat_sessions',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '120',
            isNullable: true,
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
            isNullable: false,
          },
          {
            name: 'last_message_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'ai_chat_sessions',
      new TableForeignKey({
        name: 'FK_ai_chat_sessions_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.query('CREATE INDEX IDX_ai_chat_sessions_user_id ON ai_chat_sessions (user_id)');
    await queryRunner.query('CREATE INDEX IDX_ai_chat_sessions_is_active ON ai_chat_sessions (is_active)');
    await queryRunner.query('CREATE INDEX IDX_ai_chat_sessions_last_message_at ON ai_chat_sessions (last_message_at)');

    await queryRunner.createTable(
      new Table({
        name: 'ai_chat_messages',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'session_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'ai_chat_messages_role_enum',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'products',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'latency_ms',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'ai_chat_messages',
      new TableForeignKey({
        name: 'FK_ai_chat_messages_session_id',
        columnNames: ['session_id'],
        referencedTableName: 'ai_chat_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.query('CREATE INDEX IDX_ai_chat_messages_session_id ON ai_chat_messages (session_id)');
    await queryRunner.query('CREATE INDEX IDX_ai_chat_messages_created_at ON ai_chat_messages (created_at)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS IDX_ai_chat_messages_created_at');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_ai_chat_messages_session_id');
    await queryRunner.query('ALTER TABLE "ai_chat_messages" DROP CONSTRAINT IF EXISTS "FK_ai_chat_messages_session_id"');
    await queryRunner.query('DROP TABLE IF EXISTS "ai_chat_messages"');

    await queryRunner.query('DROP INDEX IF EXISTS IDX_ai_chat_sessions_last_message_at');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_ai_chat_sessions_is_active');
    await queryRunner.query('DROP INDEX IF EXISTS IDX_ai_chat_sessions_user_id');
    await queryRunner.query('ALTER TABLE "ai_chat_sessions" DROP CONSTRAINT IF EXISTS "FK_ai_chat_sessions_user_id"');
    await queryRunner.query('DROP TABLE IF EXISTS "ai_chat_sessions"');

    await queryRunner.query('DROP TYPE IF EXISTS ai_chat_messages_role_enum');
  }
}
