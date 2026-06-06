import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLivestreamAttributionToCartAndOrderItem1780760138790 implements MigrationInterface {
    name = 'AddLivestreamAttributionToCartAndOrderItem1780760138790'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" ADD COLUMN "livestream_id" integer`);
        await queryRunner.query(`ALTER TABLE "cart_items" ADD COLUMN "livestream_id" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cart_items" DROP COLUMN "livestream_id"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "livestream_id"`);
    }
}
