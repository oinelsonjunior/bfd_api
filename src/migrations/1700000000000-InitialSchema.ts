import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum" AS ENUM ('cliente', 'diarista', 'admin')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"                  uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nome"                character varying NOT NULL,
        "email"               character varying NOT NULL,
        "senha"               character varying NOT NULL,
        "telefone"            character varying NOT NULL,
        "foto"                character varying,
        "role"                "public"."users_role_enum" NOT NULL DEFAULT 'cliente',
        "descricao"           text,
        "avaliacaoMedia"      numeric(3,2) NOT NULL DEFAULT 0,
        "totalAvaliacoes"     integer NOT NULL DEFAULT 0,
        "servicosRealizados"  integer NOT NULL DEFAULT 0,
        "disponivel"          boolean NOT NULL DEFAULT false,
        "documentoVerificado" boolean NOT NULL DEFAULT false,
        "valorHora"           numeric(8,2),
        "pushToken"           character varying,
        "ativo"               boolean NOT NULL DEFAULT true,
        "fotoPerfil"          character varying,
        "createdAt"           TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"           TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."servicos_tipo_enum" AS ENUM ('limpeza_basica', 'limpeza_completa', 'limpeza_pesada', 'pos_obra')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."servicos_status_enum" AS ENUM ('pendente', 'aceito', 'a_caminho', 'em_andamento', 'concluido', 'cancelado')
    `);

    await queryRunner.query(`
      CREATE TABLE "servicos" (
        "id"                  uuid NOT NULL DEFAULT uuid_generate_v4(),
        "clienteId"           uuid NOT NULL,
        "diaristaId"          uuid,
        "tipo"                "public"."servicos_tipo_enum" NOT NULL,
        "status"              "public"."servicos_status_enum" NOT NULL DEFAULT 'pendente',
        "dataAgendada"        TIMESTAMP NOT NULL,
        "horasContratadas"    integer NOT NULL DEFAULT 4,
        "valorTotal"          numeric(8,2) NOT NULL,
        "observacoes"         text,
        "enderecoId"          uuid,
        "avaliacaoCliente"    integer,
        "avaliacaoDiarista"   integer,
        "comentarioCliente"   text,
        "comentarioDiarista"  text,
        "createdAt"           TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"           TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_servicos" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mensagens" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "servicoId"   uuid NOT NULL,
        "remetenteId" uuid NOT NULL,
        "conteudo"    text NOT NULL,
        "lida"        boolean NOT NULL DEFAULT false,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mensagens" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."pagamentos_metodo_enum" AS ENUM ('cartao_credito', 'cartao_debito', 'pix')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."pagamentos_status_enum" AS ENUM ('pendente', 'aprovado', 'recusado', 'estornado')
    `);

    await queryRunner.query(`
      CREATE TABLE "pagamentos" (
        "id"           uuid NOT NULL DEFAULT uuid_generate_v4(),
        "servicoId"    uuid NOT NULL,
        "userId"       uuid NOT NULL,
        "valor"        numeric(8,2) NOT NULL,
        "metodo"       "public"."pagamentos_metodo_enum" NOT NULL,
        "status"       "public"."pagamentos_status_enum" NOT NULL DEFAULT 'pendente',
        "gatewayId"    character varying,
        "pixQrCode"    text,
        "pixCopiaCola" text,
        "pixExpiracao" TIMESTAMP WITH TIME ZONE,
        "createdAt"    TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pagamentos" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "enderecos" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId"      uuid NOT NULL,
        "cep"         character varying NOT NULL,
        "logradouro"  character varying NOT NULL,
        "numero"      character varying NOT NULL,
        "complemento" character varying,
        "bairro"      character varying NOT NULL,
        "cidade"      character varying NOT NULL,
        "estado"      character varying NOT NULL,
        "principal"   boolean NOT NULL DEFAULT false,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_enderecos" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tipos_servico" (
        "id"           uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo"       character varying NOT NULL,
        "nome"         character varying NOT NULL,
        "descricao"    text,
        "precoBase"    numeric(8,2) NOT NULL,
        "horasMinimas" integer NOT NULL DEFAULT 2,
        "horasMaximas" integer NOT NULL DEFAULT 12,
        "ativo"        boolean NOT NULL DEFAULT true,
        "icone"        character varying,
        "createdAt"    TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tipos_servico_codigo" UNIQUE ("codigo"),
        CONSTRAINT "PK_tipos_servico" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."push_tokens_plataforma_enum" AS ENUM ('ios', 'android', 'web')
    `);

    await queryRunner.query(`
      CREATE TABLE "push_tokens" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId"     uuid NOT NULL,
        "token"      character varying NOT NULL,
        "plataforma" "public"."push_tokens_plataforma_enum" NOT NULL,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_push_tokens_user_plataforma" UNIQUE ("userId", "plataforma"),
        CONSTRAINT "PK_push_tokens" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`ALTER TABLE "servicos" ADD CONSTRAINT "FK_servicos_cliente" FOREIGN KEY ("clienteId") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "servicos" ADD CONSTRAINT "FK_servicos_diarista" FOREIGN KEY ("diaristaId") REFERENCES "users"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "mensagens" ADD CONSTRAINT "FK_mensagens_servico" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "mensagens" ADD CONSTRAINT "FK_mensagens_remetente" FOREIGN KEY ("remetenteId") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "pagamentos" ADD CONSTRAINT "FK_pagamentos_servico" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "pagamentos" ADD CONSTRAINT "FK_pagamentos_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "enderecos" ADD CONSTRAINT "FK_enderecos_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "push_tokens" ADD CONSTRAINT "FK_push_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "push_tokens" DROP CONSTRAINT "FK_push_tokens_user"`);
    await queryRunner.query(`ALTER TABLE "enderecos" DROP CONSTRAINT "FK_enderecos_user"`);
    await queryRunner.query(`ALTER TABLE "pagamentos" DROP CONSTRAINT "FK_pagamentos_user"`);
    await queryRunner.query(`ALTER TABLE "pagamentos" DROP CONSTRAINT "FK_pagamentos_servico"`);
    await queryRunner.query(`ALTER TABLE "mensagens" DROP CONSTRAINT "FK_mensagens_remetente"`);
    await queryRunner.query(`ALTER TABLE "mensagens" DROP CONSTRAINT "FK_mensagens_servico"`);
    await queryRunner.query(`ALTER TABLE "servicos" DROP CONSTRAINT "FK_servicos_diarista"`);
    await queryRunner.query(`ALTER TABLE "servicos" DROP CONSTRAINT "FK_servicos_cliente"`);
    await queryRunner.query(`DROP TABLE "push_tokens"`);
    await queryRunner.query(`DROP TABLE "tipos_servico"`);
    await queryRunner.query(`DROP TABLE "enderecos"`);
    await queryRunner.query(`DROP TABLE "pagamentos"`);
    await queryRunner.query(`DROP TABLE "mensagens"`);
    await queryRunner.query(`DROP TABLE "servicos"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."push_tokens_plataforma_enum"`);
    await queryRunner.query(`DROP TYPE "public"."pagamentos_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."pagamentos_metodo_enum"`);
    await queryRunner.query(`DROP TYPE "public"."servicos_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."servicos_tipo_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
