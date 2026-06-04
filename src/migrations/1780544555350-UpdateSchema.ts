import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateSchema1780544555350 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'is_blog_active',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
      new TableColumn({
        name: 'bio',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'cover_image',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'cover_image_public_id',
        type: 'varchar',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'is_blog_active');
    await queryRunner.dropColumn('users', 'bio');
    await queryRunner.dropColumn('users', 'cover_image');
    await queryRunner.dropColumn('users', 'cover_image_public_id');
  }
}
