import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePushTokens1748000000000 implements MigrationInterface {
  name = 'CreatePushTokens1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."push_tokens_plataforma_enum" AS ENUM ('ios', 'android', 'web')
    `);

    await queryRunner.query(`
      CREATE TABLE "push_tokens" (
        "id"          uuid                NOT NULL DEFAULT uuid_generate_v4(),
        "userId"      uuid                NOT NULL,
        "token"       character varying   NOT NULL,
        "plataforma"  "public"."push_tokens_plataforma_enum" NOT NULL,
        "createdAt"   TIMESTAMP           NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP           NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_push_tokens_user_plataforma" UNIQUE ("userId", "plataforma")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "push_tokens"
        ADD CONSTRAINT "FK_push_tokens_user"
        FOREIGN KEY ("userId")
        REFERENCES "users"("id")
        ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "push_tokens" DROP CONSTRAINT "FK_push_tokens_user"`);
    await queryRunner.query(`DROP TABLE "push_tokens"`);
    await queryRunner.query(`DROP TYPE "public"."push_tokens_plataforma_enum"`);
  }
}
