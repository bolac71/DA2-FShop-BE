import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePostsTables1741046400026 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'posts',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'total_likes',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'total_comments',
            type: 'int',
            default: 0,
            isNullable: false,
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
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'posts',
      new TableForeignKey({
        name: 'fk_posts_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'posts',
      new TableIndex({
        name: 'idx_posts_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'posts',
      new TableIndex({
        name: 'idx_posts_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'posts',
      new TableIndex({
        name: 'idx_posts_is_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'post_images',
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

    await queryRunner.createForeignKey(
      'post_images',
      new TableForeignKey({
        name: 'fk_post_images_post_id',
        columnNames: ['post_id'],
        referencedTableName: 'posts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'post_images',
      new TableIndex({
        name: 'idx_post_images_post_id',
        columnNames: ['post_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'post_likes',
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
            name: 'user_id',
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
        uniques: [
          {
            name: 'uq_post_likes_post_id_user_id',
            columnNames: ['post_id', 'user_id'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'post_likes',
      new TableForeignKey({
        name: 'fk_post_likes_post_id',
        columnNames: ['post_id'],
        referencedTableName: 'posts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'post_likes',
      new TableForeignKey({
        name: 'fk_post_likes_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'post_likes',
      new TableIndex({
        name: 'idx_post_likes_post_id',
        columnNames: ['post_id'],
      }),
    );

    await queryRunner.createIndex(
      'post_likes',
      new TableIndex({
        name: 'idx_post_likes_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'post_likes',
      new TableIndex({
        name: 'idx_post_likes_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'post_comments',
        columns: [
          {
            name: 'id',
            type: 'SERIAL',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'post_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'parent_comment_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'reply_count',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'depth',
            type: 'int',
            default: 0,
            isNullable: false,
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
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'post_comments',
      new TableForeignKey({
        name: 'fk_post_comments_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'post_comments',
      new TableForeignKey({
        name: 'fk_post_comments_post_id',
        columnNames: ['post_id'],
        referencedTableName: 'posts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'post_comments',
      new TableForeignKey({
        name: 'fk_post_comments_parent_comment_id',
        columnNames: ['parent_comment_id'],
        referencedTableName: 'post_comments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'post_comments',
      new TableIndex({
        name: 'idx_post_comments_post_id',
        columnNames: ['post_id'],
      }),
    );

    await queryRunner.createIndex(
      'post_comments',
      new TableIndex({
        name: 'idx_post_comments_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'post_comments',
      new TableIndex({
        name: 'idx_post_comments_parent_comment_id',
        columnNames: ['parent_comment_id'],
      }),
    );

    await queryRunner.createIndex(
      'post_comments',
      new TableIndex({
        name: 'idx_post_comments_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'post_comments',
      new TableIndex({
        name: 'idx_post_comments_is_active',
        columnNames: ['is_active'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('post_comments', 'fk_post_comments_parent_comment_id');
    await queryRunner.dropForeignKey('post_comments', 'fk_post_comments_post_id');
    await queryRunner.dropForeignKey('post_comments', 'fk_post_comments_user_id');
    await queryRunner.dropTable('post_comments');

    await queryRunner.dropForeignKey('post_likes', 'fk_post_likes_user_id');
    await queryRunner.dropForeignKey('post_likes', 'fk_post_likes_post_id');
    await queryRunner.dropTable('post_likes');

    await queryRunner.dropForeignKey('post_images', 'fk_post_images_post_id');
    await queryRunner.dropTable('post_images');

    await queryRunner.dropForeignKey('posts', 'fk_posts_user_id');
    await queryRunner.dropTable('posts');
  }
}